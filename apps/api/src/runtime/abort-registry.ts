import { abortSandboxExecutionsForRun } from "../sandbox/execution-registry.js"

const controllers = new Map<string, AbortController>()

export function registerAbortController(runId: string, controller: AbortController) {
  controllers.set(runId, controller)
}

export function abortRun(runId: string): boolean {
  const abortedSandbox = abortSandboxExecutionsForRun(runId)
  const controller = controllers.get(runId)
  if (!controller) return abortedSandbox
  controller.abort()
  controllers.delete(runId)
  return true
}

export function clearAbortController(runId: string) {
  controllers.delete(runId)
}

export function getAbortSignal(runId: string): AbortSignal | undefined {
  return controllers.get(runId)?.signal
}
