#!/usr/bin/env python3
import argparse
import hashlib
import http.server
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import tempfile
import threading


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", help="Reviewed local Python image pinned as name@sha256:digest; never pulled")
    args = parser.parse_args()
    report = {"issue": "KAT-3252", "profile": "offline Docker candidate only", "host": platform.platform(),
              "probe_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "image": args.image,
              "source_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()}
    docker = shutil.which("docker")
    version = subprocess.run([docker, "version", "--format", "{{json .Server}}"], capture_output=True, text=True, timeout=10) if docker else None
    if version is None or version.returncode:
        report.update(verdict="UNVERIFIED", reason="Docker Engine unavailable to this user", engine=None)
        print(json.dumps(report, indent=2))
        return 0
    report["engine"] = json.loads(version.stdout)
    if not args.image or not re.fullmatch(r"[a-zA-Z0-9./:_-]+@sha256:[0-9a-f]{64}", args.image):
        report.update(verdict="UNVERIFIED", reason="Supply a reviewed local image with an immutable digest")
        print(json.dumps(report, indent=2))
        return 0
    with tempfile.TemporaryDirectory(prefix="agentis-container-probe-") as directory:
        root = Path(directory)
        owner = root / "owner"
        owner.mkdir(mode=0o700)
        secret = owner / "session"
        secret.write_text("SYNTHETIC OWNER CREDENTIAL")
        secret.chmod(0o600)
        scratch = root / "workspace"
        scratch.mkdir(mode=0o777)
        scratch.chmod(0o777)
        (scratch / "escape").symlink_to(secret)
        (scratch / "input").write_text("synthetic input")
        payload = root / "check.py"
        payload.write_text('''import json,os,pathlib,socket,sys
result={}
for name,path in [('absolute_owner',sys.argv[1]),('symlink_owner','/workspace/escape'),('docker_socket','/var/run/docker.sock')]:
    try:
        pathlib.Path(path).read_bytes()
        result[name]=False
    except (FileNotFoundError,PermissionError,IsADirectoryError):
        result[name]=True
result['input_read']=pathlib.Path('/workspace/input').read_text()=='synthetic input'
pathlib.Path('/workspace/output').write_text('scratch only')
result['scratch_write']=True
result['non_root']=os.getuid()!=0
result['owner_env_absent']='AGENTIS_PROBE_OWNER_TOKEN' not in os.environ
for host in ['127.0.0.1','host.docker.internal']:
    try:
        with socket.create_connection((host,int(sys.argv[2])),timeout=2):
            result['admin_unreachable_'+host]=False
    except OSError:
        result['admin_unreachable_'+host]=True
print(json.dumps(result))
''')
        payload.chmod(0o644)

        class Handler(http.server.BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                self.send_response(401)
                self.end_headers()

        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        name = "agentis-probe-" + os.urandom(8).hex()
        command = [docker, "run", "--rm", "--name", name, "--pull=never", "--network=none", "--read-only",
                   "--user=10001:10001", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--pids-limit=128",
                   "--memory=2g", "--cpus=2", "--tmpfs", "/tmp:rw,nosuid,nodev,size=134217728",
                   "--mount", "type=bind,src=" + str(scratch) + ",dst=/workspace",
                   "--mount", "type=bind,src=" + str(payload) + ",dst=/probe.py,readonly",
                   "--entrypoint=python3", args.image, "/probe.py", str(secret), str(server.server_port)]
        try:
            child = subprocess.run(command, capture_output=True, text=True, timeout=30,
                                   env=dict(os.environ, AGENTIS_PROBE_OWNER_TOKEN="synthetic-not-forwarded"))
            report["exit"] = child.returncode
            if child.returncode:
                report.update(verdict="UNVERIFIED", reason="Candidate did not execute", diagnostic=child.stderr[-2000:])
            else:
                report["checks"] = json.loads(child.stdout)
                report["verdict"] = "PASS" if all(report["checks"].values()) else "FAIL"
        except subprocess.TimeoutExpired:
            report.update(verdict="UNVERIFIED", reason="Candidate timed out")
        finally:
            try:
                subprocess.run([docker, "rm", "-f", name], capture_output=True, timeout=10)
                inspection = subprocess.run([docker, "container", "inspect", name], capture_output=True, text=True, timeout=10)
                absent = inspection.returncode != 0 and ("No such container" in inspection.stderr or "No such object" in inspection.stderr)
                report["cleanup_confirmed"] = absent
                if not absent:
                    report.update(verdict="FAIL", reason="Container cleanup unresolved", container_name=name)
            except subprocess.TimeoutExpired:
                report.update(verdict="FAIL", reason="Container cleanup timed out", container_name=name)
            finally:
                server.shutdown()
                server.server_close()
    print(json.dumps(report, indent=2))
    return int(report["verdict"] == "FAIL")


if __name__ == "__main__":
    raise SystemExit(main())
