import { spawnSync } from "node:child_process"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { LocalContainerSandboxBackend } from "./local-container-backend.js"
import type { SandboxExecuteInput } from "./types.js"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function runHostCommand(command: string, args: string[], inherit = false) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: inherit ? "inherit" : "pipe",
  })
  if (result.error || result.status !== 0) {
    throw new Error(
      [
        `${command} ${args.join(" ")} failed with status ${result.status ?? "unknown"}.`,
        result.error?.message,
        result.stderr,
      ]
        .filter(Boolean)
        .join("\n")
    )
  }
  return typeof result.stdout === "string" ? result.stdout.trim() : ""
}

async function execute(
  backend: LocalContainerSandboxBackend,
  input: Omit<
    SandboxExecuteInput,
    "workspaceId" | "timeoutMs" | "maxStdoutBytes" | "maxStderrBytes"
  > & {
    timeoutMs?: number
  }
) {
  return backend.execute(
    {
      workspaceId: "workspace_smoke",
      ...input,
      timeoutMs: input.timeoutMs ?? 5_000,
      maxStdoutBytes: 1_000,
      maxStderrBytes: 1_000,
    },
    new AbortController().signal
  )
}

async function main() {
  const image = process.env.AGENTIS_SANDBOX_CONTAINER_IMAGE ?? "agentis-sandbox:local"
  const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url))
  const dockerContext = runHostCommand("docker", ["context", "show"])
  const dockerServer = runHostCommand("docker", [
    "info",
    "--format",
    "{{.ServerVersion}}",
  ])
  console.log(`Docker context: ${dockerContext}`)
  console.log(`Docker server: ${dockerServer}`)

  runHostCommand(
    "docker",
    [
      "build",
      "-t",
      image,
      "-f",
      join(repoRoot, "apps/api/sandbox/Dockerfile"),
      join(repoRoot, "apps/api/sandbox"),
    ],
    true
  )

  const tempRoot = await mkdtemp(join(tmpdir(), "agentis-container-smoke-"))
  const filesRoot = join(tempRoot, "files")
  const scriptsRoot = join(tempRoot, "runtime", "scripts")
  await mkdir(filesRoot, { recursive: true })
  await mkdir(scriptsRoot, { recursive: true })

  try {
    const backend = new LocalContainerSandboxBackend(image)

    const command = await execute(backend, {
      filesRoot,
      kind: "command",
      command: "printf command-ok",
      cwd: filesRoot,
    })
    assert(command.exitCode === 0, "Command execution failed.")
    assert(command.stdout === "command-ok", "Command stdout did not match.")

    const fileWrite = await execute(backend, {
      filesRoot,
      kind: "command",
      command: "printf persisted > persisted.txt",
      cwd: filesRoot,
    })
    assert(fileWrite.exitCode === 0, "File-write command failed.")
    assert(
      (await readFile(join(filesRoot, "persisted.txt"), "utf8")) === "persisted",
      "File written inside /workspace did not persist."
    )

    const pythonScript = join(scriptsRoot, "smoke.py")
    await writeFile(pythonScript, "print('python-ok')\n", "utf8")
    const python = await execute(backend, {
      filesRoot,
      kind: "script",
      argv: ["python3", pythonScript],
      cwd: filesRoot,
    })
    assert(python.exitCode === 0, "Python script execution failed.")
    assert(python.stdout === "python-ok\n", "Python stdout did not match.")

    const nodeScript = join(scriptsRoot, "smoke.js")
    await writeFile(nodeScript, "console.log('node-ok')\n", "utf8")
    const node = await execute(backend, {
      filesRoot,
      kind: "script",
      argv: ["node", nodeScript],
      cwd: filesRoot,
    })
    assert(node.exitCode === 0, "Node script execution failed.")
    assert(node.stdout === "node-ok\n", "Node stdout did not match.")

    const timeout = await execute(backend, {
      filesRoot,
      kind: "command",
      command: "sleep 2",
      cwd: filesRoot,
      timeoutMs: 100,
    })
    assert(timeout.timedOut, "Timeout command was not marked timedOut.")
    assert(timeout.exitCode === null, "Timed-out command returned an exit code.")

    console.log("local-container sandbox smoke passed")
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
