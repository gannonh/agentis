#!/usr/bin/env node
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
appendFileSync(process.env.AGENTIS_TEST_DOCKER_LOG, `${JSON.stringify(args)}\n`);
const statePath = `${process.env.AGENTIS_TEST_DOCKER_LOG}.state`;

if (args.includes("--version")) {
  process.stdout.write("codex-cli 0.153.4\n");
  process.exit(0);
}

if (args[0] === "inspect") {
  if (!existsSync(statePath)) {
    process.stderr.write(`Error: No such object: ${args.at(-1)}\n`);
    process.exit(1);
  }
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  if (state.name !== args.at(-1)) {
    process.stderr.write(`Error: No such object: ${args.at(-1)}\n`);
    process.exit(1);
  }
  process.stdout.write(`${state.managed}|${state.runId}\n`);
  process.exit(0);
}

if (args[0] === "rm") {
  if (existsSync(statePath)) {
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    if (state.name === args[2]) {
      unlinkSync(statePath);
    }
  }
  process.exit(0);
}

const labels = Object.fromEntries(
  args.flatMap((arg, index) => (arg === "--label" ? [args[index + 1].split("=")] : [])),
);
writeFileSync(
  statePath,
  JSON.stringify({
    name: args[args.indexOf("--name") + 1],
    managed: labels["io.agentis.managed"],
    runId: labels["io.agentis.run-id"],
  }),
);

const mounts = args
  .filter((arg) => arg.startsWith("type=bind,"))
  .map((arg) => {
    const match = arg.match(/^type=bind,src=(.*),dst=([^,]+)(?:,readonly)?$/);
    return match ? { source: match[1], destination: match[2] } : null;
  })
  .filter(Boolean);
const image = args.indexOf("node:24-bookworm-slim");
const command = args.slice(image + 1).map((arg) => {
  const mount = mounts.find(
    (item) => arg === item.destination || arg.startsWith(`${item.destination}/`),
  );
  return mount ? `${mount.source}${arg.slice(mount.destination.length)}` : arg;
});
const child = spawn(command[0], command.slice(1), { stdio: "inherit" });
process.on("SIGTERM", () => child.kill("SIGTERM"));
child.on("exit", (code) => process.exit(code ?? 0));
