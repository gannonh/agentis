import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";

const parent = mkdtempSync(join(tmpdir(), "agentis-tests-"));
process.env.TMPDIR = parent;

const cleanup = () => rmSync(parent, { recursive: true, force: true });

afterAll(cleanup);

const onSignal = (signal: NodeJS.Signals) => {
  try {
    cleanup();
  } finally {
    process.kill(process.pid, signal);
  }
};

process.once("SIGINT", () => onSignal("SIGINT"));
process.once("SIGTERM", () => onSignal("SIGTERM"));
