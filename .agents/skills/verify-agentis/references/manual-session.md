# Manual verification session

Use this reference when a human drives one verification launch and needs a complete, reviewable teardown. Run from the repository root in one persistent shell/terminal; variables from these blocks do not transfer to a new shell. The launch is fake-provider only, uses an owned temporary parent, and writes evidence outside that parent so cleanup cannot remove the proof.

## Fresh preconditions and evidence

Run the install and build in a fresh checkout, then create both owned paths. The evidence path must be new; the temporary parent is the only parent passed as `TMPDIR`.

```sh
set -eu
pnpm install --frozen-lockfile
pnpm build

EVIDENCE_DIR="docs/verification/verify-agentis/manual-$(date +%s)-$$"
test ! -e "$EVIDENCE_DIR"
mkdir "$EVIDENCE_DIR"
git rev-parse HEAD > "$EVIDENCE_DIR/source-sha.txt"
{
  node --version
  pnpm --version
  node -p "require('./package.json').version"
  uname -srm
  printf '%s\n' 'provider=fake' 'executionBoundary=unverified-host-scratch'
} > "$EVIDENCE_DIR/environment.txt"

TEMP_BASE="${TMPDIR:-/tmp}"
TMP_PARENT="$(mktemp -d "${TEMP_BASE%/}/agentis-manual.XXXXXX")"
unset ENDPOINT DATA_ROOT WORKSPACE DAEMON_PID LAUNCHER_PID LOG READY_FILE

CLEANUP_DONE=0
CLEANUP_STATUS=1
cleanup_manual() {
  if [ "${CLEANUP_DONE:-0}" -eq 1 ]; then
    return "$CLEANUP_STATUS"
  fi
  CLEANUP_DONE=1
  trap - EXIT INT TERM
  (
    set +e
    cleanup_status=0
    launcher_stopped=1
    case "${LAUNCHER_PID:-}" in
      ''|*[!0-9]*) ;;
      *)
        launcher_owned=0
        launcher_expected="$(node -p process.execPath) $PWD/packages/cli/dist/bin.js verify launch"
        if kill -0 "$LAUNCHER_PID" 2>/dev/null; then
          launcher_command="$(ps -ww -p "$LAUNCHER_PID" -o command= | sed 's/^[[:space:]]*//')"
          if [ "$launcher_command" = "$launcher_expected" ]; then
            launcher_owned=1
            kill -TERM "$LAUNCHER_PID" || cleanup_status=1
          else
            cleanup_status=1
          fi
        fi
        launcher_wait=0
        while [ "$launcher_wait" -lt 50 ] && kill -0 "$LAUNCHER_PID" 2>/dev/null; do
          sleep 0.1
          launcher_wait=$((launcher_wait + 1))
        done
        if kill -0 "$LAUNCHER_PID" 2>/dev/null && [ "$launcher_owned" -eq 1 ]; then
          launcher_command="$(ps -ww -p "$LAUNCHER_PID" -o command= | sed 's/^[[:space:]]*//')"
          if [ "$launcher_command" = "$launcher_expected" ]; then
            kill -KILL "$LAUNCHER_PID" || cleanup_status=1
          else
            cleanup_status=1
          fi
          launcher_wait=0
          while [ "$launcher_wait" -lt 20 ] && kill -0 "$LAUNCHER_PID" 2>/dev/null; do
            sleep 0.1
            launcher_wait=$((launcher_wait + 1))
          done
        fi
        if kill -0 "$LAUNCHER_PID" 2>/dev/null; then
          launcher_stopped=0
          cleanup_status=1
        fi
        wait "$LAUNCHER_PID" 2>/dev/null || true
        ;;
    esac

    if [ -n "${EVIDENCE_DIR:-}" ] && [ -d "$EVIDENCE_DIR" ] && [ -d "${TMP_PARENT:-}" ]; then
      [ ! -e "$TMP_PARENT/launcher.stdout" ] || cp "$TMP_PARENT/launcher.stdout" "$EVIDENCE_DIR/launcher.stdout.log" || cleanup_status=1
      [ ! -e "$TMP_PARENT/launcher.stderr" ] || cp "$TMP_PARENT/launcher.stderr" "$EVIDENCE_DIR/launcher.stderr.log" || cleanup_status=1
    fi

    if [ -n "${TMP_PARENT:-}" ] && [ -d "$TMP_PARENT" ]; then
      TMP_PARENT="${TMP_PARENT:-}" DATA_ROOT="${DATA_ROOT:-}" ENDPOINT="${ENDPOINT:-}" DAEMON_PID="${DAEMON_PID:-}" EVIDENCE_DIR="${EVIDENCE_DIR:-}" LAUNCHER_STOPPED="$launcher_stopped" node --input-type=module <<'NODE'
import { spawnSync } from "node:child_process";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { existsSync, lstatSync, readdirSync, realpathSync, rmSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";

const env = process.env;
const parentPath = resolve(env.TMP_PARENT);
const repo = resolve(process.cwd());
const cli = resolve(repo, "packages/cli/dist/bin.js");
const errors = [];
const startupInspection = [];
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const within = (root, target) => {
  const suffix = relative(resolve(root), resolve(target));
  return suffix !== "" && suffix !== ".." && !suffix.startsWith(`..${sep}`) && !isAbsolute(suffix);
};
const processAt = (pid) => {
  const result = spawnSync("ps", ["-ww", "-p", String(pid), "-o", "command="], { encoding: "utf8" });
  if (result.error) return { known: false, error: String(result.error) };
  const command = String(result.stdout ?? "").trim();
  if (!command && result.status !== 0) return { known: true, exists: false, command: "" };
  if (!command) return { known: false, error: "ps returned no command" };
  return { known: true, exists: true, command };
};
const scan = (root, rootPath) => {
  const result = spawnSync("ps", ["-ww", "-axo", "pid=,command="], { encoding: "utf8" });
  if (result.error || result.status !== 0) throw new Error(`process census failed: ${String(result.error ?? `ps exited ${result.status}`)}`);
  const owned = [];
  const unknown = [];
  const references = [root, rootPath].filter((item, index, all) => item && all.indexOf(item) === index);
  const prefix = `${process.execPath} ${cli} serve --endpoint `;
  const suffix = " --provider fake --execution-boundary unverified-host-scratch --profile verify";
  for (const line of String(result.stdout ?? "").split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(.+)$/);
    if (!match) continue;
    const [, pidText, command] = match;
    if (!references.some((reference) => command.includes(reference))) continue;
    let candidate;
    for (const dataRoot of [rootPath, root].filter((item, index, all) => item && all.indexOf(item) === index)) {
      const tail = ` --data-root ${dataRoot}${suffix}`;
      if (!command.startsWith(prefix) || !command.endsWith(tail)) continue;
      const endpoint = command.slice(prefix.length, command.length - tail.length);
      try {
        const parsed = new URL(endpoint);
        if (!parsed.port || !["127.0.0.1", "localhost"].includes(parsed.hostname) || realpathSync(dataRoot) !== root) continue;
        candidate = { pid: Number(pidText), endpoint, dataRoot, command };
      } catch {}
      break;
    }
    if (candidate) owned.push(candidate);
    else unknown.push({ pid: Number(pidText), command });
  }
  return { owned, unknown };
};
const endpointUp = async (endpoint) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 750);
  try {
    const response = await fetch(new URL("/v1/health", endpoint), { signal: controller.signal });
    await response.arrayBuffer();
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};
const stop = async (candidate) => {
  let state = processAt(candidate.pid);
  if (!state.known) throw new Error(`cannot inspect daemon ${candidate.pid}: ${state.error}`);
  if (!state.exists) return true;
  if (state.command !== candidate.command) throw new Error(`daemon ${candidate.pid} changed ownership`);
  try {
    process.kill(candidate.pid, "SIGTERM");
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await wait(100);
    state = processAt(candidate.pid);
    if (!state.known) throw new Error(`cannot inspect daemon ${candidate.pid}: ${state.error}`);
    if (!state.exists) return true;
  }
  state = processAt(candidate.pid);
  if (!state.known) throw new Error(`cannot inspect daemon ${candidate.pid}: ${state.error}`);
  if (!state.exists) return true;
  if (state.command !== candidate.command) throw new Error(`daemon ${candidate.pid} changed ownership`);
  process.kill(candidate.pid, "SIGKILL");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await wait(100);
    state = processAt(candidate.pid);
    if (!state.known) throw new Error(`cannot inspect daemon ${candidate.pid}: ${state.error}`);
    if (!state.exists) return true;
  }
  return false;
};

let parentReal;
try {
  parentReal = realpathSync(parentPath);
  if (!basename(parentReal).startsWith("agentis-manual.")) throw new Error("temporary parent is not owned");
} catch (error) {
  errors.push(String(error));
}
const roots = [];
if (parentReal) {
  for (const entry of readdirSync(parentReal, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("agentis-verify-")) continue;
    const rootPath = join(parentPath, entry.name);
    try {
      const root = realpathSync(join(parentReal, entry.name));
      if (!within(parentReal, root)) throw new Error(`data root escaped temporary parent: ${root}`);
      roots.push({ root, rootPath });
    } catch (error) {
      errors.push(String(error));
    }
  }
}
const knownRoot = env.DATA_ROOT ? roots.find((item) => item.root === (() => { try { return realpathSync(env.DATA_ROOT); } catch { return ""; } })()) : undefined;
for (const item of roots) {
  let state;
  try {
    state = scan(item.root, item.rootPath);
    const record = { root: item.root, rootPath: item.rootPath, before: state, terminated: [] };
    startupInspection.push(record);
    if (state.unknown.length) throw new Error(`unknown process references owned root: ${item.root}`);
    for (const candidate of state.owned) {
      record.terminated.push({ pid: candidate.pid, endpoint: candidate.endpoint, signal: "SIGTERM" });
      if (!(await stop(candidate))) throw new Error(`daemon ${candidate.pid} did not disappear`);
      if (await endpointUp(candidate.endpoint)) throw new Error(`endpoint remained reachable: ${candidate.endpoint}`);
    }
    state = scan(item.root, item.rootPath);
    record.after = state;
    if (state.unknown.length || state.owned.length) throw new Error(`owned process remained for ${item.root}`);
  } catch (error) {
    errors.push(String(error));
  }
}
if (env.ENDPOINT && await endpointUp(env.ENDPOINT)) errors.push(`endpoint remained reachable: ${env.ENDPOINT}`);
if (env.LAUNCHER_STOPPED !== "1") errors.push("launcher did not stop within bounded wait");
let removed = false;
if (!errors.length && parentReal) {
  try {
    for (const item of roots) {
      rmSync(item.root, { recursive: true, force: false });
      if (existsSync(item.root)) throw new Error(`data root remained: ${item.root}`);
    }
    for (const name of ["launcher.stdout", "launcher.stderr"]) {
      const path = join(parentReal, name);
      if (existsSync(path)) {
        if (!lstatSync(path).isFile()) throw new Error(`temporary stream is not a file: ${path}`);
        unlinkSync(path);
      }
    }
    if (readdirSync(parentReal).length) throw new Error("temporary parent contains unknown files");
    rmdirSync(parentReal);
    removed = !existsSync(parentPath);
    if (!removed) throw new Error("temporary parent remained");
  } catch (error) {
    errors.push(String(error));
  }
}
const cleanup = {
  recordedAt: new Date().toISOString(),
  launcherStopped: env.LAUNCHER_STOPPED === "1",
  daemonStopped: knownRoot ? !errors.length : null,
  endpointUnreachable: env.ENDPOINT ? !(await endpointUp(env.ENDPOINT)) : null,
  startupInspection,
  temporaryParent: parentPath,
  temporaryParentExists: existsSync(parentPath),
  removed,
  preservedTemporaryParent: existsSync(parentPath),
  errors,
  ok: !errors.length && env.LAUNCHER_STOPPED === "1" && removed,
};
if (env.EVIDENCE_DIR) writeFileSync(join(env.EVIDENCE_DIR, "cleanup.json"), `${JSON.stringify(cleanup, null, 2)}\n`);
process.exitCode = cleanup.ok ? 0 : 1;
NODE
      [ "$?" -eq 0 ] || cleanup_status=1
    fi
    exit "$cleanup_status"
  )
  CLEANUP_STATUS=$?
  return "$CLEANUP_STATUS"
}
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'manual_exit_status=$?; if ! cleanup_manual && [ "$manual_exit_status" -eq 0 ]; then manual_exit_status=1; fi; exit "$manual_exit_status"' EXIT
```

