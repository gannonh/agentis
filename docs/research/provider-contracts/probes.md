# Reproduce disposable provider probes

These experiments exercise real provider processes with synthetic data. They are research artifacts for [KAT-3251](https://linear.app/kata-sh/issue/KAT-3251), not application adapters or `agentis verify launch`. Live product acceptance remains mandatory in the implementation issues.

Use the exact versions in the [matrix](README.md). Run from the repository root. [probe.py](probe.py) creates a scratch working directory, starts a provider, drains both output streams, and accepts one JSON object per input line. Python 3.10+ is sufficient. The checked host was Linux x86_64 with Python 3.14.7. Stdout shows provider messages. Stderr content is omitted and counted. The deadline kills the console-owned process group; that is **not** proof of provider cancellation or recovery.

Only send the synthetic requests below. Never enter API keys, login tokens, private prompts, or secret question answers into the console. Do not call login/logout RPCs through it. `account/read` uses the reserved id `account`, which reduces its response to the auth type. Native sessions may contain provider configuration and account metadata in other notifications. Keep raw transcripts private, then retain only the reviewed fields shown in [evidence](evidence/protocol-observations.json). Do not commit raw streams.

## Start with an explicit authentication mode

```sh
python docs/research/provider-contracts/probe.py codex --auth native --seconds 600
python docs/research/provider-contracts/probe.py cursor --auth cursor-api-key --seconds 600
```

Run these in separate terminals. `native` lets Codex own and read its existing login storage. The console does not read that storage. Hooks are disabled. The Cursor command requires `CURSOR_API_KEY` already provisioned to the provider environment; it passes the key only to the provider process. It supplies no browser token or alternate key. `--auth absent` excludes auth variables and uses a fresh disposable provider home. A scratch home does not prove complete native configuration or OS-keychain isolation.

Use a network-enabled environment. The first sandboxed Codex missing-auth turn failed on local network permissions. Repeating with network access produced real HTTP 401 failures. Do not classify a sandbox/network error as an account eligibility failure.

## Initialize and create a session

For Codex, send these lines in order and wait for each response before the dependent request.

```json
{"id":1,"method":"initialize","params":{"clientInfo":{"name":"agentis_research","version":"0.0.0"},"capabilities":{"experimentalApi":true}}}
{"method":"initialized","params":{}}
{"id":"account","method":"account/read","params":{"refreshToken":false}}
{"id":2,"method":"thread/start","params":{"cwd":"$CWD","model":"gpt-5.6-sol","approvalPolicy":"untrusted","approvalsReviewer":"user","sandbox":"read-only"}}
```

The console replaces `$CWD` with its scratch directory. Copy the returned thread id into `THREAD` placeholders below. Read the effective model/auth/config response. Stop if it differs from the intended mode. Query `model/list` and page `nextCursor` before changing model ids; the example model was available in the recorded account.

For Cursor, send these lines. The console adds the JSON-RPC 2.0 field when absent.

```json
{"id":1,"method":"initialize","params":{"protocolVersion":1,"clientInfo":{"name":"agentis-research","version":"0"},"clientCapabilities":{}}}
{"id":2,"method":"session/new","params":{"cwd":"$CWD","mcpServers":[]}}
```

Copy the returned session id into `SESSION`. The response includes available models and config options. Explicitly select the tested model only if it is listed.

```json
{"id":3,"method":"session/set_model","params":{"sessionId":"SESSION","modelId":"gpt-5.6-sol[context=272k,reasoning=medium,fast=false]"}}
```

Do not call `authenticate(cursor_login)` in this API-key experiment. The initial exploratory call attempted browser login and failed to open a browser even though the key-backed session subsequently worked. No browser flow was completed. The documented CLI-key startup path, without that call, is the selected mode. Verify that the handshake advertises protocol 1 and the required capabilities. Missing flags mean unsupported capability, not permission to fake a result. See [ACP initialization](https://agentclientprotocol.com/protocol/v1/initialization).

## Run the case matrix

Use a new request id for each client request. Server request ids have their own direction; reply to the exact received id. The ids in reply examples are placeholders.

| Case | Prompt/input | Required evidence |
| --- | --- | --- |
| Smoke | `Reply exactly KAT3251_OK. Do not call tools or access files.` | Provider text equals the marker and the turn ends successfully. |
| Allow | `Run exactly python3 -c "print(3251)" once. Request approval if required. Do not use other tools, files or integrations. If denied, stop without retrying.` | Hold the real permission request. Inspect its exact command/cwd. Approve once, then observe output `3251` and exit 0. |
| Deny | Replace `3251` with `3252` in the command. | Reject the real request. No successful command output. Observe provider terminal behavior; do not equate all providers' denial semantics. |
| Blocking input | Ask for a structured Red/Blue question and require waiting for the answer. | Real blocking server request, no turn completion while pending, selected answer delivered, resumed output. Plain text and tool-unavailable messages are failures of this proof. |
| Cancel | Start a blocking-input turn in Codex or a `print(3253)` permission request in Cursor. Keep the request pending. | Send protocol cancellation before completion; observe interrupted/cancelled terminal result and pending-request cleanup. Test child execution separately in implementation. |
| Missing credentials | Repeat initialization with `--auth absent`, then attempt the smoke turn. | Auth absent and explicit failure. Session creation or cached model listing alone is not successful inference. Never fall back to another credential. |
| Load | Stop the console, start a new one, load the recorded provider id. | Prior marker/history is readable and a new prompt can continue that same id. No hidden new session. Loading history does not prove effect recovery. |

For Codex turns, put the prompt in this envelope.

```json
{"id":10,"method":"turn/start","params":{"threadId":"THREAD","input":[{"type":"text","text":"Reply exactly KAT3251_OK. Do not call tools or access files."}]}}
```

For Cursor prompts, use this envelope.

```json
{"id":10,"method":"session/prompt","params":{"sessionId":"SESSION","prompt":[{"type":"text","text":"Reply exactly KAT3251_OK. Do not call tools or access files."}]}}
```

A Codex command approval response is `{"id":REQUEST_ID,"result":{"decision":"accept"}}`. In the recorded untrusted mode, denial was offered as `cancel`, which both declined the command and interrupted the turn. Do not offer `decline` if the live `availableDecisions` list excludes it. Do not choose persistent policy amendments or session-wide grants for these probes.

A Cursor approval response is `{"id":REQUEST_ID,"result":{"outcome":{"outcome":"selected","optionId":"allow-once"}}}`. Use `reject-once` for denial. Only select an option returned by that request. The recorded rejection yielded a `completed` tool update without a distinct rejection status; preserve the client's decision separately.

### Blocking questions and cancellation

The Codex question requires the tested experimental API and plan mode.

```json
{"id":20,"method":"turn/start","params":{"threadId":"THREAD","collaborationMode":{"mode":"plan","settings":{"model":"gpt-5.6-sol","reasoning_effort":"medium","developer_instructions":null}},"input":[{"type":"text","text":"Use request_user_input to ask me to choose Red or Blue. You must wait for the structured answer. Do not call any other tool or access files. After I answer, reply with the selected color only."}]}}
```

Wait for `item/tool/requestUserInput`, inspect its questions, and reply using the actual question id. The recorded question id was `color`.

```json
{"id":REQUEST_ID,"result":{"answers":{"color":{"answers":["Blue"]}}}}
```

For the separate cancellation case, request another question and keep it unanswered. Send the actual active turn id to `turn/interrupt`.

```json
{"id":21,"method":"turn/interrupt","params":{"threadId":"THREAD","turnId":"TURN"}}
```

Cursor documents blocking `cursor/ask_question` and `cursor/create_plan` requests. Set `session/set_mode` to `plan`, then ask the model to use `ask_question` for Red/Blue. **The recorded attempt did not emit the extension. It ended with tool-unavailable text.** This remains BLOCKED for support. Do not manufacture a server request, answer plain prose, or mark the test passed. The exact missing evidence is a documented client capability/configuration and a successful real question and plan response. Use the [official extension response shapes](https://prod.cursor.com/docs/cli/acp) when that flow is available.

For Cursor cancellation, hold an actual shell permission request, then send both the cancel notification and the cancellation response to the outstanding permission request, as required by the [ACP prompt-turn contract](https://agentclientprotocol.com/protocol/v1/prompt-turn).

```json
{"method":"session/cancel","params":{"sessionId":"SESSION"}}
{"id":REQUEST_ID,"result":{"outcome":{"outcome":"cancelled"}}}
```

Expect the outstanding `session/prompt` response to carry `stopReason: "cancelled"`. An initial number-generation attempt finished before cancellation on both providers. Codex returned `no active turn to interrupt`; Cursor had already returned `end_turn`. Those attempts are not cancellation passes. Console deadlines also expired during early pending requests; those are process-stop observations only.

### Session loading across a process boundary

After the previous console exits, start a fresh one with the same explicit auth mode. For Cursor, also pass `--state-dir PREVIOUS_SCRATCH_HOME` to reuse only the disposable provider state. Do not copy credentials.

Initialize again, then use the recorded id and original scratch working directory.

```json
{"id":30,"method":"thread/resume","params":{"threadId":"THREAD","excludeTurns":true,"approvalPolicy":"untrusted","approvalsReviewer":"user","sandbox":"read-only"}}
{"id":31,"method":"thread/turns/list","params":{"threadId":"THREAD","limit":10}}
```

The first Codex probe omitted `excludeTurns` and received full history plus a deprecation warning. The reproduction above uses the recommended paginated surface. `thread/items/list` provides item pages. Page responses until the marker is found; do not assume one page is complete.

```json
{"id":30,"method":"session/load","params":{"sessionId":"SESSION","cwd":"ORIGINAL_SCRATCH_CWD","mcpServers":[]}}
```

Cursor replays history through `session/update` before the load response. Its replay tool id differed from the original live id. Deduplication and interrupted-effect reconciliation remain implementation requirements.

## Capture versions and schema evidence

```sh
codex --version
cursor-agent --version
codex app-server generate-json-schema --out /tmp/kat3251-schema-stable
codex app-server generate-json-schema --experimental --out /tmp/kat3251-schema-experimental
```

Use fresh output directories for each run. The generated schema is tied to that binary. Record authentication mode, exact model string, effective permissions, platform, timestamps, request/turn ids, observed terminal outcomes, and unresolved cases. Keep any session records in provider-owned storage; the console preserves its scratch directory for inspection. Clean up only the exact experiment directories after reviewing the receipts. No real-resource tool mutation is part of this experiment.
