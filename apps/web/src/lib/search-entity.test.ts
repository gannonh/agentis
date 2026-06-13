import { describe, expect, it } from "vitest"
import type { SearchHit } from "@workspace/shared"
import { searchHitPath } from "./search-entity"

describe("searchHitPath", () => {
  it("routes non-launchable artifacts to their library detail", () => {
    const hit: SearchHit = {
      id: "artifact_1",
      title: "Image proof",
      entityType: "artifact",
      artifactType: "image",
    }

    expect(searchHitPath(hit)).toBe("/library?artifactId=artifact_1")
  })

  it("encodes artifact ids in library detail routes", () => {
    const hit: SearchHit = {
      id: "artifact/with space",
      title: "Table import",
      entityType: "artifact",
      artifactType: "table",
    }

    expect(searchHitPath(hit)).toBe(
      "/library?artifactId=artifact%2Fwith%20space"
    )
  })
})
