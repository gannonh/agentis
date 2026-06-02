import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import type { AppConfig } from "../config.js"
import { LocalDocumentStorage } from "./local-document-storage.js"

describe("LocalDocumentStorage", () => {
  let storageRoot = ""

  afterEach(() => {
    if (storageRoot) {
      rmSync(storageRoot, { recursive: true, force: true })
      storageRoot = ""
    }
  })

  it("rejects storage keys that escape the configured root", () => {
    storageRoot = mkdtempSync(join(tmpdir(), "agentis-doc-storage-"))
    const storage = new LocalDocumentStorage({
      storageRoot,
    } as AppConfig)

    expect(() => storage.read("../outside.txt")).toThrow(/Invalid document storage key/)
    expect(() => storage.read("C:\\Windows\\System32\\config.sys")).toThrow(
      /Invalid document storage key/
    )
    expect(() => storage.read("\\\\server\\share\\secret.txt")).toThrow(
      /Invalid document storage key/
    )
  })
})
