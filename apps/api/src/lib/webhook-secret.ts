import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"

const SECRET_PREFIX = "whsec_"
const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12

export function generateWebhookSecret(): string {
  return `${SECRET_PREFIX}${randomBytes(32).toString("base64url")}`
}

export function webhookSecretPrefix(secret: string): string {
  const suffix = secret.startsWith(SECRET_PREFIX)
    ? secret.slice(SECRET_PREFIX.length)
    : secret
  return suffix.slice(0, 8)
}

function resolveEncryptionKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const raw =
    env.AGENTIS_WEBHOOK_SECRET_KEY?.trim() ??
    (env.NODE_ENV === "production" ? undefined : "agentis-dev-webhook-key")
  if (!raw) {
    throw new Error("AGENTIS_WEBHOOK_SECRET_KEY is required in production.")
  }
  return createHmac("sha256", "agentis-webhook-secret-key")
    .update(raw)
    .digest()
}

export function encryptWebhookSecret(
  secret: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  const key = resolveEncryptionKey(env)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString("base64url")
}

export function decryptWebhookSecret(
  ciphertext: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  const key = resolveEncryptionKey(env)
  const payload = Buffer.from(ciphertext, "base64url")
  const iv = payload.subarray(0, IV_BYTES)
  const authTag = payload.subarray(IV_BYTES, IV_BYTES + 16)
  const encrypted = payload.subarray(IV_BYTES + 16)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8")
}

export function signWebhookPayload(
  secret: string,
  timestamp: string,
  rawBody: string
): string {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")
  return `sha256=${digest}`
}

export function verifyWebhookSignature(input: {
  secret: string
  timestamp: string
  rawBody: string
  signatureHeader: string
}): boolean {
  const expected = signWebhookPayload(
    input.secret,
    input.timestamp,
    input.rawBody
  )
  const provided = input.signatureHeader.trim()
  if (!provided.startsWith("sha256=")) return false
  const expectedDigest = expected.slice("sha256=".length)
  const providedDigest = provided.slice("sha256=".length)
  if (
    expectedDigest.length !== providedDigest.length ||
    !/^[0-9a-f]+$/i.test(providedDigest)
  ) {
    return false
  }
  return timingSafeEqual(
    Buffer.from(expectedDigest, "hex"),
    Buffer.from(providedDigest, "hex")
  )
}

export function parseWebhookTimestamp(
  value: string
): { ok: true; epochSeconds: number } | { ok: false; reason: string } {
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) {
    const numeric = Number(trimmed)
    if (!Number.isFinite(numeric)) {
      return { ok: false, reason: "Invalid webhook timestamp." }
    }
    const epochSeconds =
      trimmed.length >= 13 ? Math.floor(numeric / 1000) : numeric
    return { ok: true, epochSeconds }
  }

  const parsed = Date.parse(trimmed)
  if (Number.isNaN(parsed)) {
    return { ok: false, reason: "Invalid webhook timestamp." }
  }
  return { ok: true, epochSeconds: Math.floor(parsed / 1000) }
}

export function isWebhookTimestampFresh(
  epochSeconds: number,
  replayWindowSeconds: number,
  nowMs = Date.now()
): boolean {
  const nowSeconds = Math.floor(nowMs / 1000)
  return Math.abs(nowSeconds - epochSeconds) <= replayWindowSeconds
}

export function buildWebhookUrl(apiPublicOrigin: string, webhookId: string) {
  const origin = apiPublicOrigin.replace(/\/$/, "")
  return `${origin}/api/webhooks/agents/${encodeURIComponent(webhookId)}`
}
