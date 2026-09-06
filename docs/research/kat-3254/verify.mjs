import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { platform, release } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const root = fileURLToPath(new URL('./', import.meta.url));
const output = resolve(process.env.EVIDENCE_DIR || join(root, 'evidence'));
const origin = process.env.PROTOTYPE_URL || 'http://127.0.0.1:4173';
const server = new URL(origin);
assert.equal(server.origin, origin, 'PROTOTYPE_URL must be an origin without a path');
assert.equal(server.protocol, 'http:');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(server.hostname), 'Prototype server must be loopback');
const driverPath = process.env.PLAYWRIGHT_MODULE || '/tmp/kat-3254-browser/node_modules/playwright/index.mjs';
const { chromium } = await import(pathToFileURL(driverPath));
const executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const { request, reply, action } = await import('./prototypes/scenario.js');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sourceFiles = ['prototypes/index.html', 'prototypes/style.css', 'prototypes/scenario.js', 'prototypes/app.js', 'verify.mjs', 'verify-source-binding.mjs', 'protocol.md'];
const sha256 = body => createHash('sha256').update(body).digest('hex');
const hashes = Object.fromEntries(await Promise.all(sourceFiles.map(async file => [file, sha256(await readFile(join(root, file)))])));
const servedFiles = { '/': 'prototypes/index.html', ...Object.fromEntries(sourceFiles.filter(file => file.startsWith('prototypes/')).map(file => [`/${file.slice('prototypes/'.length)}`, file])) };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
const report = {
  issue: 'KAT-3254', recordedAt: new Date().toISOString(), commit: git('rev-parse', 'HEAD'),
  sourceClean: git('status', '--porcelain', '--', ...sourceFiles) === '', hashes,
  environment: { os: `${platform()} ${release()}`, node: process.version, browser: browser.version(), playwright: JSON.parse(await readFile(new URL('./package.json', pathToFileURL(driverPath)), 'utf8')).version, executablePath },
  startCommand: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory docs/research/kat-3254/prototypes',
  verificationCommand: 'node docs/research/kat-3254/verify.mjs', origin,
  scenario: { request, reply, action },
  method: 'One run per variant/input condition. Known-target browser retrieval timing includes driver overhead; not human locate time. Prefilled fixed text. Research controls excluded from human activations. See protocol.md.',
  runs: [], unverified: ['Live provider eligibility', 'Authentication', 'Authorization enforcement', 'External recovery', 'Scheduling', 'Computer control', 'Business value', 'Human usability', 'macOS product support', 'Screen reader conformance'],
};

