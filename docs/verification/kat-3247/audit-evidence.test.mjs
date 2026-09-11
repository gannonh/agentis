import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./audit-evidence.mjs", import.meta.url));
const repository = resolve(dirname(script), "../../..");

const makeFixture = () => {
  const root = mkdtempSync(join(tmpdir(), "kat3247-audit-"));
  const scope = join(root, "scope");
  const secondScope = join(root, "second-scope");
  const dataRoot = join(root, "data-root");
  const secondDataRoot = join(root, "second-data-root");
  mkdirSync(scope, { recursive: true });
  mkdirSync(secondScope, { recursive: true });
  mkdirSync(dataRoot, { recursive: true });
  mkdirSync(secondDataRoot, { recursive: true });
  const token = "owner-token-synthetic-for-audit-regression";
  const secondToken = "owner-token-synthetic-second-root";
  writeFileSync(join(dataRoot, "owner.token"), JSON.stringify({ token }) + "\n");
  writeFileSync(join(secondDataRoot, "owner.token"), JSON.stringify({ token: secondToken }) + "\n");
  writeFileSync(join(scope, "safe.txt"), "no credentials here\n");
  writeFileSync(join(secondScope, "also-safe.txt"), "still clean\n");
  return { root, scope, secondScope, dataRoot, secondDataRoot, token };
};

const dockerStub = (root) => {
  const bin = join(root, "bin");
  const executable = join(bin, "docker");
  mkdirSync(bin, { recursive: true });
  writeFileSync(executable, "#!/bin/sh\nexit 0\n");
  chmodSync(executable, 0o755);
  return bin;
};

const runAudit = (args, fixture) =>
  spawnSync(process.execPath, [script, ...args], {
    cwd: repository,
    encoding: "utf8",
    env: { ...process.env, PATH: `${dockerStub(fixture.root)}:${process.env.PATH ?? ""}` },
  });

const readReceipt = (output) => JSON.parse(readFileSync(output, "utf8"));

test("audit accepts repeatable scopes and roots and records a clean receipt", () => {
  const fixture = makeFixture();
  try {
    const output = join(fixture.root, "receipts", "clean.json");
    const args = [
      "--output",
      output,
      "--scope",
      fixture.scope,
      "--scope",
      fixture.secondScope,
      "--data-root",
      fixture.dataRoot,
      "--data-root",
      fixture.secondDataRoot,
    ];
    const result = runAudit(args, fixture);
    assert.equal(result.status, 0, result.stderr);
    const receipt = readReceipt(output);
    assert.equal(receipt.status, "PASS");
    assert.equal(receipt.ownerTokenScan.status, "PASS");
    assert.deepEqual(receipt.scope, [fixture.scope, fixture.secondScope]);
    assert.deepEqual(receipt.ownerTokenScan.dataRoots, [fixture.dataRoot, fixture.secondDataRoot]);
    assert.deepEqual(receipt.argv, args);
    assert.match(receipt.sourceCommit, /^[0-9a-f]{40}$/);
    assert.equal(receipt.command[0], process.execPath);
    assert.equal(receipt.runningContainers.status, "PASS");
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("audit fails on a token match without printing token contents", () => {
  const fixture = makeFixture();
  try {
    writeFileSync(join(fixture.scope, "leaked.txt"), `accidental token: ${fixture.token}\n`);
    const output = join(fixture.root, "leak.json");
    const result = runAudit([
      "--output",
      output,
      "--scope",
      fixture.scope,
      "--data-root",
      fixture.dataRoot,
    ], fixture);
    assert.equal(result.status, 1, result.stderr);
    const receiptText = readFileSync(output, "utf8");
    assert.equal(receiptText.includes(fixture.token), false);
    assert.equal(result.stdout.includes(fixture.token), false);
    assert.equal(result.stderr.includes(fixture.token), false);
    const receipt = JSON.parse(receiptText);
    assert.equal(receipt.status, "FAIL");
    assert.equal(receipt.ownerTokenScan.status, "FAIL");
    assert.deepEqual(receipt.ownerTokenScan.matches, [join(fixture.scope, "leaked.txt")]);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("audit writes a FAIL receipt and exits nonzero for a missing owner token", () => {
  const fixture = makeFixture();
  try {
    const missingRoot = join(fixture.root, "does-not-exist");
    const output = join(fixture.root, "missing-root.json");
    const result = runAudit([
      "--output",
      output,
      "--scope",
      fixture.scope,
      "--data-root",
      missingRoot,
    ], fixture);
    assert.equal(result.status, 1, result.stderr);
    const receipt = readReceipt(output);
    assert.equal(receipt.status, "FAIL");
    assert.equal(receipt.ownerTokenScan.status, "FAIL");
    assert.deepEqual(receipt.ownerTokenScan.tokenFailures, [
      { tokenPath: join(missingRoot, "owner.token"), reason: "missing-token" },
    ]);
    assert.equal(result.stdout.includes("undefined"), false);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
