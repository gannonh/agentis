const activeExecutions = new Map<string, Set<AbortController>>()

export function registerSandboxExecution(
  runId: string,
  controller: AbortController
) {
  const controllers = activeExecutions.get(runId) ?? new Set<AbortController>()
  controllers.add(controller)
  activeExecutions.set(runId, controllers)

  return () => {
    controllers.delete(controller)
    if (controllers.size === 0) {
      activeExecutions.delete(runId)
    }
  }
}

export function abortSandboxExecutionsForRun(runId: string): boolean {
  const controllers = activeExecutions.get(runId)
  if (!controllers?.size) return false
  for (const controller of controllers) {
    controller.abort()
  }
  activeExecutions.delete(runId)
  return true
}
