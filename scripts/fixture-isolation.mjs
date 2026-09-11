import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  realpathSync,
  lstatSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
export const prepareIsolationCanaries = async () => {
  const root = mkdtempSync(join(tmpdir(), "agentis-host-canary-"));
  const marker = randomUUID();
  const credential = join(root, "owner.token");
  const config = join(root, ".npmrc");
  const executable = join(root, "host-command");
  const output = join(root, "escaped");
  writeFileSync(credential, marker);
  writeFileSync(config, marker);
  writeFileSync(executable, `#!/bin/sh\nprintf escaped > '${output}'\n`);
  chmodSync(executable, 0o700);
  await exec(executable);
  assert.equal(readFileSync(output, "utf8"), "escaped");
  rmSync(output);
  const server = createServer((socket) => socket.end(marker));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "0.0.0.0", resolve);
  });
  return {
    root,
    credential,
    config,
    executable,
    output,
    port: server.address().port,
    env: {
      AGENTIS_HOST_CANARY: marker,
      ANTHROPIC_API_KEY: marker,
      OPENAI_API_KEY: marker,
      NPM_CONFIG_USERCONFIG: config,
      SSH_AUTH_SOCK: join(root, "agent.sock"),
    },
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      rmSync(root, { recursive: true, force: true });
    },
  };
};