`EVIDENCE_DIR` and `TMP_PARENT` belong to this session. Do not reuse either path for another launch. After a new launch, rebind every value below from its new readiness object, including `ENDPOINT`, `DATA_ROOT`, `WORKSPACE`, `DAEMON_PID`, and `LAUNCHER_PID`.

## Launch and bounded readiness

`verify launch` stays in the foreground. Background this one process only so the shell can retain its PID; it creates the daemon and emits one JSON readiness object. The loop waits at most 10 seconds for that object and then at most 5 seconds for `/v1/health`.

```sh
: > "$TMP_PARENT/launcher.stdout"
: > "$TMP_PARENT/launcher.stderr"
TMPDIR="$TMP_PARENT" "$(node -p process.execPath)" "$PWD/packages/cli/dist/bin.js" verify launch \
  > "$TMP_PARENT/launcher.stdout" \
  2> "$TMP_PARENT/launcher.stderr" &
LAUNCHER_PID=$!
READY_FILE="$EVIDENCE_DIR/readiness.json"
READY_TARGET="$READY_FILE.tmp"
READY_FOUND=0
READY_ATTEMPT=1
while [ "$READY_ATTEMPT" -le 100 ]; do
  rm -f "$READY_TARGET"
  if READY_SOURCE="$TMP_PARENT/launcher.stdout" READY_TARGET="$READY_TARGET" node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from "node:fs";

try {
  const value = JSON.parse(readFileSync(process.env.READY_SOURCE, "utf8"));
  for (const key of ["endpoint", "pid", "dataRoot", "log", "workspace"]) {
    if (!(key in value)) throw new Error(`readiness missing ${key}`);
  }
  if (typeof value.endpoint !== "string" || !Number.isInteger(value.pid)) {
    throw new Error("readiness endpoint or pid is malformed");
  }
  writeFileSync(process.env.READY_TARGET, `${JSON.stringify(value, null, 2)}\n`);
} catch {
  process.exitCode = 1;
}
NODE
  then
    mv "$READY_TARGET" "$READY_FILE"
    READY_FOUND=1
    break
  fi
  if ! kill -0 "$LAUNCHER_PID" 2>/dev/null; then
    break
  fi
  sleep 0.1
  READY_ATTEMPT=$((READY_ATTEMPT + 1))
done
test "$READY_FOUND" -eq 1

ENDPOINT="$(READY_FILE="$READY_FILE" node --input-type=module -e 'import { readFileSync } from "node:fs"; process.stdout.write(JSON.parse(readFileSync(process.env.READY_FILE, "utf8")).endpoint)')"
DATA_ROOT="$(READY_FILE="$READY_FILE" node --input-type=module -e 'import { readFileSync } from "node:fs"; process.stdout.write(JSON.parse(readFileSync(process.env.READY_FILE, "utf8")).dataRoot)')"
WORKSPACE="$(READY_FILE="$READY_FILE" node --input-type=module -e 'import { readFileSync } from "node:fs"; process.stdout.write(JSON.parse(readFileSync(process.env.READY_FILE, "utf8")).workspace)')"
LOG="$(READY_FILE="$READY_FILE" node --input-type=module -e 'import { readFileSync } from "node:fs"; process.stdout.write(JSON.parse(readFileSync(process.env.READY_FILE, "utf8")).log)')"
DAEMON_PID="$(READY_FILE="$READY_FILE" node --input-type=module -e 'import { readFileSync } from "node:fs"; process.stdout.write(String(JSON.parse(readFileSync(process.env.READY_FILE, "utf8")).pid))')"

case "$DATA_ROOT" in
  "$TMP_PARENT"/agentis-verify-*) ;;
  *) echo "dataRoot is outside this launch parent" >&2; exit 1 ;;
esac
test "$WORKSPACE" = "$DATA_ROOT/scratch"
test "$LOG" = "$DATA_ROOT/daemon.log"
case "$DAEMON_PID" in
  ''|*[!0-9]*) echo "daemon pid is malformed" >&2; exit 1 ;;
esac
kill -0 "$DAEMON_PID"
{
  printf 'ENDPOINT=%s\n' "$ENDPOINT"
  printf 'DATA_ROOT=%s\n' "$DATA_ROOT"
  printf 'WORKSPACE=%s\n' "$WORKSPACE"
  printf 'DAEMON_PID=%s\n' "$DAEMON_PID"
  printf 'LAUNCHER_PID=%s\n' "$LAUNCHER_PID"
  printf 'LOG=%s\n' "$LOG"
} > "$EVIDENCE_DIR/launch-bindings.txt"

if ENDPOINT="$ENDPOINT" node --input-type=module -e 'const response = await fetch(new URL("/v1/health", process.env.ENDPOINT), { signal: AbortSignal.timeout(5000) }); const body = await response.json(); if (!response.ok || body.ok !== true) process.exit(1); process.stdout.write(JSON.stringify(body) + "\n")' > "$EVIDENCE_DIR/health.json" 2> "$EVIDENCE_DIR/health.stderr"; then
  HEALTH_FOUND=1
else
  HEALTH_FOUND=0
fi
test "$HEALTH_FOUND" -eq 1
```

