#!/usr/bin/env python3
"""Disposable protocol console. Run only with synthetic inputs in its scratch cwd."""

import argparse
import json
import os
from pathlib import Path
import queue
import signal
import subprocess
import sys
import tempfile
import threading
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("provider", choices=["codex", "cursor"])
parser.add_argument("--auth", choices=["absent", "native", "cursor-api-key"], default="absent")
parser.add_argument("--seconds", type=int, default=60)
parser.add_argument("--state-dir", type=Path, help="Reuse a previous disposable home for session-load probes")
args = parser.parse_args()
if args.auth == "cursor-api-key" and args.provider != "cursor":
    parser.error("cursor-api-key requires cursor")
if args.auth == "cursor-api-key" and not os.environ.get("CURSOR_API_KEY"):
    parser.error("CURSOR_API_KEY must be provisioned to the provider environment")

scratch = Path(tempfile.mkdtemp(prefix="kat3251-"))
state = args.state_dir.resolve() if args.state_dir else scratch
env = {"PATH": os.environ["PATH"], "HOME": str(state), "NO_OPEN_BROWSER": "1"}
if args.auth == "native":
    env["HOME"] = str(Path.home())
elif args.auth == "cursor-api-key":
    env["CURSOR_API_KEY"] = os.environ["CURSOR_API_KEY"]
if args.auth != "native":
    env.update(XDG_CONFIG_HOME=str(state / "config"), CODEX_HOME=str(state / "codex"))
    (state / "codex").mkdir(exist_ok=True)
command = (["codex", "--disable", "hooks", "app-server", "--listen", "stdio://"]
           if args.provider == "codex" else ["cursor-agent", "acp"])
proc = subprocess.Popen(command, cwd=scratch, env=env, stdin=subprocess.PIPE,
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                        text=True, start_new_session=True)
events = queue.Queue()


def read_stream(stream, kind):
    for line in stream:
        events.put((kind, line.rstrip()))
    events.put((kind + "-closed", ""))


for stream, kind in [(proc.stdout, "provider"), (proc.stderr, "stderr")]:
    threading.Thread(target=read_stream, args=(stream, kind), daemon=True).start()
threading.Thread(target=read_stream, args=(sys.stdin, "client"), daemon=True).start()
print(json.dumps({"event": "start", "pid": proc.pid, "cwd": str(scratch),
                  "argv": command, "auth": args.auth, "deadlineSeconds": args.seconds}), flush=True)
print('Send JSON objects on stdin. Replace "$CWD" with the reported scratch path.', flush=True)
deadline = time.monotonic() + args.seconds
stderr_lines = 0
provider_closed = False
stderr_closed = False
try:
    while time.monotonic() < deadline:
        try:
            kind, line = events.get(timeout=min(0.2, max(0.001, deadline - time.monotonic())))
        except queue.Empty:
            if proc.poll() is not None:
                break
            continue
        if kind == "client":
            message = json.loads(line.replace("$CWD", str(scratch)))
            if "jsonrpc" not in message and args.provider == "cursor":
                message["jsonrpc"] = "2.0"
            proc.stdin.write(json.dumps(message) + "\n")
            proc.stdin.flush()
        elif kind == "provider":
            message = json.loads(line)
            if message.get("id") == "account":
                account = message.get("result", {}).get("account")
                message = {"id": "account", "accountType": account.get("type") if account else None,
                           "requiresOpenaiAuth": message.get("result", {}).get("requiresOpenaiAuth")}
            print(json.dumps(message), flush=True)
        elif kind == "stderr":
            stderr_lines += 1
        elif kind == "provider-closed":
            provider_closed = True
        elif kind == "stderr-closed":
            stderr_closed = True
        if provider_closed and stderr_closed:
            break
except (KeyboardInterrupt, BrokenPipeError):
    pass
finally:
    drain_deadline = time.monotonic() + 1.0
    while not (provider_closed and stderr_closed) and time.monotonic() < drain_deadline:
        try:
            kind, line = events.get(timeout=min(0.1, max(0.001, drain_deadline - time.monotonic())))
        except queue.Empty:
            break
        if kind == "stderr":
            stderr_lines += 1
        elif kind == "stderr-closed":
            stderr_closed = True
        elif kind == "provider-closed":
            provider_closed = True
    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        pass
    try:
        os.killpg(proc.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    proc.wait()
    print(json.dumps({"event": "console-stopped", "exit": proc.returncode,
                      "stderrLinesOmitted": stderr_lines, "scratchPreserved": str(scratch)}), flush=True)
