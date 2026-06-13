/** Default cap for live gateway runs. */
export const DEFAULT_RUN_MAX_OUTPUT_TOKENS = 8192

export function anthropicCloudflareEmptyResponseHint(
  modelId: string,
  provider: "vercel" | "cloudflare"
): string | null {
  if (provider !== "cloudflare" || !modelId.startsWith("anthropic/")) {
    return null
  }
  return "Anthropic models returned no content from Cloudflare AI Gateway. Add an Anthropic API key (BYOK) to your gateway, or choose an OpenAI or Gemini model."
}

export function formatProviderErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown provider error"

  const withBody = error as Error & { responseBody?: string }
  if (withBody.responseBody) {
    try {
      const parsed = JSON.parse(withBody.responseBody) as {
        errors?: Array<{ message?: string }>
        error?: string | { message?: string }
      }
      const gatewayMessage = parsed.errors?.[0]?.message
      if (gatewayMessage) return gatewayMessage
      if (typeof parsed.error === "string") return parsed.error
      const nestedError = parsed.error
      if (
        nestedError &&
        typeof nestedError === "object" &&
        "message" in nestedError &&
        typeof nestedError.message === "string"
      ) {
        return nestedError.message
      }
    } catch {
      // Fall through to the generic error message.
    }
  }

  return error.message || "Unknown provider error"
}
