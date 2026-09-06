import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./', import.meta.url));
const output = await mkdtemp(join(tmpdir(), 'kat-3254-source-binding-'));
const assets = Object.fromEntries(await Promise.all(['index.html', 'style.css', 'app.js', 'scenario.js'].map(async file => [file, await readFile(join(root, 'prototypes', file))])));
const results = [];
for (const fault of ['index.html', 'style.css', 'app.js', 'scenario.js', 'redirect', 'probe-page']) {
  let documents = 0;
  const server = createServer((request, response) => {
    const file = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (file === 'index.html') documents++;
    if (fault === 'redirect') {
      response.writeHead(302, { Location: '/index.html' }).end();
      return;
    }
    const original = assets[file];
    if (!original) { response.writeHead(404).end(); return; }
    const changed = file === fault || (fault === 'probe-page' && file === 'index.html' && documents > 1);
    const suffix = file.endsWith('.html') ? '\n<!-- different served source -->' : '\n/* different served source */';
    response.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'text/javascript' });
    response.end(changed ? Buffer.concat([original, Buffer.from(suffix)]) : original);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const evidence = join(output, fault);
  try {
    await assert.rejects(promisify(execFile)(process.execPath, [join(root, 'verify.mjs')], {
      env: { ...process.env, PROTOTYPE_URL: `http://127.0.0.1:${server.address().port}`, EVIDENCE_DIR: evidence },
    }), error => error.code === 1);
    const report = JSON.parse(await readFile(join(evidence, 'results.json'), 'utf8'));
    assert.equal(report.verdict, 'FAIL');
    const expected = fault === 'redirect' ? 'Source response must be HTTP 200' : `Served source hash mismatch: prototypes/${fault === 'probe-page' ? 'index.html' : fault}`;
    assert.ok(report.runs.some(run => run.sourceErrors.some(error => error.includes(expected))), expected);
    if (fault === 'probe-page') assert.ok(documents > 1, 'Mismatch occurs on a later probe page');
    results.push({ fault, verdict: 'PASS', observed: expected, evidence });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}
await writeFile(join(output, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ verdict: 'PASS', output, results }, null, 2));
