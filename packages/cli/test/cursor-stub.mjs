import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
const send = (value) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...value }) + "\n");
let promptId;
createInterface({ input: process.stdin }).on("line", async (line) => {
  const { id, method, params, result } = JSON.parse(line);
  if (id === "permission" && result) {
    if (result.outcome?.optionId === "reject-once") {
      setTimeout(() => {
        writeFileSync("denied-provider-continued", "bad");
        send({ id: promptId, result: { stopReason: "end_turn" } });
      }, 80);
      return;
    }
    send({
      method: "session/update",
      params: {
        sessionId: "cursor-session-1",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "ALLOWED" },
        },
      },
    });
    send({ id: promptId, result: { stopReason: "end_turn" } });
    return;
  }
  if ((id === "question" || id === "plan") && result) {
    send({
      method: "session/update",
      params: {
        sessionId: "cursor-session-1",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: JSON.stringify(result) },
        },
      },
    });
    send({ id: promptId, result: { stopReason: "end_turn" } });
    return;
  }
  if (method === "session/prompt") {
    const text = params.prompt[0].text;
    if (text === "QUESTION" || text === "PLAN") {
      promptId = id;
      send(
        text === "QUESTION"
          ? {
              id: "question",
              method: "cursor/ask_question",
              params: {
                toolCallId: "q-tool",
                title: "Color",
                questions: [
                  { id: "color-id", prompt: "Choose", options: [{ id: "blue-id", label: "Blue" }] },
                ],
              },
            }
          : {
              id: "plan",
              method: "cursor/create_plan",
              params: {
                toolCallId: "p-tool",
                name: "My plan",
                overview: "One change",
                plan: "Write draft",
                todos: [],
                phases: [],
              },
            },
      );
      return;
    }
    if (text === "AUTH" || text === "QUOTA") {
      send({
        id,
        error: {
          code: -32000,
          message: text === "AUTH" ? "authentication unavailable" : "quota exceeded",
        },
      });
      return;
    }
    if (text === "CRASH") {
      process.exit(17);
    }
    if (text === "MALFORMED") {
      send({ id, result: { stopReason: 17 } });
      return;
    }
    if (text === "EMPTY") {
      send({ id, result: { stopReason: "end_turn" } });
      return;
    }
  }
  if (id === "one" && result) {
    send({
      method: "session/update",
      params: {
        sessionId: "cursor-session-1",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: JSON.stringify(result) },
        },
      },
    });
    send({ id: promptId, result: { stopReason: "end_turn" } });
    return;
  }
  if (id === "two" && result) return;
  if (method === "session/prompt" && params.prompt[0].text === "OVERLAP") {
    promptId = id;
    for (const suffix of ["one", "two"])
      send({
        id: suffix,
        method: "session/request_permission",
        params: {
          sessionId: params.sessionId,
          toolCall: {
            toolCallId: suffix,
            title: `Action ${suffix}`,
            kind: "execute",
            status: "pending",
          },
          options: [
            { optionId: `allow-${suffix}`, name: "Allow", kind: "allow_once" },
            { optionId: `deny-${suffix}`, name: "Deny", kind: "reject_once" },
          ],
        },
      });
    return;
  }
  if (method === "initialize")
    send({
      id,
      result: {
        protocolVersion: 1,
        agentCapabilities: {
          loadSession: true,
          mcpCapabilities: { http: true, sse: true },
          promptCapabilities: { image: true },
        },
        authMethods: [{ id: "cursor_login", name: "Cursor" }],
      },
    });
  else if (method === "session/load") {
    await new Promise((resolve) => setTimeout(resolve, 80));
    send({
      method: "session/update",
      params: {
        sessionId: params.sessionId,
        update: { sessionUpdate: "user_message_chunk", content: { type: "text", text: "smoke" } },
      },
    });
    send({
      method: "session/update",
      params: {
        sessionId: params.sessionId,
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "CURSOR_OK" },
        },
      },
    });
    send({ id, result: {} });
  } else if (method === "session/new")
    send({
      id,
      result: {
        sessionId: "cursor-session-1",
        models: {
          currentModelId: "gpt-5.6-sol[context=272k,reasoning=medium,fast=false]",
          availableModels: [
            { modelId: "gpt-5.6-sol[context=272k,reasoning=medium,fast=false]", name: "Sol" },
          ],
        },
      },
    });
  else if (method === "session/prompt" && params.prompt[0].text === "ALLOW") {
    promptId = id;
    send({
      id: "permission",
      method: "session/request_permission",
      params: {
        sessionId: params.sessionId,
        toolCall: {
          toolCallId: "write-1",
          title: "Write scratch",
          kind: "edit",
          status: "pending",
        },
        options: [
          { optionId: "allow-once", name: "Allow", kind: "allow_once" },
          { optionId: "reject-once", name: "Deny", kind: "reject_once" },
        ],
      },
    });
  } else if (method === "session/prompt") {
    send({
      method: "session/update",
      params: {
        sessionId: params.sessionId,
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text:
              params.prompt[0].text === "ERROR_DRAFT"
                ? "Error: file missing"
                : params.prompt[0].text === "PROXY_ERROR"
                  ? "\n\nError: RetriableError: [internal] HTTPS proxy CONNECT failed: 403 Forbidden"
                  : "CURSOR_OK",
          },
        },
      },
    });
    send({ id, result: { stopReason: "end_turn" } });
  } else if (id !== undefined) send({ id, result: {} });
});
