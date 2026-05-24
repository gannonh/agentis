import { randomUUID } from "node:crypto"
import { readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"
import Database from "better-sqlite3"
import { afterEach, describe, expect, it } from "vitest"

const migrationsFolder = join(
  fileURLToPath(new URL("../..", import.meta.url)),
  "drizzle"
)

const databasePaths: string[] = []

function applyMigration(db: Database.Database, filename: string) {
  const sql = readFileSync(join(migrationsFolder, filename), "utf8").replaceAll(
    "--> statement-breakpoint",
    ""
  )
  db.exec(sql)
}

afterEach(() => {
  for (const path of databasePaths.splice(0)) {
    rmSync(path, { force: true })
  }
})

describe("database migrations", () => {
  it("backfills current agent version tool grant snapshots", () => {
    const databasePath = join(tmpdir(), `agentis-migration-${randomUUID()}.db`)
    databasePaths.push(databasePath)
    const db = new Database(databasePath)

    for (const filename of [
      "0000_wakeful_warbird.sql",
      "0001_outgoing_scarecrow.sql",
      "0002_tool_access_grants_scope_toolkit_unique.sql",
      "0003_motionless_whiplash.sql",
      "0004_low_chat.sql",
      "0005_agent_cost_limits.sql",
      "0006_agent_thread_run_metadata.sql",
    ]) {
      applyMigration(db, filename)
    }

    db.exec(`
      INSERT INTO integration_toolkits (slug, name, description, category, featured, created_at, updated_at)
      VALUES ('github', 'GitHub', 'GitHub integration', 'developer', 1, 'now', 'now');
      INSERT INTO integration_connections (id, user_id, toolkit_slug, status, created_at, updated_at)
      VALUES ('conn-github', 'agentis-local-user', 'github', 'connected', 'now', 'now');
      INSERT INTO agents (id, name, system_prompt, model, created_at, updated_at)
      VALUES ('agent-1', 'Research Agent', 'Answer with citations.', 'gpt-4o-mini', 'now', 'now');
      INSERT INTO agent_configuration_versions (id, agent_id, version, system_prompt, model, created_at)
      VALUES ('version-1', 'agent-1', 1, 'Answer with citations.', 'gpt-4o-mini', 'now');
      INSERT INTO tool_access_grants (id, scope_type, scope_id, toolkit_slug, connection_id, created_at)
      VALUES ('grant-1', 'agent', 'agent-1', 'github', 'conn-github', 'now');
    `)

    applyMigration(db, "0007_agent_version_tool_grant_snapshots.sql")

    const row = db
      .prepare(
        "SELECT tool_grants_json AS toolGrantsJson FROM agent_configuration_versions WHERE id = 'version-1'"
      )
      .get() as { toolGrantsJson: string }

    expect(JSON.parse(row.toolGrantsJson)).toEqual([
      { toolkitSlug: "github", connectionId: "conn-github" },
    ])

    db.close()
  })
})
