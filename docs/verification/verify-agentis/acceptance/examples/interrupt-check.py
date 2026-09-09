#!/usr/bin/env python3
import json
import pathlib
import subprocess
import time
import sys

proof = pathlib.Path(sys.argv[1])
checkpoint = sys.argv[2] if len(sys.argv) > 2 else "doctor.json"
child = subprocess.Popen(["node", ".agents/skills/verify-agentis/helpers/smoke.mjs", str(proof)])
try:
    deadline = time.monotonic() + 15
    while not (proof / checkpoint).exists():
        assert child.poll() is None, "helper exited before the interruption checkpoint"
        assert time.monotonic() < deadline, "interruption checkpoint timed out"
        time.sleep(0.005)
    child.terminate()
    assert child.wait(timeout=15) == 1, "interrupted proof must fail"
    result = json.loads((proof / "result.json").read_text())
    cleanup = json.loads((proof / "cleanup.json").read_text())
    assert result["verdict"] == "FAIL"
    assert cleanup["ok"] and cleanup["daemonStopped"] and cleanup["endpointUnreachable"]
    assert not pathlib.Path(cleanup["temporaryParent"]).exists()
    assert (proof / "failure.json").is_file()
    print("PASS: interrupted run failed, preserved failure evidence and removed owned processes/scratch.")
finally:
    if child.poll() is None:
        child.terminate()
        child.wait(timeout=15)
