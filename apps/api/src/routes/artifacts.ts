import { Hono } from "hono"
import {
  artifactPublicSchema,
  artifactTypeSchema,
  listArtifactsQuerySchema,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import type { Repositories } from "../repositories/index.js"
import { ArtifactService } from "../artifacts/artifact-service.js"

function toPublicArtifact(artifact: Parameters<typeof artifactPublicSchema.parse>[0]) {
  return artifactPublicSchema.parse(artifact)
}

export function createArtifactRoutes(
  repos: Repositories,
  config: AppConfig
) {
  const app = new Hono()
  const artifactService = new ArtifactService(repos, config)

  app.get("/", (c) => {
    const parsed = listArtifactsQuerySchema.safeParse({
      query: c.req.query("query"),
      type: c.req.query("type"),
      projectId: c.req.query("projectId"),
      threadId: c.req.query("threadId"),
    })
    if (!parsed.success) {
      return c.json(
        { error: "Invalid query parameters", code: "invalid_request" },
        400
      )
    }
    const artifacts = repos.artifacts.list(parsed.data)
    return c.json(artifacts.map((artifact) => toPublicArtifact(artifact)))
  })

  app.post("/", async (c) => {
    const body = await c.req.parseBody()
    const file = body.file
    const title = typeof body.title === "string" ? body.title : ""
    const typeRaw = typeof body.type === "string" ? body.type : "other"
    const description =
      typeof body.description === "string" ? body.description : undefined
    const projectId =
      typeof body.projectId === "string" ? body.projectId : undefined
    const threadId =
      typeof body.threadId === "string" ? body.threadId : undefined

    if (!title.trim()) {
      return c.json({ error: "Title is required", code: "invalid_request" }, 400)
    }

    const parsedType = artifactTypeSchema.safeParse(typeRaw)
    if (!parsedType.success) {
      return c.json({ error: "Invalid artifact type", code: "invalid_request" }, 400)
    }

    let data: Buffer
    let filename = "upload.bin"
    if (file instanceof File) {
      if (file.size > config.artifactMaxUploadBytes) {
        return c.json(
          { error: "Artifact exceeds maximum upload size", code: "artifact_too_large" },
          413
        )
      }
      data = Buffer.from(await file.arrayBuffer())
      filename = file.name || filename
    } else if (typeof file === "string") {
      if (Buffer.byteLength(file, "utf8") > config.artifactMaxUploadBytes) {
        return c.json(
          { error: "Artifact exceeds maximum upload size", code: "artifact_too_large" },
          413
        )
      }
      data = Buffer.from(file, "utf8")
      filename = "upload.txt"
    } else {
      return c.json({ error: "File is required", code: "invalid_request" }, 400)
    }

    const result = artifactService.upload({
      title: title.trim(),
      description,
      type: parsedType.data,
      filename,
      mimeType: file instanceof File ? file.type : undefined,
      data,
      projectId,
      threadId,
    })

    if (!result.ok) {
      if (result.code === "artifact_too_large") {
        return c.json(
          { error: result.message, code: result.code },
          413
        )
      }
      return c.json({ error: result.message, code: result.code }, 500)
    }

    return c.json(toPublicArtifact(result.artifact), 201)
  })

  app.get("/:artifactId", (c) => {
    const artifact = repos.artifacts.getById(c.req.param("artifactId"))
    if (!artifact) {
      return c.json({ error: "Artifact not found", code: "artifact_not_found" }, 404)
    }
    return c.json(toPublicArtifact(artifact))
  })

  app.get("/:artifactId/download", (c) => {
    const result = artifactService.getDownload(c.req.param("artifactId"))
    if (!result.ok) {
      const status =
        result.status === 404 ? 404 : (500 as const)
      return c.json(
        { error: result.message, code: result.code },
        status
      )
    }
    const filename = result.artifact.title.replace(/[^\w.-]+/g, "_") || "artifact"
    return new Response(new Uint8Array(result.data), {
      headers: {
        "Content-Type": result.artifact.mimeType,
        "Content-Length": String(result.data.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  })

  return app
}
