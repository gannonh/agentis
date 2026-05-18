const hostedSupportAgentAccessTokenSalt = "agentis-support-agent-preview-access"
const textEncoder = new TextEncoder()

export async function createHostedSupportAgentAccessToken(
  deploymentSecret: string
): Promise<string> {
  const secret = deploymentSecret.trim()

  if (!secret) {
    throw new Error("deployment secret is required to derive access token")
  }

  const signature = await crypto.subtle.sign(
    "HMAC",
    await importHmacKey(secret, ["sign"]),
    textEncoder.encode(hostedSupportAgentAccessTokenSalt)
  )

  return bytesToHex(new Uint8Array(signature))
}

export async function verifyHostedSupportAgentAccessToken({
  deploymentSecret,
  accessToken,
}: {
  deploymentSecret: string
  accessToken: string | undefined
}): Promise<boolean> {
  const secret = deploymentSecret.trim()
  const token = accessToken?.trim()

  if (!secret || !token) {
    return false
  }

  const signature = hexToBytes(token)
  if (!signature) {
    return false
  }

  return crypto.subtle.verify(
    "HMAC",
    await importHmacKey(secret, ["verify"]),
    signature,
    textEncoder.encode(hostedSupportAgentAccessTokenSalt)
  )
}

function signatureBytes(signature: ArrayBuffer): Uint8Array {
  return new Uint8Array(signature)
}

export async function verifyHostedSupportAgentStaticAccessToken({
  expectedAccessToken,
  accessToken,
}: {
  expectedAccessToken: string
  accessToken: string | undefined
}): Promise<boolean> {
  const expectedToken = expectedAccessToken.trim()
  const token = accessToken?.trim()

  if (!expectedToken || !token) {
    return false
  }

  const signature = signatureBytes(
    await crypto.subtle.sign(
      "HMAC",
      await importHmacKey(expectedToken, ["sign"]),
      textEncoder.encode(hostedSupportAgentAccessTokenSalt)
    )
  )

  return crypto.subtle.verify(
    "HMAC",
    await importHmacKey(token, ["verify"]),
    signature,
    textEncoder.encode(hostedSupportAgentAccessTokenSalt)
  )
}

function importHmacKey(
  secret: string,
  keyUsages: Array<"sign" | "verify">
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    keyUsages
  )
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  )
}

function hexToBytes(hex: string): Uint8Array | undefined {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    return undefined
  }

  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }

  return bytes
}
