#!/usr/bin/env python3
import json
import os
import pathlib
import subprocess
import sys

proof = pathlib.Path(sys.argv[1])
hook = pathlib.Path(__file__).with_name('fail-verify-listen.cjs').resolve()
env = dict(os.environ, NODE_OPTIONS=f'--require="{hook}"')
result = subprocess.run(['node', '.agents/skills/verify-agentis/helpers/smoke.mjs', str(proof)], env=env, timeout=30)
assert result.returncode == 1, 'injected startup failure must fail'
cleanup = json.loads((proof / 'cleanup.json').read_text())
launch = json.loads((proof / 'launch.json').read_text())
assert 'forced startup failure for AC6' in launch['stderr']
assert cleanup['ok'] and cleanup['launcherStopped'] and cleanup['removed']
assert len(cleanup['startupInspection']) == 1
assert cleanup['startupInspection'][0]['after'] == {'owned': [], 'unknown': []}
assert not pathlib.Path(cleanup['temporaryParent']).exists()
assert (proof / 'failure.json').is_file()
print('PASS: injected startup failure retained evidence, found no surviving daemon, and removed owned state.')
