#!/usr/bin/env node
import { runCli } from "./cli.js";

const code = await runCli(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  return 1;
});
process.exit(code);
