import { readFileSync } from "node:fs";
import { Schema } from "effect";
import { expect, it } from "vitest";
import { normalizedHistory } from "../src/provider-contract.js";

it("matches captured Cursor tool history despite transient statuses and replay IDs", () => {
  const evidence = Schema.decodeUnknownSync(
    Schema.Struct({
      traces: Schema.Array(
        Schema.Struct({
          source: Schema.String,
          events: Schema.Array(
            Schema.Struct({
              update: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
            }),
          ),
        }),
      ),
    }),
  )(
    JSON.parse(
      readFileSync(
        new URL(
          "../../../docs/research/provider-contracts/evidence/protocol-observations.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
  const toolHistory = (source: string) => {
    const updates =
      evidence.traces
        .find((trace) => trace.source === source)
        ?.events.flatMap((event) => (event.update ? [event.update] : [])) ?? [];
    const first = updates.find((update) => update.sessionUpdate === "tool_call");
    if (!first) throw new Error("missing captured tool");
    return updates
      .filter((update) => update.toolCallId === first.toolCallId)
      .map((update) => JSON.stringify(update));
  };
  const live = toolHistory("cursor-live.jsonl"),
    replay = toolHistory("cursor-resume.jsonl");
  expect(live).toHaveLength(3);
  expect(replay).toHaveLength(2);
  expect(normalizedHistory(live)).toBe(normalizedHistory(replay));
  const user = JSON.stringify({
    sessionUpdate: "user_message_chunk",
    content: { type: "text", text: "repeat" },
  });
  const answer = JSON.stringify({
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text: "same" },
  });
  const repeated = JSON.parse(normalizedHistory([user, answer, ...live, user, answer]));
  expect(repeated.filter((entry: { text?: string }) => entry.text === "same")).toHaveLength(2);
});
