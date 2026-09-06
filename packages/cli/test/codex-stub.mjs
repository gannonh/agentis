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
  if (message.method === "thread/start") {
    send({ id: message.id, result: { thread: { id: threadId, model: "gpt-5.6-sol" } } });
    return;
  }
  if (message.method === "turn/start") {
    const text = message.params?.input?.[0]?.text ?? "";
    turnId = `turn-${Date.now()}`;
    send({ id: message.id, result: { turn: { id: turnId } } });
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
    send({ method: "item/completed", item: { type: "agentMessage", text: "3242" } });
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
