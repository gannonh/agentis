#!/usr/bin/env python3
import hashlib
import http.server
import json
import os
from pathlib import Path
import platform
import secrets
import select
import shutil
import signal
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request


def request(url, token=None, data=None):
    headers = {"Authorization": "Bearer " + token} if token else {}
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers), timeout=3) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code


def live_group(group):
    if sys.platform != "linux":
        return None
    members = []
    for path in Path("/proc").glob("[0-9]*/stat"):
        try:
            fields = path.read_text().rsplit(")", 1)[1].split()
            if int(fields[2]) == group and fields[0] != "Z":
                members.append(int(path.parent.name))
        except (FileNotFoundError, ProcessLookupError):
            pass
    return members


def stop_group(process):
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    process.wait(timeout=5)
    for _ in range(50):
        remaining = live_group(process.pid)
        if not remaining:
            return remaining
        time.sleep(0.02)
    raise RuntimeError("live processes remain in disposable group")


def worker(root, endpoint, stop_at):
    db = sqlite3.connect(root / "local.sqlite")
    child = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"], stdout=subprocess.DEVNULL)

    def checkpoint(name):
        if name == stop_at:
            print(json.dumps({"boundary": name, "child": child.pid}), flush=True)
            sys.stdin.readline()

    checkpoint("after_launch")
    db.execute("CREATE TABLE action (state TEXT NOT NULL, receipt INTEGER)")
    db.execute("INSERT INTO action VALUES ('pending', NULL)")
    db.commit()
    checkpoint("waiting_approval")
    db.execute("UPDATE action SET state='approved'")
    db.commit()
    checkpoint("approval_persisted")
    db.execute("UPDATE action SET state='dispatching'")
    db.commit()
    checkpoint("before_external")
    with urllib.request.urlopen(urllib.request.Request(endpoint + "/effect", data=b"synthetic append"), timeout=3) as response:
        receipt = json.load(response)["receipt"]
    checkpoint("external_accepted")
    db.execute("UPDATE action SET state='recorded', receipt=?", (receipt,))
    db.commit()
    checkpoint("receipt_persisted")
    db.execute("UPDATE action SET state='completed'")
    db.commit()
    checkpoint("before_delivery")
    child.terminate()
    child.wait()


