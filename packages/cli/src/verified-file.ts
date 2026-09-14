import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  openSync,
  readSync,
  realpathSync,
} from "node:fs";
import { dirname, isAbsolute, relative, sep } from "node:path";

export type VerifiedFile = {
  readonly path: string;
  readonly root: string;
  readonly byteSize: number;
  readonly sha256: string;
  readonly maximumBytes: number;
};

const within = (root: string, path: string) => {
  const relation = relative(root, path);
  return relation.length > 0 && relation !== ".." && !relation.startsWith(`..${sep}`) && !isAbsolute(relation);
};

export const readVerifiedFile = (input: VerifiedFile): Buffer | null => {
  let descriptor: number | undefined;
  try {
    const root = realpathSync(input.root);
    const parent = realpathSync(dirname(input.path));
    if (!within(root, parent) && parent !== root) return null;
    if (input.byteSize < 0 || input.byteSize > input.maximumBytes) return null;
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
