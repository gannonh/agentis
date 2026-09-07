import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CODEX_CLI_PIN, CODEX_IMAGE } from "./versions.js";

export const providerVolume = (dataRoot: string) =>
  `agentis-codex-auth-${createHash("sha256").update(resolve(dataRoot)).digest("hex").slice(0, 24)}`;

export const docker = (args: string[]): string => {
  const result = spawnSync("docker", args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`docker ${args[0]} failed: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
};

const dockerfile = `FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e
RUN apt-get update && apt-get install -y --no-install-recommends squid=5.7-2+deb12u6 ca-certificates git && rm -rf /var/lib/apt/lists/*
RUN npm install -g @openai/codex@${CODEX_CLI_PIN} && codex --version
RUN mkdir -p /provider-auth && chown 10001:10001 /provider-auth
COPY squid.conf /etc/squid/squid.conf
USER 10001:10001
`;

const squidConfig = `http_port 3128
acl CONNECT method CONNECT
acl TLS port 443
acl provider dstdomain -n auth.openai.com chatgpt.com
acl private dst 0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.0.0.0/24 192.0.2.0/24 192.168.0.0/16 198.18.0.0/15 198.51.100.0/24 203.0.113.0/24 224.0.0.0/4 240.0.0.0/4 ::/128 ::1/128 fc00::/7 fe80::/10 ff00::/8 2001:db8::/32
http_access deny !CONNECT
http_access deny !TLS
http_access deny !provider
http_access deny private
http_access allow provider
http_access deny all
cache deny all
access_log none
cache_log /dev/stderr
cache_store_log none
pid_filename /tmp/squid.pid
coredump_dir /tmp
`;

export const provisionProvider = (dataRoot: string): void => {
  const context = mkdtempSync(join(tmpdir(), "agentis-codex-image-"));
  try {
    writeFileSync(join(context, "Dockerfile"), dockerfile);
    writeFileSync(join(context, "squid.conf"), squidConfig);
    const build = spawnSync("docker", ["build", "--tag", CODEX_IMAGE, context], {
      stdio: "inherit",
    });
    if (build.error) throw build.error;
    if (build.status !== 0) throw new Error("Codex image build failed");
    docker([
      "volume",
      "create",
      "--label",
      "io.agentis.managed=provider-auth",
      providerVolume(dataRoot),
    ]);
  } finally {
    rmSync(context, { recursive: true, force: true });
  }
};

const networkName = (scope: string) => `agentis-net-${scope}`;
const proxyName = (scope: string) => `agentis-egress-${scope}`;
const label = "io.agentis.provider-scope";

export const providerNetworkEnv = [
  "-e",
  "HTTPS_PROXY=http://provider-proxy:3128",
  "-e",
  "HTTP_PROXY=http://provider-proxy:3128",
  "-e",
  "ALL_PROXY=http://provider-proxy:3128",
];

export const removeProviderNetwork = (scope: string): void => {
  for (const [kind, name] of [
    ["container", proxyName(scope)],
    ["network", networkName(scope)],
  ]) {
    if (!kind || !name) throw new Error("invalid provider resource");
    const inspection = spawnSync(
      "docker",
      [
        "inspect",
        "--type",
        kind,
        "--format",
        `{{index ${kind === "container" ? ".Config.Labels" : ".Labels"} "${label}"}}`,
        name,
      ],
      { encoding: "utf8" },
    );
    if (inspection.error) throw inspection.error;
    if (inspection.status !== 0) {
      if (/No such (object|container|network)/i.test(inspection.stderr)) continue;
      throw new Error(`cannot inspect provider ${kind}: ${inspection.stderr.trim()}`);
    }
    const owner = inspection.stdout.trim();
    if (owner !== scope) throw new Error(`refusing to remove unowned provider ${kind} ${name}`);
    docker(kind === "container" ? ["rm", "-f", name] : ["network", "rm", name]);
  }
};

export const prepareProviderNetwork = (scope: string): string => {
  const network = networkName(scope);
  docker([
    "network",
    "create",
    "--internal",
    "--ipv6=false",
    "--opt",
    "com.docker.network.bridge.gateway_mode_ipv4=isolated",
    "--label",
    `${label}=${scope}`,
    network,
  ]);
  try {
    docker([
      "run",
      "-d",
      "--rm",
      "--pull=never",
      "--name",
      proxyName(scope),
      "--label",
      `${label}=${scope}`,
      "--network",
      "bridge",
      "--read-only",
      "--user=10001:10001",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--pids-limit=64",
      "--memory=256m",
      "--cpus=1",
      "--tmpfs",
      "/tmp:rw,nosuid,nodev,size=33554432",
      CODEX_IMAGE,
      "squid",
      "-N",
      "-f",
      "/etc/squid/squid.conf",
    ]);
    docker(["network", "connect", "--alias", "provider-proxy", network, proxyName(scope)]);
    return network;
  } catch (error) {
    removeProviderNetwork(scope);
    throw error;
  }
};

export const loginProvider = (dataRoot: string): void => {
  const scope = `login-${createHash("sha256").update(resolve(dataRoot)).digest("hex").slice(0, 24)}`;
  docker(["volume", "inspect", providerVolume(dataRoot)]);
  const network = prepareProviderNetwork(scope);
  try {
    const login = spawnSync(
      "docker",
      [
        "run",
        "--rm",
        "-i",
        "--pull=never",
        "--network",
        network,
        "--read-only",
        "--user=10001:10001",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        "--pids-limit=128",
        "--memory=2g",
        "--cpus=2",
        "--tmpfs",
        "/tmp:rw,nosuid,nodev,size=134217728",
        "--mount",
        `type=volume,src=${providerVolume(dataRoot)},dst=/provider-auth`,
        "-e",
        "HOME=/tmp/codex-home",
        "-e",
        "CODEX_HOME=/provider-auth",
        ...providerNetworkEnv,
        CODEX_IMAGE,
        "codex",
        "-c",
        'cli_auth_credentials_store="file"',
        "login",
        "--device-auth",
      ],
      { stdio: "inherit" },
    );
    if (login.error) throw login.error;
    if (login.status !== 0) throw new Error("Codex device login failed");
  } finally {
    removeProviderNetwork(scope);
  }
};
