import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, openSync, readSync, realpathSync } from "node:fs";
import { mkdtemp, open, realpath, rm, rmdir, unlink, type FileHandle } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, sep } from "node:path";

export type VerifiedFile = {
  readonly path: string;
  readonly root: string;
  readonly byteSize: number;
  readonly sha256: string;
};

export type VerifiedFileHandle = {
  readonly handle: FileHandle;
  readonly byteSize: number;
};

const within = (root: string, path: string) => {
  const relation = relative(root, path);
  return (
    relation.length > 0 &&
    relation !== ".." &&
    !relation.startsWith(`..${sep}`) &&
    !isAbsolute(relation)
  );
};

export const readVerifiedFile = (input: VerifiedFile): Buffer | null => {
  let descriptor: number | undefined;
  try {
    const root = realpathSync(input.root);
    const parent = realpathSync(dirname(input.path));
    if (!within(root, parent) && parent !== root) return null;
    if (!Number.isSafeInteger(input.byteSize) || input.byteSize < 0) return null;
    descriptor = openSync(
      input.path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    const info = fstatSync(descriptor);
    if (!info.isFile() || info.size !== input.byteSize) return null;
    const bytes = Buffer.alloc(input.byteSize);
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(descriptor, bytes, offset, bytes.length - offset, null);
      if (count === 0) break;
      offset += count;
    }
    if (offset !== input.byteSize) return null;
    if (createHash("sha256").update(bytes).digest("hex") !== input.sha256) return null;
    return bytes;
  } catch {
    return null;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
};

export const openVerifiedFile = async (input: VerifiedFile): Promise<VerifiedFileHandle | null> => {
  let source: FileHandle | undefined;
  let spool: FileHandle | undefined;
  let spoolDirectory: string | undefined;
  let spoolPath: string | undefined;
  try {
    if (!Number.isSafeInteger(input.byteSize) || input.byteSize < 0) return null;
    const root = await realpath(input.root);
    const parent = await realpath(dirname(input.path));
    if (!within(root, parent) && parent !== root) return null;
    source = await open(
      input.path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    const info = await source.stat();
    if (!info.isFile() || info.size !== input.byteSize) return null;

    spoolDirectory = await mkdtemp(join(tmpdir(), "agentis-artifact-spool-"));
    spoolPath = join(spoolDirectory, "verified");
    spool = await open(
      spoolPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_RDWR | constants.O_NOFOLLOW,
      0o600,
    );
    const digest = createHash("sha256");
    const chunk = Buffer.allocUnsafe(64 * 1024);
    let position = 0;
    while (position < input.byteSize) {
      const requested = Math.min(chunk.byteLength, input.byteSize - position);
      const { bytesRead } = await source.read(chunk, 0, requested, position);
      if (bytesRead === 0) return null;
      digest.update(chunk.subarray(0, bytesRead));
      let written = 0;
      while (written < bytesRead) {
        const result = await spool.write(chunk, written, bytesRead - written, position + written);
        if (result.bytesWritten === 0) return null;
        written += result.bytesWritten;
      }
      position += bytesRead;
    }
    const eof = Buffer.allocUnsafe(1);
    if ((await source.read(eof, 0, 1, input.byteSize)).bytesRead !== 0) return null;
    if (digest.digest("hex") !== input.sha256) return null;

    await source.close();
    source = undefined;
    await unlink(spoolPath);
    spoolPath = undefined;
    await rmdir(spoolDirectory);
    spoolDirectory = undefined;
    const verified = { handle: spool, byteSize: info.size };
    spool = undefined;
    return verified;
  } catch {
    return null;
  } finally {
    await source?.close().catch(() => undefined);
    await spool?.close().catch(() => undefined);
    if (spoolPath) await unlink(spoolPath).catch(() => undefined);
    if (spoolDirectory)
      await rm(spoolDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
};