export const verifyFixtureIsolation = async (report, canaries, daemonEntry) => {
  const { stdout } = await exec("docker", ["inspect", report.containerId]);
  const [container] = JSON.parse(stdout);
  assert.equal(container.Id, report.containerId);
  assert.equal(container.Name, "/" + report.containerName);
  assert.equal(
    report.containerName,
    "agentis-verify-" + container.Config.Labels["io.agentis.verify-launch"],
  );
  assert.equal(container.HostConfig.Privileged, false);
  assert.equal(container.HostConfig.PidMode, "");
  assert.equal(container.HostConfig.IpcMode, "private");
  assert.equal(container.Config.Labels["io.agentis.managed"], "verify-fixture");
  assert.equal(container.HostConfig.NetworkMode, "none");
  assert.equal(container.HostConfig.ReadonlyRootfs, true);
  assert.ok(container.HostConfig.CapDrop.includes("ALL"));
  assert.ok(
    container.HostConfig.SecurityOpt.some((value) => value.startsWith("no-new-privileges")),
  );
  assert.ok(process.getuid() > 0 && process.getgid() > 0);
  assert.equal(container.Config.User, `${process.getuid()}:${process.getgid()}`);
  assert.equal(dirname(report.dataRoot), realpathSync("/tmp"));
  assert.ok(basename(report.dataRoot).startsWith("agentis-verify-"));
  assert.equal(realpathSync(report.dataRoot), report.dataRoot);
  assert.equal(report.workspace, join(report.dataRoot, "scratch"));
  assert.ok(lstatSync(daemonEntry).isFile());
  const mounts = container.Mounts.filter((mount) => mount.Type === "bind");
  assert.ok(
    container.Mounts.every(
      (mount) =>
        mount.Type === "bind" ||
        (mount.Type === "tmpfs" && ["/tmp", "/fixture-home"].includes(mount.Destination)),
    ),
  );
  assert.deepEqual(
    mounts
      .map(({ Source, Destination, RW }) => ({ Source, Destination, RW }))
      .sort((a, b) => a.Destination.localeCompare(b.Destination)),
    [
      { Source: report.dataRoot, Destination: report.dataRoot, RW: true },
      { Source: daemonEntry, Destination: "/opt/agentis/fixture-daemon.mjs", RW: false },
    ].sort((a, b) => a.Destination.localeCompare(b.Destination)),
  );
  const expectedEnv = {
    PATH: "/usr/local/bin:/usr/bin:/bin",
    NODE_VERSION: "24.20.0",
    YARN_VERSION: "1.22.22",
    HOME: "/fixture-home",
    XDG_CONFIG_HOME: "/fixture-home/.config",
    XDG_DATA_HOME: "/fixture-home/.local/share",
    NPM_CONFIG_USERCONFIG: "/dev/null",
    npm_config_userconfig: "/dev/null",
    NO_OPEN_BROWSER: "1",
  };
  assert.deepEqual(
    Object.fromEntries(
      container.Config.Env.map((value) => {
        const i = value.indexOf("=");
        return [value.slice(0, i), value.slice(i + 1)];
      }),
    ),
    expectedEnv,
  );
  assert.equal(Object.keys(container.NetworkSettings.Ports ?? {}).length, 0);
  assert.equal(readFileSync(canaries.credential, "utf8"), canaries.env.AGENTIS_HOST_CANARY);
  assert.equal(readFileSync(canaries.config, "utf8"), canaries.env.AGENTIS_HOST_CANARY);
  const escapeLink = join(report.workspace, "host-canary-link");
  symlinkSync(canaries.root, escapeLink);
  const input = {
    credential: canaries.credential,
    config: canaries.config,
    executable: canaries.executable,
    output: canaries.output,
    escapeLink,
    port: canaries.port,
    workspace: report.workspace,
  };
  const program = `
    const fs = require('node:fs');
    const net = require('node:net');
    const cp = require('node:child_process');
    const input = JSON.parse(process.argv[1]);
    const results = [];
    const deny = (name, work) => { try { work(); results.push({name, denied:false}); } catch(error) { results.push({name, denied:true, code:error.code}); } };
    deny('host credential read', () => fs.readFileSync(input.credential));
    deny('host configuration read', () => fs.readFileSync(input.config));
    deny('host absolute executable', () => cp.execFileSync(input.executable, [], {stdio:'pipe'}));
    deny('image shell cannot read host credential', () => cp.execFileSync('/bin/sh', ['-c', 'cat "$1"', 'probe', input.credential], {stdio:'pipe'}));
    deny('host write', () => fs.writeFileSync(input.output, 'escaped'));
    deny('symlink escape', () => fs.readFileSync(input.escapeLink + '/owner.token'));
    deny('Docker socket absent', () => fs.lstatSync('/var/run/docker.sock'));
    deny('root filesystem write', () => fs.writeFileSync('/etc/agentis-canary', 'escaped'));
    results.push({name:'inherited environment stripped', denied:!process.env.AGENTIS_HOST_CANARY && !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY && !process.env.SSH_AUTH_SOCK && process.env.NPM_CONFIG_USERCONFIG !== input.config});
    const connect = (host, port) => new Promise(resolve => {
      const socket = net.connect({host,port});
      const finish = value => { socket.destroy(); resolve(value); };
      socket.setTimeout(2000, () => finish({name:'network '+host+':'+port, denied:true, code:'TIMEOUT'}));
      socket.once('connect', () => finish({name:'network '+host+':'+port, denied:false}));
      socket.once('error', error => finish({name:'network '+host+':'+port, denied:true, code:error.code}));
    });
    (async () => {
      results.push(...await Promise.all([connect('127.0.0.1',input.port),connect('host.docker.internal',input.port),connect('172.17.0.1',input.port),connect('1.1.1.1',443),connect('2606:4700:4700::1111',443)]));
      fs.writeFileSync(input.workspace+'/isolation-positive.txt','fixture scratch writable\\n');
      process.stdout.write(JSON.stringify(results));
    })().catch(error => { console.error(error); process.exitCode=1; });
  `;
  try {
    const probe = await exec(
      "docker",
      ["exec", report.containerId, "/usr/local/bin/node", "-e", program, JSON.stringify(input)],
      { timeout: 15000 },
    );
    const checks = JSON.parse(probe.stdout);
    const expectedChecks = [
      "host credential read",
      "host configuration read",
      "host absolute executable",
      "image shell cannot read host credential",
      "host write",
      "symlink escape",
      "Docker socket absent",
      "root filesystem write",
      "inherited environment stripped",
      `network 127.0.0.1:${canaries.port}`,
      `network host.docker.internal:${canaries.port}`,
      `network 172.17.0.1:${canaries.port}`,
      "network 1.1.1.1:443",
      "network 2606:4700:4700::1111:443",
    ];
    assert.deepEqual(checks.map((check) => check.name).sort(), expectedChecks.sort());
    for (const check of checks) assert.equal(check.denied, true, `${check.name} escaped isolation`);
    assert.equal(
      readFileSync(join(report.workspace, "isolation-positive.txt"), "utf8"),
      "fixture scratch writable\n",
    );
    assert.equal(readFileSync(canaries.credential, "utf8"), canaries.env.AGENTIS_HOST_CANARY);
    return {
      status: "PASS",
      containerId: container.Id,
      image: container.Image,
      scope:
        "Child process in the actual launched fixture container; identical mounts, user, environment and network namespace. Host administration and kernel escape are outside this check.",
      network: container.HostConfig.NetworkMode,
      mounts: mounts.map(({ Source, Destination, RW }) => ({ Source, Destination, RW })),
      checks,
    };
  } finally {
    rmSync(escapeLink, { force: true });
  }
};
