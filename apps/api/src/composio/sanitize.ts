const SECRET_KEY_PATTERN =
  /token|secret|password|api[_-]?key|authorization|credential/i

const MAX_STRING_LENGTH = 500
const MAX_OUTPUT_DEPTH = 4

export function sanitizeToolPayload(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet()
): unknown {
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

  if (typeof value === "number" || typeof value === "boolean") {
    return value
  }

  if (typeof value === "bigint") {
    return value.toString()
  }

  if (typeof value === "function" || typeof value === "symbol") {
    return `[${typeof value}]`
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) =>
      sanitizeToolPayload(item, depth + 1, seen)
    )
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[cycle]"
    }
    seen.add(value)

    const record = value as Record<string, unknown>
    const sanitized: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(record)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        sanitized[key] = "[redacted]"
        continue
      }
      sanitized[key] = sanitizeToolPayload(nested, depth + 1, seen)
    }
    return sanitized
  }

  return String(value)
}

export function summarizeToolOutput(output: unknown): unknown {
  let sanitized: unknown
  try {
    sanitized = sanitizeToolPayload(output)
    JSON.stringify(sanitized)
  } catch {
    return { summary: "Tool output could not be serialized for display" }
  }

  const serialized = JSON.stringify(sanitized) ?? ""
  if (serialized.length <= 4000) {
    return sanitized
  }
  return {
    summary: "Tool output truncated for display",
    preview: serialized.slice(0, 4000),
  }
}
