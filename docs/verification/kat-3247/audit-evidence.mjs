import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const scope = ["docs/verification/kat-3247", "docs/verification/verify-agentis/acceptance/kat-3247-e2085e98"];
const files = scope.flatMap(path => readdirSync(path, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile()).map(entry => `${entry.parentPath}/${entry.name}`));
const dataRoots = ["kat-3243-validation-v3", "kat-3247-e2085e98", "kat-3247-rejection-e2085e98", "kat-3247-recovery-e2085e98"].map(name => `/Users/gannonhall/.agentis/${name}`);
const tokens = dataRoots.map(root => JSON.parse(readFileSync(`${root}/owner.token`, "utf8")).token);
if (tokens.some(token => typeof token !== "string" || token.length === 0)) throw new Error("Missing owner token contents for audit");
const apiKeyPattern = /sk-ant-api\d+-[a-zA-Z0-9_-]{20,}/;
const matches = files.filter(path => {
  const text = readFileSync(path, "utf8");
  return tokens.some(token => text.includes(token)) || apiKeyPattern.test(text);
});
const docker = spawnSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
const receipt = {
  recordedAt: new Date().toISOString(),
  sourceCommit: spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
  command: "node docs/verification/kat-3247/audit-evidence.mjs",
  scope,
  ownerTokenScan: { fileCount: files.length, comparison: "Literal owner token contents from the four named local data roots; filenames and paths are retained as provenance", dataRoots, additionalPattern: apiKeyPattern.source, matches, status: matches.length ? "FAIL" : "PASS" },
  runningContainers: { command: ["docker", "ps", "--format", "{{.Names}}"], exitCode: docker.status, names: docker.stdout.trim().split("\n").filter(Boolean) },
  limitations: "This is a point-in-time container inventory and scoped content scan, not proof of absence of every secret, stopped resource, retained volume, or host process."
};
writeFileSync("docs/verification/kat-3247/evidence/cleanup-and-redaction.json", JSON.stringify(receipt, null, 2) + "\n");
if (matches.length || docker.status !== 0 || receipt.runningContainers.names.some(name => name.startsWith("agentis-"))) process.exitCode = 1;
console.log(JSON.stringify({ status: process.exitCode ? "FAIL" : "PASS", scannedFiles: files.length }));
