export const GENERIC_AGENTIS_AGENT_ID = "agent_agentis"
export const GENERIC_AGENTIS_WORKSPACE_ID = "workspace_agentis"
export const GENERIC_AGENTIS_AGENT_NAME = "Agentis"
export const GENERIC_AGENTIS_WORKSPACE_NAME = "Agentis workspace"
export const LOCAL_WORKSPACE_BACKEND_TYPE = "local-fs"

export function workspaceBackendRef(workspaceId: string): string {
  return `workspaces/${workspaceId}`
}
