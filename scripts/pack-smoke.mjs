import { mkdtempSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const cli = join(root, "packages/cli");

const run = (command, args, cwd = root) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} exited ${code}`)),
    );
  });

await run("pnpm", ["--filter", "@agentis-labs/cli", "build"]);
const packDir = mkdtempSync(join(tmpdir(), "agentis-pack-"));
await run("pnpm", ["pack", "--pack-destination", packDir], cli);
const { readdirSync } = await import("node:fs");
const tarball = readdirSync(packDir).find((name) => name.endsWith(".tgz"));
if (!tarball) throw new Error("pack produced no tarball");
const installDir = mkdtempSync(join(tmpdir(), "agentis-install-"));
await run("npm", ["install", "--prefix", installDir, join(packDir, tarball)]);
const bin = join(installDir, "node_modules/.bin/agentis");
const launch = spawn(bin, ["verify", "launch"], { stdio: ["ignore", "pipe", "pipe"] });
const stdout = await new Promise((resolve, reject) => {
  let out = "";
  const timer = setTimeout(() => reject(new Error("verify launch timed out")), 15_000);
  launch.stdout.on("data", (chunk) => {
    out += chunk.toString();
    if (out.includes("endpoint")) {
      clearTimeout(timer);
      resolve(out);
    }
  });
  launch.stderr.on("data", (chunk) => {
    out += chunk.toString();
  });
  launch.on("exit", (code) => {
    if (!out.includes("endpoint")) reject(new Error(`verify launch exited ${code}: ${out}`));
  });
});
const report = JSON.parse(stdout);
if (!report.endpoint || !report.pid || !report.log) {
  throw new Error(`verify launch missing fields: ${stdout}`);
}
const doctor = spawn(
  bin,
  ["doctor", "--endpoint", report.endpoint, "--data-root", report.dataRoot],
  {
    stdio: "inherit",
  },
);
await new Promise((resolve, reject) => {
  doctor.on("exit", (code) =>
    code === 0 ? resolve() : reject(new Error(`doctor exited ${code}`)),
  );
});
launch.kill("SIGTERM");
rmSync(packDir, { recursive: true, force: true });
console.log(
  JSON.stringify({
    ok: true,
    endpoint: report.endpoint,
    pid: report.pid,
    log: report.log,
    tarball,
  }),
);
