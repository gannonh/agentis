#!/usr/bin/env node
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
appendFileSync(process.env.AGENTIS_TEST_DOCKER_LOG, `${JSON.stringify(args)}\n`);
const statePath = `${process.env.AGENTIS_TEST_DOCKER_LOG}.state`;

const resourcesPath = `${statePath}.resources`;
const resources = existsSync(resourcesPath) ? JSON.parse(readFileSync(resourcesPath, "utf8")) : {};
const saveResources = () => writeFileSync(resourcesPath, JSON.stringify(resources));
if (args[0] === "network") {
  if (args[1] === "create")
    resources[args.at(-1)] = args[args.indexOf("--label") + 1].split("=")[1];
  if (args[1] === "rm") delete resources[args.at(-1)];
  saveResources();
  process.exit(0);
}
if (args.includes("-d")) {
  resources[args[args.indexOf("--name") + 1]] = args[args.indexOf("--label") + 1].split("=")[1];
  saveResources();
  process.exit(0);
}
if (args[0] === "inspect" && resources[args.at(-1)]) {
  process.stdout.write(resources[args.at(-1)] + "\n");
  process.exit(0);
}
if (args[0] === "rm" && resources[args.at(-1)]) {
  delete resources[args.at(-1)];
  saveResources();
  process.exit(0);
}
if (args[0] === "build") {
  writeFileSync(
    `${process.env.AGENTIS_TEST_DOCKER_LOG}.squid`,
    readFileSync(`${args.at(-1)}/squid.conf`),
  );
}
if (args[0] === "build" || args[0] === "volume" || args.includes("--device-auth")) process.exit(0);

if (args.includes("--version")) {
  if (process.env.AGENTIS_TEST_PREFLIGHT_HOLD)
    while (!existsSync(`${process.env.AGENTIS_TEST_DOCKER_LOG}.release`))
      await new Promise((resolve) => setTimeout(resolve, 10));
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
    pid: process.pid,
  }),
);

const mounts = args
  .filter((arg) => arg.startsWith("type=bind,"))
  .map((arg) => {
    const match = arg.match(/^type=bind,src=(.*),dst=([^,]+)(?:,readonly)?$/);
    return match ? { source: match[1], destination: match[2] } : null;
  })
  .filter(Boolean);
const image = args.findIndex(
  (arg) => arg === "node:24-bookworm-slim" || arg === "agentis-codex:0.153.4",
);
const command = args.slice(image + 1).map((arg) => {
  const mount = mounts.find(
    (item) => arg === item.destination || arg.startsWith(`${item.destination}/`),
  );
  return mount ? `${mount.source}${arg.slice(mount.destination.length)}` : arg;
});
if (args.includes("app-server")) {
  command.splice(0, command.length, process.execPath, "-e", "setInterval(() => {}, 1000)");
}
const child = spawn(command[0], command.slice(1), { stdio: "inherit" });
process.on("SIGTERM", () => child.kill("SIGTERM"));
child.on("exit", (code) => process.exit(code ?? 0));