The five variables are now bound to this launch. The endpoint is explicit and loopback; never guess its port. The persisted files are read-only identity checks before any control command:

```sh
PERSISTED_ENDPOINT="$(tr -d '\n' < "$DATA_ROOT/endpoint")"
PERSISTED_PID="$(tr -d '\n' < "$DATA_ROOT/pid")"
test "$PERSISTED_ENDPOINT" = "$ENDPOINT"
test "$PERSISTED_PID" = "$DAEMON_PID"
DAEMON_COMMAND="$(ps -ww -p "$DAEMON_PID" -o command= | sed 's/^[[:space:]]*//')"
EXPECTED_COMMAND="$(node -p process.execPath) $PWD/packages/cli/dist/bin.js serve --endpoint $ENDPOINT --data-root $DATA_ROOT --provider fake --execution-boundary unverified-host-scratch --profile verify"
test "$DAEMON_COMMAND" = "$EXPECTED_COMMAND"
```

## Owner check and public drive

Run the owner-token check before `doctor`; this check is read-only, while `doctor` otherwise calls `loadOrCreateOwner` and can create a credential. Then capture the public health/status result and smoke receipt in the fresh evidence directory.

```sh
node --input-type=module -e '
import { readFileSync, statSync } from "node:fs";
const path = process.argv[1];
const mode = statSync(path).mode & 0o777;
const owner = JSON.parse(readFileSync(path, "utf8"));
if (mode !== 0o600 || typeof owner.sessionId !== "string" || typeof owner.token !== "string" || owner.token.length === 0) {
  throw new Error("owner.token is missing, not 0600, or malformed");
}
process.stdout.write("owner.token precheck ok\n");
' "$DATA_ROOT/owner.token" > "$EVIDENCE_DIR/owner-precheck.txt"

node packages/cli/dist/bin.js doctor \
  --endpoint "$ENDPOINT" \
  --data-root "$DATA_ROOT" \
  > "$EVIDENCE_DIR/doctor.json"
node packages/cli/dist/bin.js task submit \
  --endpoint "$ENDPOINT" \
  --data-root "$DATA_ROOT" \
  --brief "verification-smoke" \
  --fixture smoke \
  > "$EVIDENCE_DIR/submit.json"
node packages/cli/dist/bin.js doctor \
  --endpoint "$ENDPOINT" \
  --data-root "$DATA_ROOT" \
  > "$EVIDENCE_DIR/status.json"
```

