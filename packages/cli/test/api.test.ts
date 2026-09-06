import { describe, expect, it } from "vitest";
import { openApiDocument } from "../src/api.js";

describe("api", () => {
  it("derives OpenAPI 3 from the same HttpApi family", () => {
    const spec = openApiDocument();
    expect(spec.openapi.startsWith("3.")).toBe(true);
    expect(spec.paths["/v1/commands"]?.post).toBeDefined();
    expect(spec.paths["/v1/health"]?.get).toBeDefined();
  });
});
