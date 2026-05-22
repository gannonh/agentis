const SECRET_KEY_PATTERN =
  /token|secret|password|api[_-]?key|authorization|credential/i

const MAX_STRING_LENGTH = 500
const MAX_OUTPUT_DEPTH = 4

export function sanitizeToolPayload(value: unknown, depth = 0): unknown {
  if (depth > MAX_OUTPUT_DEPTH) {
    return "[truncated]"
  }

  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…`
      : value
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeToolPayload(item, depth + 1))
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const sanitized: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(record)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        sanitized[key] = "[redacted]"
        continue
      }
      sanitized[key] = sanitizeToolPayload(nested, depth + 1)
    }
    return sanitized
  }

  return value
}

export function summarizeToolOutput(output: unknown): unknown {
  const sanitized = sanitizeToolPayload(output)
  const serialized = JSON.stringify(sanitized) ?? ""
  if (serialized.length <= 4000) {
    return sanitized
  }
  return {
    summary: "Tool output truncated for display",
    preview: serialized.slice(0, 4000),
  }
}
