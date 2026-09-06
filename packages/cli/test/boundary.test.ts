import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { assertBoundary, BoundaryError } from "../src/boundary.js";

describe("boundary", () => {
  it("lets fake run without Docker", () => {
    expect(() =>
      assertBoundary({ provider: "fake", executionBoundary: "unverified-host-scratch" }),
    ).not.toThrow();
  });

  it("lets Codex opt into unverified host scratch", () => {
    expect(() =>
      assertBoundary({ provider: "codex", executionBoundary: "unverified-host-scratch" }),
    ).not.toThrow();
  });

  it("fails closed when Docker Desktop is required and unavailable", () => {
    const info = spawnSync("docker", ["info"], { encoding: "utf8" });
    if (info.status === 0) {
      expect(() =>
        assertBoundary({ provider: "codex", executionBoundary: "docker-desktop-run-container" }),
      ).not.toThrow();
      return;
    }
    expect(() =>
      assertBoundary({ provider: "codex", executionBoundary: "docker-desktop-run-container" }),
    ).toThrow(BoundaryError);
  });
});
