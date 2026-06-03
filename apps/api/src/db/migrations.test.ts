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
  it("preserves existing durable library rows as documents", () => {
    const databasePath = join(tmpdir(), `agentis-migration-${randomUUID()}.db`)
    databasePaths.push(databasePath)
    const db = new Database(databasePath)

    try {
      const migrations = [
        "0000_wakeful_warbird.sql",
        "0001_outgoing_scarecrow.sql",
        "0002_tool_access_grants_scope_toolkit_unique.sql",
        "0003_motionless_whiplash.sql",
      ]
      for (const filename of migrations) applyMigration(db, filename)

      const previousTableName = "arti" + "facts"
      db.exec(`
        INSERT INTO ${previousTableName} (id, title, description, type, mime_type, size_bytes, storage_key, preview_text, metadata_json, created_at, updated_at)
        VALUES
          ('generated-doc', 'Generated doc', 'Generated markdown', 'document', 'text/markdown', 12, 'documents/generated.md', '# Generated', '{}', 'now', 'now'),
          ('uploaded-image', 'Uploaded image', 'Image upload', 'image', 'image/png', 3, 'documents/image.png', NULL, '{}', 'now', 'now');
      `)

      for (const filename of [
        "0004_low_chat.sql",
        "0005_agent_cost_limits.sql",
        "0006_agent_thread_run_metadata.sql",
        "0007_agent_version_tool_grant_snapshots.sql",
        "0008_agent_promotion_drafts.sql",
        "0009_agent_promotion_draft_intelligence.sql",
        "0010_agent_promotion_validation.sql",
        "0011_agent_source_linkage.sql",
        "0012_thread_source_linkage.sql",
        "0013_promotion_draft_source_workflow.sql",
        "0014_orange_phalanx.sql",
        "0015_saved_memory_pinned_context.sql",
        "0016_saved_memory_agent_scope.sql",
        "0017_saved_memory_source_threads.sql",
        "0018_saved_memory_sources.sql",
        "0019_memory_provenance_thread_titles.sql",
        "0020_saved_memory_multi_agent_scope.sql",
        "0021_agent_workspaces.sql",
        "0022_workspace_edits.sql",
        "0023_workspace_executions.sql",
        "0024_agent_configuration_native_tools.sql",
        "0025_persistent_documents.sql",
      ]) {
        applyMigration(db, filename)
      }

      const rows = db
        .prepare(
          "SELECT id, document_type AS documentType, visibility_scope AS visibilityScope, storage_key AS storageKey, current_version AS currentVersion FROM documents ORDER BY id"
        )
        .all() as Array<{
        id: string
        documentType: string
        visibilityScope: string
        storageKey: string
        currentVersion: number | null
      }>
      expect(rows).toEqual([
        {
          id: "generated-doc",
          documentType: "markdown",
          visibilityScope: "global",
          storageKey: "documents/generated.md",
          currentVersion: 1,
        },
        {
          id: "uploaded-image",
          documentType: "image",
          visibilityScope: "global",
          storageKey: "documents/image.png",
          currentVersion: null,
        },
      ])
      const version = db
        .prepare(
          "SELECT document_id AS documentId, version, content_storage_key AS contentStorageKey FROM document_versions WHERE document_id = 'generated-doc'"
        )
        .get() as { documentId: string; version: number; contentStorageKey: string }
      expect(version).toEqual({
        documentId: "generated-doc",
        version: 1,
        contentStorageKey: "documents/generated.md",
      })

      const indexNames = db
        .prepare("PRAGMA index_list('documents')")
        .all()
        .map((row) => (row as { name: string }).name)
      expect(indexNames).toContain("documents_created_at_idx")
      expect(indexNames).not.toContain(`arti${"facts"}_type_idx`)
    } finally {
      db.close()
    }
  })

  it("backfills current agent version tool grant snapshots", () => {
    const databasePath = join(tmpdir(), `agentis-migration-${randomUUID()}.db`)
    databasePaths.push(databasePath)
    const db = new Database(databasePath)

    try {
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
    } finally {
      db.close()
    }
  })

  it("backfills document native tools for legacy agent configuration snapshots", () => {
    const databasePath = join(tmpdir(), `agentis-migration-${randomUUID()}.db`)
    databasePaths.push(databasePath)
    const db = new Database(databasePath)

    try {
      for (const filename of [
        "0000_wakeful_warbird.sql",
        "0001_outgoing_scarecrow.sql",
        "0002_tool_access_grants_scope_toolkit_unique.sql",
        "0003_motionless_whiplash.sql",
        "0004_low_chat.sql",
        "0005_agent_cost_limits.sql",
        "0006_agent_thread_run_metadata.sql",
        "0007_agent_version_tool_grant_snapshots.sql",
        "0008_agent_promotion_drafts.sql",
        "0009_agent_promotion_draft_intelligence.sql",
        "0010_agent_promotion_validation.sql",
        "0011_agent_source_linkage.sql",
        "0012_thread_source_linkage.sql",
        "0013_promotion_draft_source_workflow.sql",
        "0014_orange_phalanx.sql",
        "0015_saved_memory_pinned_context.sql",
        "0016_saved_memory_agent_scope.sql",
        "0017_saved_memory_source_threads.sql",
        "0018_saved_memory_sources.sql",
        "0019_memory_provenance_thread_titles.sql",
        "0020_saved_memory_multi_agent_scope.sql",
        "0021_agent_workspaces.sql",
        "0022_workspace_edits.sql",
        "0023_workspace_executions.sql",
        "0024_agent_configuration_native_tools.sql",
      ]) {
        applyMigration(db, filename)
      }

      db.exec(`
        INSERT INTO agents (id, name, system_prompt, model, created_at, updated_at)
        VALUES
          ('agent-web', 'Web Agent', 'Search when needed.', 'gpt-4o-mini', 'now', 'now'),
          ('agent-none', 'Plain Agent', 'Answer plainly.', 'gpt-4o-mini', 'now', 'now'),
          ('agent-docs', 'Docs Agent', 'Use documents.', 'gpt-4o-mini', 'now', 'now');

        INSERT INTO agent_configuration_versions (id, agent_id, version, system_prompt, model, native_tools_json, created_at)
        VALUES
          ('version-web', 'agent-web', 1, 'Search when needed.', 'gpt-4o-mini', '["webSearch"]', 'now'),
          ('version-none', 'agent-none', 1, 'Answer plainly.', 'gpt-4o-mini', '[]', 'now'),
          ('version-docs', 'agent-docs', 1, 'Use documents.', 'gpt-4o-mini', '["documents","webSearch"]', 'now');
      `)

      applyMigration(db, "0027_document_native_tools_backfill.sql")

      const rows = db
        .prepare(
          "SELECT id, native_tools_json AS nativeToolsJson FROM agent_configuration_versions WHERE id LIKE 'version-%' ORDER BY id"
        )
        .all() as Array<{ id: string; nativeToolsJson: string }>

      expect(
        rows.map((row) => ({
          id: row.id,
          nativeTools: JSON.parse(row.nativeToolsJson),
        }))
      ).toEqual([
        {
          id: "version-docs",
          nativeTools: ["documents", "webSearch"],
        },
        {
          id: "version-none",
          nativeTools: ["documents"],
        },
        {
          id: "version-web",
          nativeTools: ["documents", "webSearch"],
        },
      ])
    } finally {
      db.close()
    }
  })
})
