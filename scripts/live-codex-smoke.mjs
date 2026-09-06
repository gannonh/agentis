import { mkdtempSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const bin = join(root, "packages/cli/dist/bin.js");
const dataRoot = mkdtempSync(join(tmpdir(), "agentis-live-codex-"));

const allocate = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("no port"));
        return;
      }
      const port = address.port;
      server.close((error) =>
        error ? reject(error) : resolve(new URL(`http://127.0.0.1:${port}/`)),
      );
    });
  });

const endpoint = await allocate();
const daemon = spawn(
  process.execPath,
  [
    bin,
    "serve",
    "--endpoint",
    endpoint.toString(),
    "--data-root",
    dataRoot,
    "--provider",
    "codex",
    "--execution-boundary",
    "unverified-host-scratch",
  ],
  { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
);

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("serve timed out")), 10_000);
  daemon.stdout.on("data", (chunk) => {
    if (chunk.toString().includes(endpoint.toString())) {
      clearTimeout(timer);
      resolve();
    }
  });
  daemon.stderr.on("data", (chunk) => process.stderr.write(chunk));
  daemon.on("exit", (code) => {
    clearTimeout(timer);
    reject(new Error(`serve exited ${code}`));
  });
});

const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bin, ...args], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      out += chunk.toString();
    });
    child.on("exit", (code) =>
      code === 0 ? resolve(out) : reject(new Error(`${args.join(" ")} exited ${code}: ${out}`)),
    );
  });

const submitOut = await run([
  "task",
  "submit",
  "--endpoint",
  endpoint.toString(),
  "--data-root",
  dataRoot,
  "--brief",
  "Reply exactly KAT3242_OK. Do not call tools or access files.",
]);
const receipt = JSON.parse(submitOut);
const deadline = Date.now() + 180_000;
let snap = null;
while (Date.now() < deadline) {
  const doctor = JSON.parse(
    await run(["doctor", "--endpoint", endpoint.toString(), "--data-root", dataRoot]),
  );
  snap = doctor.status;
  const runRow = snap.runs.find((item) => item.id === receipt.runId);
  if (runRow && ["succeeded", "failed", "canceled", "interrupted"].includes(runRow.status)) {
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

daemon.kill("SIGTERM");
const report = {
  ok: snap?.runs?.some((item) => item.id === receipt.runId && item.status === "succeeded"),
  endpoint: endpoint.toString(),
  dataRoot,
  receipt,
  run: snap?.runs?.find((item) => item.id === receipt.runId) ?? null,
  artifact: snap?.artifacts?.find((item) => item.runId === receipt.runId) ?? null,
};
writeFileSync(join(dataRoot, "receipt.json"), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) {
  process.exit(1);
}
