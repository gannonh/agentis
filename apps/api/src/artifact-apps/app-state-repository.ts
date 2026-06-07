import { eq } from "drizzle-orm"
import type { AppDatabase } from "../db/client.js"
import { appState } from "../db/schema.js"
import { nowIso } from "../lib/ids.js"

export type StoredAppState = {
  artifactId: string
  state: Record<string, unknown>
  updatedAt: string
}

export class AppStateRepository {
  constructor(private readonly db: AppDatabase) {}

  get(artifactId: string): StoredAppState | null {
    const row = this.db
      .select()
      .from(appState)
      .where(eq(appState.artifactId, artifactId))
      .get()
    if (!row) return null
    try {
      const parsed = JSON.parse(row.stateJson) as Record<string, unknown>
      return {
        artifactId: row.artifactId,
        state: parsed,
        updatedAt: row.updatedAt,
      }
    } catch {
      return null
    }
  }

  upsert(artifactId: string, state: Record<string, unknown>): StoredAppState {
    const updatedAt = nowIso()
    const stateJson = JSON.stringify(state)
    const existing = this.get(artifactId)
    if (existing) {
      this.db
        .update(appState)
        .set({ stateJson, updatedAt })
        .where(eq(appState.artifactId, artifactId))
        .run()
    } else {
      this.db
        .insert(appState)
        .values({ artifactId, stateJson, updatedAt })
        .run()
    }
    return { artifactId, state, updatedAt }
  }
}
