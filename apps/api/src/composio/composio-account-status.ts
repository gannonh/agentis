import type { ConnectionStatus } from "@workspace/shared"

export function mapComposioAccountStatus(status: string): ConnectionStatus {
  const normalized = status.trim().toUpperCase()
  if (normalized === "ACTIVE") return "connected"
  if (
    normalized === "PENDING" ||
    normalized === "INITIALIZING" ||
    normalized === "INITIATED"
  ) {
    return "pending"
  }
  if (normalized === "EXPIRED") return "expired"
  return "error"
}
