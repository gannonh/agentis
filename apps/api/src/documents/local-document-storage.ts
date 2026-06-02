import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, normalize } from "node:path"
import { randomUUID } from "node:crypto"
import type { AppConfig } from "../config.js"

export class LocalDocumentStorage {
  constructor(private readonly config: AppConfig) {}

  createStorageKey(filename: string) {
    const safeName = filename
      .split(/[\\/]/)
      .pop()
      ?.replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
    return join("documents", randomUUID(), safeName || "document.md")
  }

  createVersionStorageKey(documentId: string, version: number) {
    return join("documents", documentId, `versions/${version}.md`)
  }

  write(storageKey: string, data: Buffer) {
    const absolutePath = this.resolveStorageKey(storageKey)
    mkdirSync(dirname(absolutePath), { recursive: true })
    writeFileSync(absolutePath, data)
  }

  read(storageKey: string) {
    return readFileSync(this.resolveStorageKey(storageKey))
  }

  delete(storageKey: string) {
    rmSync(this.resolveStorageKey(storageKey), { force: true })
  }

  private resolveStorageKey(storageKey: string) {
    if (/^[a-zA-Z]:[\\/]/.test(storageKey) || storageKey.startsWith("\\\\")) {
      throw new Error("Invalid document storage key")
    }
    const normalized = normalize(storageKey)
    if (normalized.startsWith("..") || normalized.startsWith("/")) {
      throw new Error("Invalid document storage key")
    }
    return join(this.config.storageRoot, normalized)
  }
}
