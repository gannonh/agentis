const hostedSupportAgentAccessTokenSalt = "agentis-support-agent-preview-access"

export async function createHostedSupportAgentAccessToken(
  deploymentSecret: string
): Promise<string> {
  const secret = deploymentSecret.trim()

  if (!secret) {
    throw new Error("deployment secret is required to derive access token")
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${hostedSupportAgentAccessTokenSalt}:${secret}`)
  )

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}
