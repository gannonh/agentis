import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";

describe("cli", () => {
  it("refuses doctor and serve without an endpoint or profile", async () => {
    await expect(runCli(["doctor"])).rejects.toThrow(/--endpoint or --profile/);
    await expect(runCli(["serve"])).rejects.toThrow(/--endpoint or --profile/);
  });
});
