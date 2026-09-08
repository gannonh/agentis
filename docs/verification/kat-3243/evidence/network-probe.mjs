import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const dataRoot = process.argv[2];
if (!dataRoot) throw new Error("Pass the data root of an active provider login");
const scope = `login-${createHash("sha256").update(resolve(dataRoot)).digest("hex").slice(0, 24)}`;
const probe = `
const net = require("node:net");
async function connect(host, port, request) {
  return new Promise(resolve => {
    const socket = net.connect({host, port});
    socket.setTimeout(2500);
    socket.on("connect", () => {
      if (request) socket.write(request);
      else { socket.destroy(); resolve("connected"); }
    });
    socket.on("data", data => { socket.destroy(); resolve(data.toString().split("\\r\\n")[0]); });
    socket.on("timeout", () => { socket.destroy(); resolve("timeout"); });
    socket.on("error", error => resolve(error.code));
  });
}
(async () => {
  const results = {};
  for (const host of ["auth.openai.com", "example.com", "127.0.0.1", "host.docker.internal", "192.168.1.1"]) {
    results[host] = await connect("provider-proxy", 3128, "CONNECT " + host + ":443 HTTP/1.1\\r\\nHost: " + host + ":443\\r\\n\\r\\n");
  }
  results.directInternet = await connect("1.1.1.1", 443);
  results.directHost = await connect("host.docker.internal", 443);
  console.log(JSON.stringify(results, null, 2));
  const allowed = results["auth.openai.com"].includes("200");
  const rejected = ["example.com", "127.0.0.1", "host.docker.internal", "192.168.1.1"].every(host => results[host].includes("403"));
  process.exitCode = allowed && rejected && results.directInternet !== "connected" && results.directHost !== "connected" ? 0 : 1;
})();`;
const result = spawnSync("docker", [
  "run", "--rm", "--network", `agentis-net-${scope}`,
  "--user", "10001:10001", "--read-only", "--cap-drop=ALL",
  "--security-opt=no-new-privileges", "agentis-codex:0.153.4", "node", "-e", probe,
], { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
