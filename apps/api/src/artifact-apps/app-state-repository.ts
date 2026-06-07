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
      const parsed: unknown = JSON.parse(row.stateJson)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return null
      }
      return {
        artifactId: row.artifactId,
        state: parsed as Record<string, unknown>,
        updatedAt: row.updatedAt,
      }
    } catch {
      return null
    }
  }

  upsert(artifactId: string, state: Record<string, unknown>): StoredAppState {
    const updatedAt = nowIso()
    const stateJson = JSON.stringify(state)
    this.db
      .insert(appState)
      .values({ artifactId, stateJson, updatedAt })
      .onConflictDoUpdate({
        target: appState.artifactId,
        set: { stateJson, updatedAt },
      })
      .run()
    return { artifactId, state, updatedAt }
  }

  delete(artifactId: string): void {
    this.db.delete(appState).where(eq(appState.artifactId, artifactId)).run()
  }
}
