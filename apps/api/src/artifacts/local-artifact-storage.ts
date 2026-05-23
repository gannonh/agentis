import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { randomUUID } from "node:crypto"
import type { AppConfig } from "../config.js"

export class LocalArtifactStorage {
  constructor(private readonly config: AppConfig) {}

  private resolvePath(storageKey: string) {
    const root = resolve(this.config.storageRoot)
    const fullPath = resolve(root, storageKey)
    const rel = relative(root, fullPath)
    if (rel.startsWith("..") || rel.includes(`..${process.platform === "win32" ? "\\" : "/"}`)) {
      throw new Error("Invalid storage key")
    }
    return fullPath
  }

  ensureRoot() {
    mkdirSync(resolve(this.config.storageRoot), { recursive: true })
  }

  write(storageKey: string, data: Buffer) {
    this.ensureRoot()
    const path = this.resolvePath(storageKey)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, data)
  }

  read(storageKey: string): Buffer {
    return readFileSync(this.resolvePath(storageKey))
  }

  exists(storageKey: string): boolean {
    try {
      readFileSync(this.resolvePath(storageKey))
      return true
    } catch {
      return false
    }
  }

  delete(storageKey: string) {
    try {
      unlinkSync(this.resolvePath(storageKey))
    } catch {
      // ignore missing files during cleanup
    }
  }

  createStorageKey(filename: string) {
    const safeName = filename.replace(/[/\\]/g, "_").replace(/\.\./g, "_")
    return join("artifacts", randomUUID(), safeName || "artifact.bin")
  }
}
