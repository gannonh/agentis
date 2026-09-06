import { mkdtempSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const bin = join(root, "packages/cli/dist/bin.js");
const dataRoot = mkdtempSync(join(tmpdir(), "agentis-live-cases-"));
const wanted = process.argv.slice(2);
const cases = (wanted.length > 0 ? wanted : ["allow", "deny", "input", "cancel"]).filter(
  (name) => name !== "smoke",
);

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

const status = async () => {
  const doctor = JSON.parse(
    await run(["doctor", "--endpoint", endpoint.toString(), "--data-root", dataRoot]),
  );
  return doctor.status;
};

const waitRun = async (runId, match, ms = 180_000) => {
  const deadline = Date.now() + ms;
  let snap = await status();
  while (
    !match(
      snap,
      snap.runs.find((item) => item.id === runId),
    )
  ) {
    if (Date.now() > deadline) {
      throw new Error(`timeout waiting for ${runId}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    snap = await status();
  }
  return { snap, run: snap.runs.find((item) => item.id === runId) };
};

const submit = async (brief) => {
  const out = await run([
    "task",
    "submit",
    "--endpoint",
    endpoint.toString(),
    "--data-root",
    dataRoot,
    "--brief",
    brief,
  ]);
  return JSON.parse(out);
};

const prompts = {
  allow:
    'Run exactly python3 -c "print(3242)" once. Request approval if required. Do not use other tools, files or integrations. If denied, stop without retrying.',
  deny: 'Run exactly python3 -c "print(3252)" once. Request approval if required. Do not use other tools, files or integrations. If denied, stop without retrying.',
  input:
    "Use request_user_input to ask me to choose Red or Blue. You must wait for the structured answer. Do not call any other tool or access files. After I answer, reply with the selected color only.",
  cancel:
    "Use request_user_input to ask me to choose Red or Blue. You must wait for the structured answer. Do not call any other tool or access files.",
};

const results = [];
try {
  for (const name of cases) {
    const receipt = await submit(prompts[name]);
    if (name === "allow" || name === "deny") {
      const waiting = await waitRun(
        receipt.runId,
        (_snap, run) => run?.status === "waiting_approval",
      );
      const approval = waiting.snap.pending.find(
        (item) => item.runId === receipt.runId && item.approvalId,
      );
      await run([
        "approval",
        name === "allow" ? "allow" : "deny",
        "--endpoint",
        endpoint.toString(),
        "--data-root",
        dataRoot,
        "--approval",
        approval.approvalId,
      ]);
      const done = await waitRun(
        receipt.runId,
        (_snap, run) =>
          run?.status === (name === "allow" ? "succeeded" : "failed") ||
          run?.status === "canceled" ||
          run?.status === "interrupted",
      );
      results.push({
        case: name,
        ok: done.run?.status === (name === "allow" ? "succeeded" : "failed"),
        status: done.run?.status,
        approvalId: approval.approvalId,
        artifact: done.snap.artifacts.find((item) => item.runId === receipt.runId) ?? null,
        runId: receipt.runId,
        taskId: receipt.taskId,
        providerSessionId: done.run?.providerSessionId ?? null,
      });
    } else if (name === "input") {
      await waitRun(receipt.runId, (_snap, run) => run?.status === "waiting_input");
      await run([
        "input",
        "answer",
        "--endpoint",
        endpoint.toString(),
        "--data-root",
        dataRoot,
        "--run",
        receipt.runId,
        "--answer",
        "color=Blue",
      ]);
      const done = await waitRun(receipt.runId, (_snap, run) =>
        ["succeeded", "failed", "canceled", "interrupted"].includes(run?.status),
      );
      results.push({
        case: name,
        ok: done.run?.status === "succeeded",
        status: done.run?.status,
        artifact: done.snap.artifacts.find((item) => item.runId === receipt.runId) ?? null,
        runId: receipt.runId,
        taskId: receipt.taskId,
        providerSessionId: done.run?.providerSessionId ?? null,
      });
    } else if (name === "cancel") {
      await waitRun(
        receipt.runId,
        (_snap, run) => run?.status === "waiting_input" || run?.status === "waiting_approval",
      );
      await run([
        "run",
        "cancel",
        "--endpoint",
        endpoint.toString(),
        "--data-root",
        dataRoot,
        "--run",
        receipt.runId,
      ]);
      const done = await waitRun(receipt.runId, (_snap, run) => run?.status === "canceled");
      results.push({
        case: name,
        ok: done.run?.status === "canceled",
        status: done.run?.status,
        runId: receipt.runId,
        taskId: receipt.taskId,
        providerSessionId: done.run?.providerSessionId ?? null,
      });
    }
  }
} finally {
  daemon.kill("SIGTERM");
}

const report = {
  ok: results.every((item) => item.ok),
  endpoint: endpoint.toString(),
  dataRoot,
  results,
};
writeFileSync(join(dataRoot, "receipt.json"), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) {
  process.exit(1);
}
