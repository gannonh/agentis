import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { applyRepoEnv } from "./lib/load-repo-env.mjs";

applyRepoEnv();

const [dataRoot, bot, ...cases] = process.argv.slice(2);
if (!dataRoot || !["mara", "ivo"].includes(bot) || !cases.length)
  throw new Error("Pass data root, mara|ivo, and cases");
if (
  process.env.AGENTIS_CODEX_STUB ||
  process.env.AGENTIS_CLAUDE_STUB ||
  process.env.AGENTIS_TEST_DOCKER_LOG
)
  throw new Error("Live conformance refuses fixture configuration");
const allocator = createServer();
await new Promise((done) => allocator.listen(0, "127.0.0.1", done));
const endpoint = `http://127.0.0.1:${allocator.address().port}`;
await new Promise((done) => allocator.close(done));
const daemon = spawn(
  process.execPath,
  [
    resolve("packages/cli/dist/bin.js"),
    "serve",
    "--endpoint",
    endpoint,
    "--data-root",
    dataRoot,
    "--provider",
    "codex",
  ],
  { stdio: "ignore" },
);
const exited = new Promise((done) => daemon.on("exit", done));
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
let token;
const headers = () => ({ authorization: `Bearer ${token}`, "content-type": "application/json" });
const status = async () => {
  const response = await fetch(`${endpoint}/v1/status`, { headers: headers() });
  if (!response.ok) throw new Error(`Status HTTP ${response.status}`);
  return response.json();
};
const command = async (value) => {
  const response = await fetch(`${endpoint}/v1/commands`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ idempotencyKey: randomUUID(), command: value }),
  });
  if (!response.ok) throw new Error(`Command HTTP ${response.status}`);
  const receipt = await response.json();
  if (!receipt.accepted) throw new Error(`Command rejected: ${receipt.errorCode ?? "rejected"}`);
  return receipt;
};
const terminal = (run) => ["succeeded", "failed", "canceled", "interrupted"].includes(run?.status);
const wait = async (id, predicate, limit = 120000) => {
  const deadline = Date.now() + limit;
  for (;;) {
    const snapshot = await status();
    const run = snapshot.runs.find((item) => item.id === id);
    if (predicate(run, snapshot)) return { run, snapshot };
    if (Date.now() > deadline) throw new Error("Case timed out");
    await delay(200);
  }
};
const prompts = {
  "no-auth": "Reply exactly KAT3243_CONTAINER_OK. Do not call tools or access files.",
  smoke: "Reply exactly KAT3243_CONTAINER_OK. Do not call tools or access files.",
  allow:
    'Run exactly node -e "console.log(3243)" once. Request approval. Do not access files or use other tools. Then return the output as text.',
  deny: 'Run exactly node -e "console.log(3243)" once. Request approval. If denied, stop without retrying. Do not access files or use other tools.',
  plan:
    bot === "mara"
      ? "Return a native plan item proposing one step to draft a greeting. Do not execute the plan, request approval, use tools, or access files."
      : "Use AskUserQuestion with the full one-step plan to draft a greeting as the question and options Approve or Reject. Wait for the answer. If Reject is selected return REJECTED without executing the plan. Do not access files.",
  input: `Use ${bot === "mara" ? "request_user_input" : "AskUserQuestion"} to ask me to choose Red or Blue. Wait for my structured answer. Do not access files or use other tools. Return the selected color only.`,
  cancel:
    "Draft a detailed comparison of thirty imaginary greeting styles. Do not access files or use tools.",
};
const results = [];
try {
  const deadline = Date.now() + 10000;
  for (;;) {
    try {
      if ((await fetch(`${endpoint}/v1/health`)).ok) break;
    } catch {}
    if (Date.now() > deadline || daemon.exitCode !== null) throw new Error("Startup failed");
    await delay(100);
  }
  token = JSON.parse(readFileSync(join(dataRoot, "owner.token"), "utf8")).token;
  for (const name of cases) {
    if (!prompts[name]) throw new Error("Unknown case");
    const row = { case: name, startedAt: new Date().toISOString(), status: "UNVERIFIED" };
    results.push(row);
    let receipt;
    try {
      receipt = await command({
        kind: "submit_task",
        bot,
        brief: prompts[name],
        ...(bot === "mara" && (name === "plan" || name === "input") ? { mode: "plan" } : {}),
      });
      row.runId = receipt.runId;
      row.taskId = receipt.taskId;
      row.threadId = receipt.threadId;
      const nativeCodexPlan = bot === "mara" && name === "plan";
      if (name === "smoke" || name === "no-auth" || nativeCodexPlan) {
        // The terminal assertion below checks the provider-authored marker.
      } else if (name === "cancel") {
        await wait(receipt.runId, (run) => run?.status === "running" || terminal(run));
        await command({ kind: "cancel_run", runId: receipt.runId });
      } else {
        const waiting = await wait(
          receipt.runId,
          (run) => ["waiting_approval", "waiting_input"].includes(run?.status) || terminal(run),
        );
        if (terminal(waiting.run))
          throw new Error("Provider completed without required blocking request");
        row.pendingPrompt = waiting.run.providerState.pendingPrompt;
        if (name === "input" || (bot === "ivo" && name === "plan")) {
          const request = JSON.parse(waiting.run.providerState.pendingPrompt);
          const answers = Object.fromEntries(
            request.questions.map((question) => {
              const option =
                bot === "ivo" && name === "plan"
                  ? question.options.find((option) => option.label === "Reject")
                  : question.options.at(-1);
              if (!option) throw new Error("Required structured option missing");
              return bot === "ivo"
                ? [question.question, option.label]
                : [question.id, option.id ?? option.label];
            }),
          );
          await command({ kind: "answer_input", runId: receipt.runId, answers });
        } else {
          const approval = waiting.snapshot.pending.find(
            (item) => item.runId === receipt.runId && item.approvalId,
          );
          if (!approval) throw new Error("Expected approval missing");
          row.approvalId = approval.approvalId;
          await command({
            kind: "resolve_approval",
            approvalId: approval.approvalId,
            decision: name === "allow" ? "allowed" : "denied",
          });
        }
      }
      const done = await wait(receipt.runId, terminal);
      row.runStatus = done.run.status;
      row.providerSessionId = done.run.providerSessionId;
      row.failure = done.run.providerState.failure;
      row.frozen = done.run.frozen;
      const artifact = done.snapshot.artifacts.find((item) => item.runId === receipt.runId);
      row.artifact = artifact ?? null;
      if (artifact) row.body = readFileSync(artifact.path, "utf8");
      const expected =
        nativeCodexPlan ||
        (bot === "ivo" && name === "plan") ||
        ["allow", "smoke", "input"].includes(name)
          ? "succeeded"
          : name === "cancel"
            ? "canceled"
            : "failed";
      if (done.run.status !== expected) throw new Error("Unexpected terminal state");
      if (nativeCodexPlan) {
        row.nativePlans = done.run.providerState.history
          .map((entry) => JSON.parse(entry))
          .filter(
            (item) =>
              item.type === "plan" && typeof item.id === "string" && typeof item.text === "string",
          );
        row.blockingApprovalObserved = done.snapshot.pending.some(
          (item) => item.runId === receipt.runId && item.approvalId,
        );
        row.planCapability = done.run.providerState.capabilities.find(
          (capability) => capability.name === "plans",
        );
        if (
          !row.nativePlans.length ||
          row.blockingApprovalObserved ||
          !row.body?.trim() ||
          row.planCapability?.operation !== "unavailable" ||
          row.planCapability?.reason !== "native-plan-output-without-blocking-approval"
        )
          throw new Error("Native plan output or honest nonblocking capability missing");
      }
      if (bot === "ivo" && name === "plan") {
        const question = JSON.parse(row.pendingPrompt).questions[0]?.question ?? "";
        row.questionMediatedPlanDecision = true;
        if (
          !/greeting/i.test(question) ||
          row.body?.trim() !== "REJECTED" ||
          done.run.actionCount !== 1
        )
          throw new Error("Expected plan question rejection without execution");
      }
      if (name === "no-auth" && row.failure !== "auth-unavailable")
        throw new Error("Expected typed authentication failure");
      if (name === "smoke" && row.body?.trim() !== "KAT3243_CONTAINER_OK")
        throw new Error("Expected marker absent");
      if (name === "allow" && !row.body?.includes("3243"))
        throw new Error("Expected tool output absent");
      if (name === "input" && !row.body?.includes("Blue"))
        throw new Error("Expected selected answer absent");
      if (name === "allow" || name === "smoke") {
        const history = done.run.providerState.history;
        await command({ kind: "load_session", runId: receipt.runId });
        const loaded = await wait(receipt.runId, (run) =>
          ["succeeded", "failed"].includes(run?.providerState.loadStatus),
        );
        row.loadStatus = loaded.run.providerState.loadStatus;
        row.sessionIdentityUnchanged = loaded.run.providerSessionId === done.run.providerSessionId;
        row.messagesUnchanged =
          JSON.stringify(done.snapshot.messages) === JSON.stringify(loaded.snapshot.messages);
        row.artifactCount = loaded.snapshot.artifacts.filter(
          (item) => item.runId === receipt.runId,
        ).length;
        if (
          row.loadStatus !== "succeeded" ||
          !row.sessionIdentityUnchanged ||
          !row.messagesUnchanged ||
          row.artifactCount !== 1
        )
          throw new Error("Session load failed or changed conversation identity/output");
        if (bot === "ivo") {
          row.historyUnchanged =
            JSON.stringify(history) === JSON.stringify(loaded.run.providerState.history);
          if (!row.historyUnchanged) throw new Error("Claude load changed captured history");
        } else {
          row.loadedHistoryEntries = loaded.run.providerState.history.length;
          if (!row.loadedHistoryEntries) throw new Error("Codex load returned no history");
          await command({ kind: "load_session", runId: receipt.runId });
          const repeated = await wait(receipt.runId, (run) =>
            ["succeeded", "failed"].includes(run?.providerState.loadStatus),
          );
          row.repeatedLoadHistoryUnchanged =
            JSON.stringify(loaded.run.providerState.history) ===
            JSON.stringify(repeated.run.providerState.history);
          if (
            repeated.run.providerState.loadStatus !== "succeeded" ||
            !row.repeatedLoadHistoryUnchanged ||
            JSON.stringify(repeated.snapshot.messages) !== JSON.stringify(done.snapshot.messages) ||
            repeated.run.providerSessionId !== done.run.providerSessionId ||
            repeated.snapshot.artifacts.filter((item) => item.runId === receipt.runId).length !== 1
          )
            throw new Error("Repeated Codex load changed history or output");
        }
      }
      await delay(500);
      const containers = spawnSync("docker", ["ps", "--format", "{{.Names}}"], {
        encoding: "utf8",
      });
      row.cleaned = containers.status === 0 && !containers.stdout.includes(receipt.runId);
      if (!row.cleaned) throw new Error("Run containers remain active");
      row.status = "PASS";
    } catch (error) {
      row.status = "FAIL";
      row.reason = error.message;
      process.exitCode = 1;
    } finally {
      if (receipt) await command({ kind: "cancel_run", runId: receipt.runId }).catch(() => {});
    }
    console.log(JSON.stringify(row));
  }
} finally {
  daemon.kill("SIGTERM");
  await exited;
  writeFileSync(
    `docs/verification/kat-3243/evidence/responses/provider-conformance-${bot}-${cases.join("-")}.json`,
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        fixtureMode: Boolean(
          process.env.AGENTIS_CODEX_STUB ||
            process.env.AGENTIS_CLAUDE_STUB ||
            process.env.AGENTIS_TEST_DOCKER_LOG,
        ),
        sourceCommit: spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
        productSourceDirty:
          spawnSync("git", ["diff", "--quiet", "HEAD", "--", "packages/cli"]).status !== 0,
        argv: process.argv.slice(2),
        bot,
        results,
      },
      null,
      2,
    ) + "\n",
  );
}
