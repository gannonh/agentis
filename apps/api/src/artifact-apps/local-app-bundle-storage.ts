import type { AppBundleInput } from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { LocalDocumentStorage } from "../documents/local-document-storage.js"
import {
  parseStoredAppBundle,
  serializeAppBundle,
} from "./app-bundle-validator.js"

export class LocalAppBundleStorage {
  private readonly storage: LocalDocumentStorage

  constructor(config: AppConfig) {
    this.storage = new LocalDocumentStorage(config)
  }

  storageKey(artifactId: string, version: number) {
    return `artifacts/${artifactId}/app-versions/${version}.json`
  }

  write(artifactId: string, version: number, bundle: AppBundleInput) {
    const key = this.storageKey(artifactId, version)
    this.storage.write(key, Buffer.from(serializeAppBundle(bundle), "utf8"))
    return key
  }

  read(key: string): AppBundleInput | null {
    try {
      return parseStoredAppBundle(this.storage.read(key).toString("utf8"))
    } catch {
      return null
    }
  }

  delete(key: string) {
    this.storage.delete(key)
  }
}
