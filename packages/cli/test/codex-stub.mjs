import { createInterface } from "node:readline";

const send = (value) => {
  process.stdout.write(`${JSON.stringify(value)}\n`);
};

const threadId = "thread-stub";
let turnId = "turn-stub";

createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  const message = JSON.parse(line);
  if (message.method === "initialize") {
    send({ id: message.id, result: { protocolVersion: 1 } });
    return;
  }
  if (message.method === "initialized") {
    return;
  }
  if (message.method === "account/read") {
    send({ id: message.id, result: { account: { type: "chatgpt" } } });
    return;
  }
  if (message.method === "thread/resume") {
    if (message.params.excludeTurns !== true) throw new Error("full hydration forbidden");
    send({ id: message.id, result: { thread: { id: threadId } } });
    return;
  }
  if (message.method === "thread/turns/list") {
    send({
      id: message.id,
      result: {
        data: [
          {
            id: message.params.cursor ? "second" : "first",
            items: [{ type: "agentMessage", text: "KAT3242_OK" }],
          },
        ],
        nextCursor: message.params.cursor ? null : "page-2",
      },
    });
    return;
  }
  if (message.method === "thread/start") {
    send({ id: message.id, result: { thread: { id: threadId, model: "gpt-5.6-sol" } } });
    return;
  }
  if (message.method === "turn/start") {
    const text = message.params?.input?.[0]?.text ?? "";
    turnId = `turn-${Date.now()}`;
    if (text === "QUOTA") {
      send({ id: message.id, result: { turn: { id: turnId } } });
      send({
        method: "turn/completed",
        turn: {
          id: turnId,
          status: "failed",
          error: {
            message: "You've hit your usage limit",
            codexErrorInfo: "usageLimitExceeded",
          },
        },
      });
      return;
    }
    send({ id: message.id, result: { turn: { id: turnId } } });
    if (text === "PLAN_ONLY" || text === "PLAN_DUPLICATE") {
      send({
        method: "item/completed",
        params: {
          threadId,
          turnId,
          item: { type: "plan", id: "plan-stub", text: "# Greeting plan\n1. Draft hello." },
        },
      });
      if (text === "PLAN_DUPLICATE")
        send({
          method: "item/completed",
          params: {
            threadId,
            turnId,
            item: { type: "plan", id: "plan-stub", text: "Conflicting late plan" },
          },
        });
      send({ method: "turn/completed", turn: { id: turnId, status: "completed" } });
      return;
    }
    if (text === "OVERLAP") {
      send({
        id: "first-approval",
        method: "item/commandExecution/requestApproval",
        params: { threadId, turnId, command: "first" },
      });
      send({
        id: "second-input",
        method: "item/tool/requestUserInput",
        params: { threadId, turnId, questions: [{ id: "unexpected" }] },
      });
      return;
    }
    if (/ALLOW|DENY/.test(text)) {
      send({
        id: 0,
        method: "item/commandExecution/requestApproval",
        params: {
          threadId,
          turnId,
          command: 'python3 -c "print(3242)"',
        },
      });
      return;
    }
    if (/INPUT|CANCEL/.test(text)) {
      send({
        id: 1,
        method: "item/tool/requestUserInput",
        params: {
          threadId,
          turnId,
          questions: [{ id: "color" }],
        },
      });
      return;
    }
    send({ method: "item/completed", item: { type: "agentMessage", text: "KAT3242_OK" } });
    send({ method: "turn/completed", turn: { id: turnId, status: "completed" } });
    return;
  }
  if (message.method === "turn/interrupt") {
    send({ id: message.id, result: {} });
    send({ method: "turn/interrupted", turn: { id: turnId } });
    return;
  }
  if (message.result?.decision === "accept") {
    send({
      method: "item/completed",
      item: {
        type: "agentMessage",
        text: message.id === "first-approval" ? "FIRST_APPROVED" : "3242",
      },
    });
    send({ method: "turn/completed", turn: { id: turnId, status: "completed" } });
    return;
  }
  if (message.result?.decision === "cancel") {
    send({ method: "turn/completed", turn: { id: turnId, status: "interrupted" } });
    return;
  }
  if (message.result?.answers) {
    const color = message.result.answers.color?.answers?.[0] ?? "Blue";
    send({ method: "item/completed", item: { type: "agentMessage", text: color } });
    send({ method: "turn/completed", turn: { id: turnId, status: "completed" } });
  }
});
