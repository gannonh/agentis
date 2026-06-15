const SUPPORTED_VARIABLES = new Set(["payload", "deliveryId", "receivedAt"])
const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

export type WebhookPromptContext = {
  payload: unknown
  deliveryId: string
  receivedAt: string
  maxPayloadChars?: number
}

export function renderWebhookPrompt(
  template: string,
  context: WebhookPromptContext
): string {
  const unsupported = new Set<string>()
  let usesVariables = false
  const rendered = template.replace(VARIABLE_PATTERN, (_match, variable: string) => {
    if (!SUPPORTED_VARIABLES.has(variable)) {
      unsupported.add(variable)
      return ""
    }
    usesVariables = true
    switch (variable) {
      case "payload":
        return formatPayload(context.payload, context.maxPayloadChars)
      case "deliveryId":
        return context.deliveryId
      case "receivedAt":
        return context.receivedAt
      default:
        return ""
    }
  })

  if (unsupported.size > 0) {
    throw new Error(
      `Unsupported webhook prompt variables: ${[...unsupported].join(", ")}`
    )
  }

  if (usesVariables) {
    return rendered.trim()
  }

  const payloadBlock = formatPayload(context.payload, context.maxPayloadChars)
  return `${template.trim()}\n\nWebhook payload:\n${payloadBlock}`
}

function formatPayload(payload: unknown, maxChars = 8_000): string {
  const pretty = JSON.stringify(payload, null, 2)
  if (pretty.length <= maxChars) return pretty
  return `${pretty.slice(0, maxChars - 3)}...`
}