async function run(variant, mode) {
  const viewport = mode === 'mouse' ? { width: 1440, height: 1080 } : { width: 390, height: 844 };
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage();
  const result = { variant, mode, viewport, verdict: 'RUNNING', canonical: { humanActivations: 0, setupActivations: 0, navigationChanges: 0, detailOpenings: 0, researcherControls: 0, keys: 0 }, interactions: [], probes: [], checks: [], screenshots: [], errors: [], externalRequests: [], sourceAssets: {}, sourceErrors: [] };
  report.runs.push(result);
  page.on('pageerror', error => result.errors.push(error.message));
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      result.externalRequests.push(route.request().url());
      return route.abort();
    }
    try {
      const file = servedFiles[url.pathname];
      assert.ok(file, `Unexpected prototype asset: ${url.pathname}`);
      const response = await route.fetch({ maxRedirects: 0 });
      assert.equal(response.status(), 200, `Source response must be HTTP 200: ${url}`);
      const body = await response.body();
      const observed = sha256(body);
      assert.equal(observed, hashes[file], `Served source hash mismatch: ${file}`);
      result.sourceAssets[file] = observed;
      await route.fulfill({ response, body });
    } catch (error) {
      result.sourceErrors.push(error.message);
      await route.abort();
    }
  });
  let canonical = true;
  const locator = name => name === 'Open linked conversation'
    ? page.locator('.task-overview > button[data-action="conversation"]')
    : page.getByRole('button', { name, exact: true });
  let detailOpener;
  async function press(key) {
    await page.keyboard.press(key);
    if (canonical) result.canonical.keys++;
  }
  async function activate(name, category = 'human', navigation = false, detail = false, target = name.startsWith('[S') ? page.getByText(name, { exact: true }) : locator(name)) {
    assert.equal(await target.count(), 1, `target exists: ${name}`);
    const started = performance.now();
    let tabs = 0;
    if (mode === 'keyboard' && category !== 'research') {
      while (!await target.evaluate(element => element === document.activeElement)) {
        assert.ok(tabs++ < 100, `keyboard can reach ${name}`);
        await press('Tab');
      }
      const focus = await target.evaluate(element => ({ style: getComputedStyle(element).outlineStyle, width: getComputedStyle(element).outlineWidth }));
      assert.notEqual(focus.style, 'none', `focus indicator on ${name}`);
      assert.notEqual(focus.width, '0px', `focus indicator width on ${name}`);
      await press('Enter');
    } else await target.click();
    if (detail && !name.startsWith('[S')) detailOpener = await target.elementHandle();
    if (navigation && ['Start a request', 'Open linked conversation', 'Release readiness'].includes(name)) {
      assert.ok(await page.evaluate(() => document.activeElement.matches('#message-input, .main-content h1')), 'navigation focuses the destination');
    }
    if (canonical) {
      const field = { human: 'humanActivations', setup: 'setupActivations', research: 'researcherControls' }[category];
      result.canonical[field]++;
      if (navigation) result.canonical.navigationChanges++;
      if (detail) result.canonical.detailOpenings++;
    }
    result.interactions.push({ phase: canonical ? 'canonical' : 'failure-retention', category, name, navigation, detail, tabs, elapsedMs: +(performance.now() - started).toFixed(2) });
  }
  async function check(label, callback) {
    await callback();
    result.checks.push({ label, verdict: 'PASS' });
  }
  async function screenshot(name) {
    const file = `${variant}-${mode}-${name}.png`;
    const modal = page.locator('dialog[open]');
    const modalOpen = await modal.count() > 0;
    if (modalOpen) await modal.evaluate(element => { element.scrollTop = 0; });
    await page.screenshot({ path: join(output, file), fullPage: !modalOpen });
    result.screenshots.push(file);
    if (modalOpen && await modal.evaluate(element => element.scrollHeight > element.clientHeight)) {
      await modal.evaluate(element => { element.scrollTop = element.scrollHeight; });
      const bottom = `${variant}-${mode}-${name}-bottom.png`;
      await page.screenshot({ path: join(output, bottom) });
      result.screenshots.push(bottom);
    }
  }
  const snapshot = () => page.evaluate(variant => JSON.parse(localStorage.getItem(`kat3254-research-${variant}`)), variant);
  async function stateIs(stage, owner) {
    assert.equal((await snapshot()).stage, stage);
    assert.equal(await page.locator('[data-probe="owner"]').textContent(), owner);
  }
  async function probe(label, name) {
    const probePage = await context.newPage();
    await probePage.goto(`${origin}/?variant=${variant}`);
    assert.deepEqual(result.sourceErrors, [], 'Probe page uses recorded source');
    const started = performance.now();
    const observed = await probePage.locator(`[data-probe="${name}"]`).evaluate(element => {
      const box = element.getBoundingClientRect();
      return { text: element.textContent.trim(), top: +box.top.toFixed(1), bottom: +box.bottom.toFixed(1), initiallyInViewport: box.top >= 0 && box.bottom <= innerHeight, visible: !!element.getClientRects().length };
    });
    const elapsedMs = +(performance.now() - started).toFixed(2);
    if (!observed.initiallyInViewport) await probePage.locator(`[data-probe="${name}"]`).scrollIntoViewIfNeeded();
    result.probes.push({ label, target: name, ...observed, deliberateOpenings: 0, scrolls: observed.initiallyInViewport ? 0 : 1, elapsedMs });
    assert.ok(observed.visible);
    await probePage.close();
  }
  async function retained(label) {
    const before = await snapshot();
    await page.reload();
    assert.deepEqual(await snapshot(), before, `${label}: refresh changes no state`);
    await activate('Repeat last notification', 'research');
    const after = await snapshot();
    assert.deepEqual({ ...after, suppressed: before.suppressed }, before, `${label}: duplicate changes only suppression count`);
    result.checks.push({ label: `${label}: refresh and repeated notification do not repeat work`, verdict: 'PASS' });
  }
  async function closeDetail() {
    if (mode === 'keyboard') {
      await press('Escape');
      if (canonical) result.canonical.humanActivations++;
      result.interactions.push({ phase: canonical ? 'canonical' : 'failure-retention', category: 'human', name: 'Escape closes detail' });
    } else await activate('Close');
    assert.equal(await page.locator('dialog').isVisible(), false);
    await page.waitForFunction(opener => document.activeElement === opener, detailOpener, { timeout: 2000 });
  }
  async function assignment() {
    await check('Connection setup precedes request availability and task creation', async () => {
      assert.equal(await locator('Send request').count(), 0);
      assert.equal(await page.locator('.work-panel').count(), 0);
      assert.equal(await page.locator('[data-probe="owner"]').textContent(), 'Unassigned');
    });
    await activate('Use demonstration environment', 'setup');
    await check('Source authority precedes request availability and task creation', async () => {
      assert.equal(await locator('Send request').count(), 0);
      assert.equal((await snapshot()).taskCount, 0);
    });
    await activate('Allow this source read', 'setup');
    await check('Completed setup has started no task or specialist', async () => {
      const value = await snapshot();
      assert.equal(value.stage, 'welcome');
      assert.equal(value.taskCount, 0);
      assert.equal(value.dispatchCount, 0);
      assert.deepEqual(value.messages.map(message => message.id), ['environment', 'source-authority']);
    });
    if (variant === 'C') await activate('Start a request', 'human', true);
    await activate('Send request', 'human', variant === 'C');
    await stateIs('assigned', 'Mara');
    assert.equal((await snapshot()).taskCount, 1);
    await activate('Simulate Mara offering handoff', 'research');
  }
  async function draft() {
    await activate('Simulate Ivo accepting', 'research');
    if (variant === 'C') await activate('Open linked conversation', 'human', true);
    await activate('Send reply', 'human', variant === 'C');
    await activate('Simulate Ivo delivering brief', 'research');
  }
  try {
    await page.goto(`${origin}/?variant=${variant}`);
    await check('Browser loads only the recorded prototype bytes', async () => {
      assert.deepEqual(result.sourceErrors, []);
      assert.deepEqual(result.sourceAssets, Object.fromEntries(sourceFiles.filter(file => file.startsWith('prototypes/')).map(file => [file, hashes[file]])));
    });
    await screenshot('start');
    await assignment();
    await check('Pending handoff keeps sender ownership', () => stateIs('proposed', 'Mara'));
    if (variant === 'A') await check('Pending handoff exposes no specialist work updates', async () => assert.equal(await locator('Show routine peer updates').count(), 0));
    await probe('pending handoff', 'owner');
    await activate('Simulate Ivo accepting', 'research');
    await check('Receiving-agent acceptance transfers ownership exactly once', () => stateIs('clarification', 'Ivo'));
    if (variant === 'A') await check('Accepted specialist work makes routine updates available', async () => assert.equal(await locator('Show routine peer updates').count(), 1));
    await probe('accepted handoff', 'owner');
    if (variant === 'C') await activate('Open linked conversation', 'human', true);
    await activate('Send reply', 'human', variant === 'C');
    await activate('Simulate Ivo delivering brief', 'research');
    await check('Clarification yields the fixed artifact', () => stateIs('review', 'Ivo'));
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot('brief-ready');
    await probe('artifact ready', 'result');
    await probe('approval pending', 'action');
    await activate('Inspect release brief', 'human', false, true);
    await activate('[S1] northstar/launchpad · PR #42', 'human', false, true);
    await activate('[S2] northstar/launchpad · Issue #17', 'human', false, true);
    await screenshot('artifact');
    await check('Artifact has both inspectable citations and provenance', async () => {
      const content = await page.locator('dialog').textContent();
      for (const expected of ['brief-v1', 'task-1', 'attempt-1', 'Ivo', 'Latest check absent', 'No verification run attached']) assert.ok(content.includes(expected));
    });
    await closeDetail();
    await activate('Review exact action', 'human', false, true);
    await check('Approval disabled before destination connection', async () => assert.ok(await locator('Approve this exact action once').isDisabled()));
    await activate('Connect this demonstration destination', 'setup');
    await screenshot('approval');
    await check('Exact action binds destination, content, authority, scope, duration and attempt', async () => {
      const content = await page.locator('dialog').textContent();
      for (const expected of [action.destination, action.body, action.title, action.scope, action.duration, 'Alex', 'attempt-1', 'action-1 v1']) assert.ok(content.includes(expected));
      assert.ok(await page.locator('dialog').evaluate(element => element.scrollWidth <= element.clientWidth + 1));
    });
    await activate('Approve this exact action once');
    await check('Approval records a decision before any simulated effect', async () => {
      await stateIs('approved', 'Ivo');
      assert.equal((await snapshot()).effectCount, 0);
      assert.equal(await page.locator('[data-probe="action"]').textContent(), 'Create issue · approved, awaiting receipt');
    });
    await activate('Simulate completion receipt', 'research');
    await activate('Inspect receipt', 'human', false, true);
    await check('Completion receipt is linked to one approved action and retained artifact', async () => {
      const content = await page.locator('dialog').textContent();
      for (const expected of ['SIM-LIN-104', 'action-1 v1', 'attempt-1', 'brief-v1', 'No real issue exists']) assert.ok(content.includes(expected));
    });
    await closeDetail();
    canonical = false;
    await retained('completion');
    await probe('completed', 'result');
    await probe('completed', 'action');
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot('complete');
    await check('One task, one specialist start, one simulated effect', async () => {
      const value = await snapshot();
      assert.equal(value.taskCount, 1); assert.equal(value.dispatchCount, 1); assert.equal(value.effectCount, 1);
    });
    await activate('Provider & execution details', 'human', false, true);
    await check('Identity, role, provider, execution location and unavailable capabilities are distinct', async () => {
      const content = await page.locator('dialog').textContent();
      for (const expected of ['Human authority', 'Named teammate and role', 'Provider', 'Execution location', 'Sample engine', 'This browser simulation', 'scheduling', 'Computer control', 'remote execution']) assert.ok(content.includes(expected));
    });
    await closeDetail();
    await activate('Restart this simulated scenario', 'research');
    await assignment();
    await retained('pending handoff');
    await activate('Simulate handoff failure', 'research');
    await check('Failed handoff retains Mara and starts no specialist', async () => {
      await stateIs('failed', 'Mara'); assert.equal((await snapshot()).dispatchCount, 0);
      if (variant === 'A') {
        assert.equal(await locator('Show routine peer updates').count(), 0);
        assert.equal(await page.locator('.routine').count(), 0);
      }
    });
    await probe('failed handoff', 'owner');
    await probe('failed handoff', 'error');
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot('handoff-failed');
    await activate('Simulate a new handoff offer', 'research');
    await activate('Simulate Ivo accepting', 'research');
    if (variant === 'A') await check('Accepted work updates open and collapse after a failed offer', async () => {
      await activate('Show routine peer updates');
      assert.ok((await page.locator('.routine').textContent()).includes('Sources S1 and S2 indexed'));
      await activate('Collapse routine peer updates');
    });
    await retained('accepted handoff');
    if (variant === 'C') await activate('Release readiness', 'human', true, false, page.locator('.task-nav').getByRole('button', { name: 'Release readiness', exact: true }));
    if (variant === 'C') await activate('Open linked conversation', 'human', true);
    await activate('Send reply');
    await activate('Simulate Ivo delivering brief', 'research');
    await retained('pending approval');
    await activate('Review exact action', 'human', false, true);
    await check('Approval disabled before artifact inspection', async () => {
      await activate('Connect this demonstration destination', 'setup');
      assert.ok(await locator('Approve this exact action once').isDisabled());
    });
    await closeDetail();
    await activate('Inspect release brief', 'human', false, true);
    await closeDetail();
    await activate('Review exact action', 'human', false, true);
    if (mode === 'keyboard') await check('Modal traps keyboard focus in both directions', async () => {
      await press('Shift+Tab');
      assert.ok(await page.evaluate(() => !!document.activeElement.closest('dialog')));
      for (let index = 0; index < 8; index++) {
        await press('Tab');
        assert.ok(await page.evaluate(() => !!document.activeElement.closest('dialog')));
      }
    });
    await activate('Approve this exact action once');
    await activate('Simulate interruption before receipt', 'research');
    await retained('unknown outcome');
    await check('Unknown action preserves brief and does not offer retry or a completion receipt', async () => {
      await stateIs('unknown', 'Ivo');
      assert.equal(await locator('Inspect release brief').count(), 1);
      assert.equal(await locator('Inspect receipt').count(), 0);
      assert.equal(await page.getByRole('button', { name: /^Retry|^Approve/ }).count(), 0);
      assert.equal((await snapshot()).effectCount, 1);
    });
    await probe('unknown outcome', 'owner');
    await probe('unknown outcome', 'error');
    await probe('unknown outcome', 'action');
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot('unknown');
    for (const scope of ['.error', '.work-panel']) {
      await activate('Inspect unresolved action', 'human', false, true, page.locator(scope).getByRole('button', { name: 'Inspect unresolved action', exact: true }));
      await check(`Unknown action opened from ${scope} restores its exact opener`, async () => {
        assert.ok((await page.locator('dialog').textContent()).includes('Approval consumed; receipt missing'));
        await closeDetail();
      });
    }
    await activate('Simulate read-only receipt lookup', 'research');
    await check('Read-only lookup finds the original receipt without repeating the effect', async () => { await stateIs('complete', 'Ivo'); assert.equal((await snapshot()).effectCount, 1); });
    await activate('Restart this simulated scenario', 'research');
    await assignment();
    await draft();
    await activate('Review exact action', 'human', false, true);
    await activate('Deny action');
    await retained('denial');
    await check('Denial retains the artifact and creates nothing', async () => {
      await stateIs('denied', 'Ivo'); assert.equal((await snapshot()).effectCount, 0);
      assert.equal(await locator('Inspect release brief').count(), 1);
    });
    await check('No document horizontal overflow', async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)));
    await check('Old onboarding data is preserved and refused', async () => {
      const old = { ...await snapshot(), version: 1 };
      await page.evaluate(({ variant, old }) => localStorage.setItem(`kat3254-research-${variant}`, JSON.stringify(old)), { variant, old });
      await page.reload();
      assert.equal(await page.getByRole('heading', { name: 'Saved research data cannot be opened' }).count(), 1);
      assert.deepEqual(await snapshot(), old);
    });
    await check('No browser exceptions or external requests', async () => { assert.deepEqual(result.errors, []); assert.deepEqual(result.externalRequests, []); });
    await check('All reloads and probe pages use recorded source', async () => assert.deepEqual(result.sourceErrors, []));
    result.verdict = 'PASS';
  } catch (error) {
    result.verdict = 'FAIL'; result.failure = error.stack;
    await screenshot('FAIL');
    throw error;
  } finally {
    await context.close();
  }
}
try {
  for (const mode of ['mouse', 'keyboard']) for (const variant of ['A', 'B', 'C']) await run(variant, mode);
  for (const file of sourceFiles) assert.equal(sha256(await readFile(join(root, file))), hashes[file], `Local source changed during verification: ${file}`);
  assert.equal(git('rev-parse', 'HEAD'), report.commit, 'Source commit changed during verification');
  report.verdict = 'PASS';
} catch (error) {
  report.verdict = 'FAIL';
  console.error(error);
  process.exitCode = 1;
} finally {
  await writeFile(join(output, 'results.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ verdict: report.verdict, sourceClean: report.sourceClean, commit: report.commit, runs: report.runs.map(({ variant, mode, verdict, canonical, checks }) => ({ variant, mode, verdict, canonical, checks: checks.length })) }, null, 2));
  await browser.close();
}
