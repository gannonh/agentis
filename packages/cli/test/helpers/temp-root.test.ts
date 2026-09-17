import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { removeTempRoot, removeTempRoots, tempRoot } from "./temp-root.js";

describe("temp roots", () => {
  it("removes every registered temp root on demand", () => {
    const first = tempRoot("agentis-helper-first-");
    const second = tempRoot("agentis-helper-second-");
    expect(existsSync(first)).toBe(true);
    expect(existsSync(second)).toBe(true);

    removeTempRoots();

    expect(existsSync(first)).toBe(false);
    expect(existsSync(second)).toBe(false);
  });

  it("removes a single temp root and tolerates repeated removal", () => {
    const removed = tempRoot("agentis-helper-single-");
    const kept = tempRoot("agentis-helper-kept-");

    removeTempRoot(removed);
    expect(existsSync(removed)).toBe(false);
    expect(existsSync(kept)).toBe(true);

    removeTempRoot(removed);
    removeTempRoots();
    removeTempRoots();
    expect(existsSync(kept)).toBe(false);
  });
});
