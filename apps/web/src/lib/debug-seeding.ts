export function isDebugSeedingEnabled(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_AGENTIS_DEBUG_SEEDS === "1"
}
