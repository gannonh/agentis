import {
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeScratchFile } from "../src/scratch-file.js";

describe("writeScratchFile", () => {
  it("replaces a provider-planted symlink instead of writing through it", () => {
    const root = mkdtempSync(join(tmpdir(), "agentis-scratch-"));
    const target = join(root, "host-secret");
    writeFileSync(target, "untouched");
    const path = join(root, "hello.md");
    symlinkSync(target, path);
    writeScratchFile(path, "draft");
    expect(readFileSync(target, "utf8")).toBe("untouched");
    expect(lstatSync(path).isSymbolicLink()).toBe(false);
    expect(lstatSync(path).isFile()).toBe(true);
    expect(readFileSync(path, "utf8")).toBe("draft");
  });

  it("overwrites an existing regular file and refuses a directory", () => {
    const root = mkdtempSync(join(tmpdir(), "agentis-scratch-"));
    const path = join(root, "hello.md");
    writeFileSync(path, "stale");
    writeScratchFile(path, "fresh");
    expect(readFileSync(path, "utf8")).toBe("fresh");
    const dir = join(root, "dir.md");
    mkdirSync(dir);
    expect(() => writeScratchFile(dir, "x")).toThrow();
  });
});
