import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openVerifiedFile } from "../src/verified-file.js";

const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

describe("verified artifact streaming", () => {
  it("rejects a FIFO promptly without waiting for a writer", async () => {
    const root = mkdtempSync(join(tmpdir(), "agentis-verified-fifo-"));
    const fifo = join(root, "artifact.fifo");
    execFileSync("mkfifo", [fifo]);
    const verification = openVerifiedFile({
      path: fifo,
      root,
      byteSize: 0,
      sha256: digest(Buffer.alloc(0)),
    });
    let release: ReturnType<typeof setTimeout> | undefined;
    const delayedWriter = new Promise<"blocked">((resolve) => {
      release = setTimeout(() => {
        void writeFile(fifo, "release")
          .catch(() => undefined)
          .finally(() => resolve("blocked"));
      }, 250);
    });
    try {
      const outcome = await Promise.race([
        verification.then(() => "prompt" as const),
        delayedWriter,
      ]);
      if (release) clearTimeout(release);
      expect(outcome).toBe("prompt");
      expect(await verification).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("streams verified spool bytes even if the source changes afterward", async () => {
    const root = mkdtempSync(join(tmpdir(), "agentis-verified-race-"));
    const path = join(root, "artifact.md");
    const original = Buffer.from("verified result");
    writeFileSync(path, original);
    try {
      const verified = await openVerifiedFile({
        path,
        root,
        byteSize: original.byteLength,
        sha256: digest(original),
      });
      if (!verified) throw new Error("artifact verification failed");
      writeFileSync(path, Buffer.alloc(original.byteLength, 0x78));
      const chunks: Buffer[] = [];
      for await (const chunk of verified.handle.createReadStream({ autoClose: true, start: 0 })) {
        chunks.push(Buffer.from(chunk));
      }
      expect(Buffer.concat(chunks)).toEqual(original);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
