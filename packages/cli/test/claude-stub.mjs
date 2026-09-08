import { writeFileSync, appendFileSync, readFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
writeFileSync("provider.pid", String(process.pid));
const sessionId = "claude-session-1";
const send = (value) => process.stdout.write(JSON.stringify(value) + "\n");
let current;
let history = existsSync("history.json") ? JSON.parse(readFileSync("history.json", "utf8")) : [];
const entry = (type, text) => ({
  type,
  uuid: randomUUID(),
  session_id: sessionId,
  message: { role: type, content: text },
});
const finish = (text) => {
  history.push(entry("assistant", text));
  writeFileSync("history.json", JSON.stringify(history));
  send({ event: "text", requestId: current.id, sessionId, text });
  send({ id: current.id, sessionId, text, history });
};
const permission = (id, name, input) =>
  send({ event: "permission", requestId: current.id, sessionId, id, name, input });
createInterface({ input: process.stdin }).on("line", async (line) => {
  const command = JSON.parse(line);
  if (command.kind === "permission") {
    if (command.id === "extra") return;
    if (command.result.behavior === "deny")
      setTimeout(() => {
        writeFileSync("denied-provider-continued", "bad");
        finish(JSON.stringify(command.result));
      }, 80);
    else finish(JSON.stringify(command.result));
    return;
  }
  const previousId = current?.id;
  current = command;
  if (command.kind === "load") {
    const slow = history.some((item) => item.message.content === "SLOW_LOAD");
    setTimeout(() => send({ id: command.id, sessionId, history }), slow ? 1500 : 100);
    return;
  }
  appendFileSync("prompts.jsonl", JSON.stringify(command) + "\n");
  const text = command.text;
  if (text === "AUTH" || text === "QUOTA" || text === "PROXY_ERROR") {
    send({
      event: "error",
      requestId: command.id,
      failure: text === "AUTH" ? "auth-unavailable" : text === "QUOTA" ? "quota" : "provider-error",
    });
    return;
  }
  if (text === "CRASH") {
    process.exit(2);
  }
  if (text === "MALFORMED") {
    process.stdout.write("not-json\n");
    return;
  }
  if (!(text.startsWith("You accepted handoff") && text.includes("NO_INIT_DRAFT")))
    send({
      event: "init",
      requestId: command.id,
      sessionId,
      model: "claude-sonnet-5",
      apiKeySource: text === "BAD_AUTH_SOURCE" ? "oauth" : "ANTHROPIC_API_KEY",
      tools:
        text === "BAD_INVENTORY"
          ? ["Agent"]
          : process.env.CLAUDE_DRAFT_ONLY === "1"
            ? []
            : ["Bash", "AskUserQuestion"],
    });
  history.push(entry("user", text));
  writeFileSync("history.json", JSON.stringify(history));
  if (text.startsWith("You are Ivo.")) {
    const handoffId = text.match(/handoff (handoff_[\w-]+)/)[1];
    if (text.includes("DELAY_HANDOFF")) await new Promise((resolve) => setTimeout(resolve, 400));
    let decision = JSON.stringify({
      handoffId,
      decision: text.includes("REJECT_HANDOFF") ? "reject" : "accept",
    });
    if (text.includes("MALFORMED_HANDOFF")) decision = "not JSON";
    if (text.includes("WRONG_HANDOFF"))
      decision = JSON.stringify({ handoffId: "wrong", decision: "accept" });
    if (text.includes("QUOTED_HANDOFF")) decision = "Quote: " + decision;
    if (text.includes("TOOL_HANDOFF")) decision = "invalid tool-bearing acceptance";
    if (text.includes("WRONG_SESSION_HANDOFF")) {
      send({ event: "text", requestId: command.id, sessionId: "wrong", text: decision });
      return;
    }
    finish(decision);
    return;
  }
  if (text.startsWith("You accepted handoff")) {
    send({ event: "error", requestId: previousId, failure: "quota" });
    if (text.includes("DELAY_DRAFT")) await new Promise((resolve) => setTimeout(resolve, 400));
    if (text.includes("PERMISSION_HANDOFF")) {
      permission("handoff", "Bash", { command: "unsafe" });
      return;
    }
    finish("SPECIALIST_DRAFT");
    return;
  }
  if (text === "ALLOW" || text === "OVERLAP") {
    permission("permission", "Bash", { command: 'node -e "console.log(3243)"' });
    if (text === "OVERLAP")
      permission("extra", "AskUserQuestion", {
        questions: [{ question: "Other?", options: [{ label: "NO" }] }],
      });
    return;
  }
  if (text === "QUESTION") {
    permission("question", "AskUserQuestion", {
      questions: [
        {
          question: "Pick color",
          header: "Color",
          multiSelect: false,
          options: [{ label: "BLUE" }, { label: "RED" }],
        },
      ],
    });
    return;
  }
  finish(text === "EMPTY" ? "" : text === "ERROR_DRAFT" ? "Error: file missing" : "CLAUDE_OK");
});
