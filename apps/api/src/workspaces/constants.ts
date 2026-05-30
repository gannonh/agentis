export {
  GENERIC_AGENTIS_AGENT_ID,
  LOCAL_WORKSPACE_BACKEND_TYPE,
} from "@workspace/shared"

export const GENERIC_AGENTIS_WORKSPACE_ID = "workspace_agentis"
export const GENERIC_AGENTIS_AGENT_NAME = "Agentis"
export const GENERIC_AGENTIS_WORKSPACE_NAME = "Agentis workspace"

export function workspaceBackendRef(workspaceId: string): string {
  return `workspaces/${workspaceId}`
}
