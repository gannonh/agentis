import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openVerifiedFile, readVerifiedFile } from "../src/verified-file.js";
import { removeTempRoot, tempRoot } from "./helpers/temp-root.js";

const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

describe("verified artifact streaming", () => {
  it("rejects a FIFO promptly without waiting for a writer", async () => {
    const root = tempRoot("agentis-verified-fifo-");
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
      removeTempRoot(root);
    }
  });

  it("streams verified spool bytes even if the source changes afterward", async () => {
    const root = tempRoot("agentis-verified-race-");
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
      removeTempRoot(root);
    }
  });
});

describe("verified artifact reads", () => {
  it("reads the original bytes when size and digest still match", () => {
    const root = tempRoot("agentis-verified-read-");
    const path = join(root, "artifact.txt");
    const original = Buffer.from("materialized source");
    writeFileSync(path, original);
    try {
      const bytes = readVerifiedFile({
        path,
        root,
        byteSize: original.byteLength,
        sha256: digest(original),
      });
      expect(bytes).toEqual(original);
    } finally {
      removeTempRoot(root);
    }
  });

  it("returns null after the file content changes at the recorded size", () => {
    const root = tempRoot("agentis-verified-changed-");
    const path = join(root, "artifact.txt");
    const original = Buffer.from("materialized source");
    writeFileSync(path, original);
    try {
      writeFileSync(path, Buffer.alloc(original.byteLength, 0x78));
      const bytes = readVerifiedFile({
        path,
        root,
        byteSize: original.byteLength,
        sha256: digest(original),
      });
      expect(bytes).toBeNull();
    } finally {
      removeTempRoot(root);
    }
  });

  it("returns null when the file grew past the recorded byte size", () => {
    const root = tempRoot("agentis-verified-oversized-");
    const path = join(root, "artifact.txt");
    const original = Buffer.from("materialized source");
    writeFileSync(path, original);
    try {
      writeFileSync(path, Buffer.concat([original, Buffer.alloc(1024, 0x2e)]));
      const bytes = readVerifiedFile({
        path,
        root,
        byteSize: original.byteLength,
        sha256: digest(original),
      });
      expect(bytes).toBeNull();
    } finally {
      removeTempRoot(root);
    }
  });
});