def main():
    results = []

    def record(case, expected, observed, verdict="PASS"):
        results.append(dict(case=case, expected=expected, observed=observed, verdict=verdict))

    with tempfile.TemporaryDirectory(prefix="agentis-kat-3252-") as directory:
        root = Path(directory)
        owner = root / "owner"
        owner.mkdir(mode=0o700)
        token = secrets.token_hex(32)
        secret = owner / "session"
        secret.write_text(token)
        secret.chmod(0o600)
        native_config = owner / "native-mcp.json"
        native_config.write_text(json.dumps({"mcpServers": {"synthetic": {"command": sys.executable}}}))
        native_config.chmod(0o600)
        workspace = root / "workspace"
        workspace.mkdir()
        inherited = dict(os.environ, AGENTIS_PROBE_OWNER_TOKEN=token, AGENTIS_PROBE_CONFIG=str(native_config))
        clean = {"PATH": "/usr/bin:/bin", "LANG": "C"}
        read_code = "import pathlib,sys; print(pathlib.Path(sys.argv[1]).read_text()==sys.argv[2])"
        for label, environment in [("inherited", inherited), ("sanitized", clean)]:
            child = subprocess.run([sys.executable, "-c", read_code, str(secret), token], cwd=workspace,
                                   env=environment, capture_output=True, text=True, check=True)
            record("credential_read_" + label, "same UID can read synthetic mode-0600 owner file",
                   child.stdout.strip() == "True", "PASS" if child.stdout.strip() == "True" else "FAIL")
            output = subprocess.check_output([sys.executable, "-c", "import os; print('AGENTIS_PROBE_OWNER_TOKEN' in os.environ)"], env=environment, text=True)
            record("environment_" + label, "synthetic token inherited only in inherited mode", output.strip(),
                   "PASS" if (output.strip() == "True") == (label == "inherited") else "FAIL")
        config_read = subprocess.check_output([sys.executable, "-c", "import json,pathlib,sys; print('synthetic' in json.loads(pathlib.Path(sys.argv[1]).read_text())['mcpServers'])", str(native_config)], env=clean, text=True).strip()
        record("native_config_read", "same UID can read synthetic MCP command configuration", config_read,
               "PASS" if config_read == "True" else "FAIL")

        seen = []
        external = root / "external.sqlite"
        with sqlite3.connect(external) as db:
            db.execute("CREATE TABLE effects (id INTEGER PRIMARY KEY, body TEXT)")

        class Handler(http.server.BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                if self.path == "/browser":
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html")
                    self.send_header("Set-Cookie", "synthetic_owner=" + token + "; HttpOnly; SameSite=Strict; Path=/")
                    self.end_headers()
                    self.wfile.write(b"<script>fetch('/admin').then(r=>r.text()).then(t=>document.body.innerText=t)</script><body>pending</body>")
                    return
                allowed = self.headers.get("Authorization") == "Bearer " + token or self.headers.get("Cookie") == "synthetic_owner=" + token
                seen.append({"path": self.path, "authorized": allowed, "origin": self.headers.get("Origin")})
                self.send_response(200 if allowed else 401)
                self.end_headers()
                self.wfile.write(b"synthetic-owner-access" if allowed else b"denied")

            def do_POST(self):
                body = self.rfile.read(int(self.headers["Content-Length"])).decode()
                with sqlite3.connect(external) as db:
                    receipt = db.execute("INSERT INTO effects(body) VALUES (?)", (body,)).lastrowid
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"receipt": receipt}).encode())

        try:
            server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        except OSError as error:
            record("loopback_and_crash_probes", "local synthetic HTTP server starts", type(error).__name__, "UNVERIFIED")
        else:
            threading.Thread(target=server.serve_forever, daemon=True).start()
            endpoint = "http://127.0.0.1:" + str(server.server_port)
            try:
                for name, credential, expected in [("unauthenticated", None, 401), ("bot", "synthetic-bot", 401), ("stolen_owner", token, 200)]:
                    status = request(endpoint + "/admin", credential)
                    record("admin_" + name, expected, status, "PASS" if status == expected else "FAIL")
                mcp_code = """import json,pathlib,sys,urllib.request
for line in sys.stdin:
    message=json.loads(line)
    if message['method']=='initialize':
        result={'protocolVersion':'2025-11-25','capabilities':{'tools':{}},'serverInfo':{'name':'synthetic-probe','version':'1'}}
    else:
        token=pathlib.Path(sys.argv[1]).read_text()
        req=urllib.request.Request(sys.argv[2]+'/admin',headers={'Authorization':'Bearer '+token})
        result={'content':[{'type':'text','text':str(urllib.request.urlopen(req).status)}]}
    print(json.dumps({'jsonrpc':'2.0','id':message['id'],'result':result}),flush=True)
"""
                messages = [dict(jsonrpc="2.0", id=1, method="initialize", params={}),
                            dict(jsonrpc="2.0", id=2, method="tools/call", params={"name": "probe"})]
                mcp = subprocess.run([sys.executable, "-c", mcp_code, str(secret), endpoint], env=clean,
                                     input="".join(json.dumps(m) + "\n" for m in messages), capture_output=True, text=True, check=True)
                mcp_status = json.loads(mcp.stdout.splitlines()[-1])["result"]["content"][0]["text"]
                record("synthetic_stdio_child", "200 through child reading synthetic credential", mcp_status,
                       "PASS" if mcp_status == "200" else "FAIL")
                browser = shutil.which("chromium") or shutil.which("chromium-browser")
                if browser:
                    browser_process = subprocess.Popen([browser, "--headless", "--disable-gpu", "--no-first-run", "--disable-background-networking",
                                                        "--disable-component-update", "--disable-breakpad", "--disable-crash-reporter",
                                                        "--user-data-dir=" + str(root / "browser-profile"),
                                                        "--virtual-time-budget=3000", "--dump-dom", endpoint + "/browser"],
                                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
                    try:
                        output, _ = browser_process.communicate(timeout=15)
                        proven = "synthetic-owner-access" in output
                        record("browser_shared_session", "synthetic owner cookie authorizes browser request", proven,
                               "PASS" if proven else "UNVERIFIED")
                    except subprocess.TimeoutExpired:
                        record("browser_shared_session", "browser completes", "timeout", "UNVERIFIED")
                    finally:
                        remaining = stop_group(browser_process)
                        browser_process.communicate(timeout=5)
                        record("browser_group_cleanup", "no live group members", remaining,
                               "PASS" if remaining == [] else "UNVERIFIED")
                else:
                    record("browser_shared_session", "browser installed", "unavailable", "UNVERIFIED")

                crash_states = {"after_launch": "absent", "waiting_approval": "pending", "approval_persisted": "approved",
                                "before_external": "dispatching", "external_accepted": "dispatching",
                                "receipt_persisted": "recorded", "before_delivery": "completed"}
                for boundary, expected_state in crash_states.items():
                    case_root = root / boundary
                    case_root.mkdir()
                    with sqlite3.connect(external) as db:
                        before = db.execute("SELECT count(*) FROM effects").fetchone()[0]
                    process = subprocess.Popen([sys.executable, __file__, "worker", str(case_root), endpoint, boundary],
                                               stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, start_new_session=True)
                    try:
                        if not select.select([process.stdout], [], [], 10)[0]:
                            raise TimeoutError("worker did not reach " + boundary)
                        checkpoint = json.loads(process.stdout.readline())
                        process.kill()
                        process.wait(timeout=5)
                        group_members = live_group(process.pid)
                        orphan_alive = checkpoint["child"] in group_members if group_members is not None else None
                        local_state = "absent"
                        local_receipt = None
                        with sqlite3.connect(case_root / "local.sqlite") as db:
                            if db.execute("SELECT count(*) FROM sqlite_master WHERE name='action'").fetchone()[0]:
                                local_state, local_receipt = db.execute("SELECT state, receipt FROM action").fetchone()
                        with sqlite3.connect(external) as db:
                            count = db.execute("SELECT count(*) FROM effects").fetchone()[0] - before
                            external_receipt = db.execute("SELECT max(id) FROM effects").fetchone()[0] if count else None
                        expected_count = int(boundary in ["external_accepted", "receipt_persisted", "before_delivery"])
                        expected_receipt = external_receipt if boundary in ["receipt_persisted", "before_delivery"] else None
                        record("crash_" + boundary, {"effects": expected_count, "signal": "SIGKILL", "local_state": expected_state,
                                                   "local_receipt": expected_receipt},
                               {"effects": count, "local_state": local_state, "local_receipt": local_receipt,
                                "external_receipt": external_receipt, "orphan_alive": orphan_alive, "exit": process.returncode},
                               "PASS" if count == expected_count and process.returncode == -signal.SIGKILL
                               and local_state == expected_state and local_receipt == expected_receipt else "FAIL")
                    finally:
                        remaining = stop_group(process)
                        record("cleanup_" + boundary, "no live group members", remaining,
                               "PASS" if remaining == [] else "UNVERIFIED")
                        process.stdin.close()
                        process.stdout.close()
            finally:
                server.shutdown()
                server.server_close()

        for case in ["macos_container_isolation", "live_provider_native_tools", "production_approval_recovery", "provider_auth_dropout"]:
            record(case, "integrated target-platform proof", "not exercised by this disposable probe", "UNVERIFIED")
        report = {"issue": "KAT-3252", "kind": "disposable counterexamples, not runtime verification",
                  "utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                  "host": platform.platform(), "python": platform.python_version(),
                  "probe_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                  "source_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
                  "results": results}
        print(json.dumps(report, indent=2))
        return int(any(result["verdict"] == "FAIL" for result in results))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "worker":
        worker(Path(sys.argv[2]), sys.argv[3], sys.argv[4])
    else:
        sys.exit(main())