Record the exact commands above with the source SHA and environment file. The expected fixture artifact bytes are `# verification-smoke\n`; read its regular file below `WORKSPACE` and record the actual bytes, byte count, SHA-256, public `byteSize`, public `sha256`, expected result, observed result, and `PASS`/`FAIL`/`UNVERIFIED` verdict. This fake fixture verdict remains separate from live-provider support.

## Artifact byte and hash check

Set `RUN_ID` from the accepted submit receipt and set `EXPECTED_BRIEF` to the expected brief (`EXPECTED_BRIEF="verification-smoke"` for smoke), then select the matching public artifact row from the captured status. The check reads only the regular file below this launch's workspace and writes the observed bytes, byte count, hashes, expected result, and verdict to evidence.

```sh
SUBMIT_FILE="${SUBMIT_FILE:-$EVIDENCE_DIR/submit.json}"
RUN_ID="$(SUBMIT_FILE="$SUBMIT_FILE" node --input-type=module -e 'import { readFileSync } from "node:fs"; process.stdout.write(JSON.parse(readFileSync(process.env.SUBMIT_FILE, "utf8")).runId)')"
EXPECTED_BRIEF="${EXPECTED_BRIEF:-verification-smoke}"
STATUS_FILE="${STATUS_FILE:-$EVIDENCE_DIR/status.json}"
RUN_ID="$RUN_ID" STATUS_FILE="$STATUS_FILE" ARTIFACT_ROW="$EVIDENCE_DIR/artifact-row.json" node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from "node:fs";

const document = JSON.parse(readFileSync(process.env.STATUS_FILE, "utf8"));
const snapshot = document.status ?? document;
const row = snapshot.artifacts?.find((item) => item.runId === process.env.RUN_ID);
if (!row) throw new Error("no artifact row for RUN_ID");
writeFileSync(process.env.ARTIFACT_ROW, `${JSON.stringify(row, null, 2)}\n`);
NODE

DATA_ROOT="$DATA_ROOT" WORKSPACE="$WORKSPACE" EXPECTED_BRIEF="$EXPECTED_BRIEF" ARTIFACT_ROW="$EVIDENCE_DIR/artifact-row.json" node --input-type=module <<'NODE' > "$EVIDENCE_DIR/artifact-check.json"
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

const row = JSON.parse(readFileSync(process.env.ARTIFACT_ROW, "utf8"));
const dataRoot = realpathSync(process.env.DATA_ROOT);
const workspace = realpathSync(process.env.WORKSPACE);
if (workspace !== resolve(dataRoot, "scratch")) throw new Error("workspace escaped data root");
const path = realpathSync(row.path);
if (!path.startsWith(`${workspace}/`)) throw new Error("artifact escaped workspace");
if (!lstatSync(path).isFile()) throw new Error("artifact is not a regular file");
const bytes = readFileSync(path);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const expected = Buffer.from(`# ${process.env.EXPECTED_BRIEF ?? ""}\n`);
const matches = bytes.byteLength === row.byteSize && sha256 === row.sha256 && bytes.equals(expected);
process.stdout.write(`${JSON.stringify({
  path,
  mediaType: row.mediaType,
  publicByteSize: row.byteSize,
  bytesRead: bytes.byteLength,
  publicSha256: row.sha256,
  sha256,
  expectedBytes: expected.toString(),
  observedBytes: bytes.toString(),
  expected: expected.toString(),
  observed: matches ? "matching regular file, byte count, SHA-256, and body" : "artifact comparison failed",
  verdict: matches ? "PASS" : "FAIL",
}, null, 2)}\n`);
if (!matches) process.exitCode = 1;
NODE
```

## Bounded cleanup and retained evidence

The first block installs an EXIT trap before launch. It persists launcher streams, stops the retained launcher, checks the exact daemon argv, handles startup roots with an exact `ps -ww` census, and removes only validated owned state. Every wait is bounded; unknown processes keep the temporary parent in place. The final block runs the cleanup function once and verifies retained evidence.

```sh
if cleanup_manual; then
  :
else
  echo "bounded cleanup failed; temporary state was retained" >&2
  exit 1
fi
test ! -e "$DATA_ROOT"
test ! -e "$TMP_PARENT"
test -s "$EVIDENCE_DIR/readiness.json"
test -s "$EVIDENCE_DIR/launch-bindings.txt"
test -s "$EVIDENCE_DIR/doctor.json"
test -s "$EVIDENCE_DIR/submit.json"
test -s "$EVIDENCE_DIR/status.json"
test -s "$EVIDENCE_DIR/cleanup.json"
printf "Manual launch, doctor, artifact and cleanup PASS\n"
```

If a bounded wait fails, retain the evidence and do not broaden the kill or removal target. A later launch starts with a new evidence directory and temporary parent, and rebinds every launch variable from its new readiness object.
