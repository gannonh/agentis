import { parseArgs } from "node:util";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const options = {
  output: { type: "string" },
  scope: { type: "string", multiple: true },
  "data-root": { type: "string", multiple: true },
};

const asList = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const usage =
  "Usage: node docs/verification/kat-3247/audit-evidence.mjs --output FILE --scope DIR [--scope DIR ...] --data-root DIR [--data-root DIR ...]";

const parseInvocation = () => {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options,
      strict: true,
      allowPositionals: false,
    });
  } catch (error) {
    console.error(`audit-evidence: ${error instanceof Error ? error.message : String(error)}`);
    console.error(usage);
    return null;
  }

  const output = parsed.values.output;
  const scopes = asList(parsed.values.scope);
  const dataRoots = asList(parsed.values["data-root"]);
  const missing = [
    output ? null : "--output",
    scopes.length ? null : "--scope",
    dataRoots.length ? null : "--data-root",
  ].filter(Boolean);
  if (missing.length) {
    console.error(`audit-evidence: missing required option(s): ${missing.join(", ")}`);
    console.error(usage);
    return null;
  }

  return {
    output: resolve(output),
    scopes: scopes.map((path) => resolve(path)),
    dataRoots: dataRoots.map((path) => resolve(path)),
    argv: process.argv.slice(2),
  };
};

const filesInScope = (scope) => {
  if (!statSync(scope).isDirectory()) throw new Error("scope is not a directory");
  return readdirSync(scope, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
};

const readOwnerToken = (dataRoot) => {
  const tokenPath = join(dataRoot, "owner.token");
  try {
    const parsed = JSON.parse(readFileSync(tokenPath, "utf8"));
    if (typeof parsed?.token !== "string" || parsed.token.length === 0) {
      return { status: "FAIL", reason: "missing-token", tokenPath };
    }
    return { status: "PASS", tokenPath, token: parsed.token };
  } catch {
    return { status: "FAIL", reason: "missing-token", tokenPath };
  }
};

const dockerInventory = () => {
  const dockerArgv = ["ps", "--format", "{{.Names}}"];
  const result = spawnSync("docker", dockerArgv, { encoding: "utf8" });
  const names = result.status === 0 ? result.stdout.trim().split("\n").filter(Boolean) : [];
  const managedNames = names.filter((name) => name.startsWith("agentis-"));
  return {
    command: ["docker", ...dockerArgv],
    argv: dockerArgv,
    exitCode: result.status,
    names,
    managedNames,
    status: result.status === 0 && managedNames.length === 0 ? "PASS" : "FAIL",
  };
};

const sourceSha = () => {
  const command = "git";
  const argv = ["rev-parse", "HEAD"];
  const result = spawnSync(command, argv, { encoding: "utf8" });
  return {
    value: result.status === 0 ? result.stdout.trim() : "",
    command,
    argv,
    exitCode: result.status,
  };
};

const audit = (invocation) => {
  const source = sourceSha();
  const filePaths = new Set();
  const scopeFailures = [];
  for (const scope of invocation.scopes) {
    try {
      for (const file of filesInScope(scope)) filePaths.add(file);
    } catch {
      scopeFailures.push({ scope, reason: "missing-scope" });
    }
  }

  const rootChecks = invocation.dataRoots.map((dataRoot) => readOwnerToken(dataRoot));
  const validTokens = rootChecks
    .filter((check) => check.status === "PASS")
    .map((check) => check.token);
  const apiKeyPattern = /sk-ant-api\d+-[a-zA-Z0-9_-]{20,}/;
  const matches = [...filePaths].filter((path) => {
    const text = readFileSync(path, "utf8");
    return validTokens.some((token) => text.includes(token)) || apiKeyPattern.test(text);
  });
  const docker = dockerInventory();
  const tokenFailures = rootChecks
    .filter((check) => check.status !== "PASS")
    .map(({ tokenPath, reason }) => ({ tokenPath, reason }));
  const status =
    source.exitCode !== 0 ||
    scopeFailures.length > 0 ||
    tokenFailures.length > 0 ||
    matches.length > 0 ||
    docker.status !== "PASS"
      ? "FAIL"
      : "PASS";
  return {
    recordedAt: new Date().toISOString(),
    status,
    sourceCommit: source.value,
    command: [process.execPath, process.argv[1]],
    argv: invocation.argv,
    cwd: process.cwd(),
    output: invocation.output,
    scope: invocation.scopes,
    scopeFailures,
    ownerTokenScan: {
      fileCount: filePaths.size,
      comparison:
        "Literal owner token contents from the supplied local data roots; filenames and paths are retained as provenance",
      dataRoots: invocation.dataRoots,
      tokenFailures,
      additionalPattern: apiKeyPattern.source,
      matches,
      status: tokenFailures.length || matches.length ? "FAIL" : "PASS",
    },
    runningContainers: docker,
    limitations:
      "This is a point-in-time container inventory and scoped content scan, not proof of absence of every secret, stopped resource, retained volume, or host process. Running containers without the Agentis managed name prefix are retained in inventory but do not determine the verdict.",
  };
};

const main = () => {
  const invocation = parseInvocation();
  if (!invocation) return 2;
  const receipt = audit(invocation);
  mkdirSync(dirname(invocation.output), { recursive: true });
  writeFileSync(invocation.output, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ status: receipt.status, scannedFiles: receipt.ownerTokenScan.fileCount }));
  return receipt.status === "PASS" ? 0 : 1;
};

process.exitCode = main();
