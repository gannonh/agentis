export type AgentSetupFormState = {
  name: string
  description: string
  model: string
  systemPrompt: string
}

export function canSubmitAgentSetup(
  form: AgentSetupFormState | null,
  submitting: boolean
): boolean {
  if (!form || submitting) return false
  return form.name.trim().length > 0 && form.systemPrompt.trim().length > 0
}
