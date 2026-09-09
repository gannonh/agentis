#!/usr/bin/env python3
import json
import os
import pathlib
import subprocess
import sys

prefix = pathlib.Path(sys.argv[1])
hook = pathlib.Path(__file__).with_name('malformed-submit.cjs').resolve()
for case in ['thread', 'effects']:
    proof = prefix.with_name(prefix.name + '-' + case)
    env = dict(os.environ, NODE_OPTIONS=f'--require="{hook}"', KAT3315_RECEIPT_CASE=case)
    result = subprocess.run(['node', '.agents/skills/verify-agentis/helpers/smoke.mjs', str(proof)], env=env, timeout=30)
    assert result.returncode == 1, 'malformed receipt must fail'
    verdict = json.loads((proof / 'result.json').read_text())
    assert verdict['verdict'] == 'FAIL'
    assert 'threadId and effects' in verdict['observed']['failures'][0]['error']
    cleanup = json.loads((proof / 'cleanup.json').read_text())
    assert cleanup['ok'] and not pathlib.Path(cleanup['temporaryParent']).exists()
print('PASS: missing threadId and incorrect effects each fail with owned cleanup.')
