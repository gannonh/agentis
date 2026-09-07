import { claudeResultText } from "./claude-result.js";
import {
  query,
  getSessionInfo,
  getSessionMessages,
  type PermissionResult,
} from "@anthropic-ai/claude-agent-sdk";
import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";

const send = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`);
const pending = new Map<string, (value: PermissionResult) => void>();
let busy = false;
const draftOnly = process.env.CLAUDE_DRAFT_ONLY === "1";
const tools = draftOnly ? [] : ["Bash", "AskUserQuestion"];
const key = readFileSync("/provider-auth/api-key", "utf8").trim();
if (!key) process.exit(77);
const home = process.env.HOME ?? "/provider-home";
process.env.CLAUDE_CONFIG_DIR = home;
const history = async (sessionId: string) => {
  if (!(await getSessionInfo(sessionId, { dir: "/workspace" })))
    throw new Error("invalid missing session");
  const messages = await getSessionMessages(sessionId, { dir: "/workspace", limit: 1001 });
  if (!messages.length || messages.length > 1000) throw new Error("invalid session history length");
  return messages.map(
    ({ type, uuid, session_id, message, parent_tool_use_id, parent_agent_id }) => {
      if (session_id !== sessionId || parent_tool_use_id || parent_agent_id)
        throw new Error("invalid delegated session history");
      return { type, uuid, session_id, message };
    },
  );
};
createInterface({ input: process.stdin }).on("line", (line) => {
  let requestId: unknown;
  void (async () => {
    const command = JSON.parse(line);
    requestId = command.id;
    if (command.kind === "permission") {
      pending.get(command.id)?.(command.result);
      pending.delete(command.id);
      return;
    }
    if (busy) throw new Error("invalid concurrent bridge command");
    busy = true;
    try {
      if (command.kind === "load") {
        send({
          id: command.id,
          sessionId: command.sessionId,
          history: await history(command.sessionId),
        });
        return;
      }
      if (command.kind !== "prompt" || typeof command.text !== "string")
        throw new Error("invalid bridge command");
      let sessionId: string | undefined = command.sessionId;
      let resultText = "";
      const controller = new AbortController();
      const stream = query({
        prompt: command.text,
        options: {
          cwd: "/workspace",
          model: "claude-sonnet-5",
          effort: "medium",
          settingSources: [],
          tools,
          disallowedTools: ["Agent", "Task"],
          permissionMode: "default",
          permissionPrompts: "host",
          mcpServers: {},
          agents: {},
          maxTurns: 20,
          maxBudgetUsd: 2,
          abortController: controller,
          hooks: {
            PreToolUse: [
              {
                matcher: "^Bash$",
                hooks: [
                  async () => ({
                    hookSpecificOutput: {
                      hookEventName: "PreToolUse",
                      permissionDecision: "ask",
                      permissionDecisionReason: "Agentis owner approval required",
                    },
                  }),
                ],
              },
            ],
          },
          ...(sessionId ? { resume: sessionId } : {}),
          env: {
            PATH: "/usr/local/bin:/usr/bin:/bin",
            HOME: home,
            CLAUDE_CONFIG_DIR: home,
            ANTHROPIC_API_KEY: key,
            HTTPS_PROXY: "http://provider-proxy:3128",
            HTTP_PROXY: "http://provider-proxy:3128",
            CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
          },
          canUseTool: (name, input, context) =>
            new Promise<PermissionResult>((resolve) => {
              if (draftOnly || !tools.includes(name) || pending.size) {
                resolve({ behavior: "deny", message: "Tool is unavailable", interrupt: true });
                return;
              }
              pending.set(context.toolUseID, resolve);
              context.signal.addEventListener(
                "abort",
                () => {
                  pending.delete(context.toolUseID);
                  resolve({ behavior: "deny", message: "Canceled", interrupt: true });
                },
                { once: true },
              );
              send({
                event: "permission",
                requestId: command.id,
                sessionId,
                id: context.toolUseID,
                name,
                input,
              });
            }),
        },
      });
      try {
        for await (const message of stream) {
          if (message.type === "system" && message.subtype === "init") {
            if (
              message.model !== "claude-sonnet-5" ||
              message.apiKeySource !== "ANTHROPIC_API_KEY" ||
              message.tools.length !== tools.length ||
              message.tools.some((tool) => !tools.includes(tool))
            )
              throw new Error("unsupported native tool inventory or model/auth");
            if (sessionId && sessionId !== message.session_id)
              throw new Error("invalid resumed session");
            sessionId = message.session_id;
            send({
              event: "init",
              requestId: command.id,
              sessionId,
              tools: message.tools,
              model: message.model,
              apiKeySource: message.apiKeySource,
            });
          }
          if (message.type === "assistant") {
            for (const block of message.message.content) {
              if (block.type === "text")
                send({ event: "text", requestId: command.id, sessionId, text: block.text });
              if (block.type === "tool_use" && !tools.includes(block.name))
                throw new Error("invalid native tool use");
            }
          }
          if (message.type === "result") {
            resultText = claudeResultText(message);
          }
        }
      } finally {
        stream.close();
      }
      if (!sessionId || !resultText.trim()) throw new Error("malformed empty result");
      send({ id: command.id, sessionId, text: resultText, history: await history(sessionId) });
    } finally {
      busy = false;
    }
  })().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const failure = /auth|credential|api.key|401/i.test(message)
      ? "auth-unavailable"
      : /quota|429|rate.limit|credit balance/i.test(message)
        ? "quota"
        : /invalid|malformed|json/i.test(message)
          ? "malformed-response"
          : /unsupported/i.test(message)
            ? "unsupported-capability"
            : "provider-error";
    send({ event: "error", requestId, failure });
  });
});
