import { spawn } from "node:child_process";
import { applyRepoEnv } from "./lib/load-repo-env.mjs";

const [command, ...args] = process.argv.slice(2);
if (!command) {
  process.stderr.write("usage: node scripts/with-repo-env.mjs <command> [...args]\n");
  process.exit(1);
}

const env = applyRepoEnv();
const child = spawn(command, args, { stdio: "inherit", env });

function forwardSignal(signal) {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill(signal);
  }
}

process.on("SIGTERM", forwardSignal);
process.on("SIGINT", forwardSignal);

child.on("error", (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  process.off("SIGTERM", forwardSignal);
  process.off("SIGINT", forwardSignal);
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
