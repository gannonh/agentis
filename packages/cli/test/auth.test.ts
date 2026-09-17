import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { loadOrCreateOwner } from "../src/auth.js";
import { tempRoot } from "./helpers/temp-root.js";

describe("auth", () => {
  it("refuses an invalid existing owner credential", async () => {
    const root = tempRoot("agentis-auth-");
    writeFileSync(join(root, "owner.token"), "not-json\n", { mode: 0o600 });
    await expect(Effect.runPromise(loadOrCreateOwner(root))).rejects.toThrow(/invalid owner credential/);
  });
});
