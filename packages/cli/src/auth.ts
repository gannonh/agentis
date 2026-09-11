import { randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect, Schema } from "effect";
import { newSessionId } from "./ids.js";
import { SessionId, type PrincipalKind } from "./schema.js";

export type OwnerSession = {
  readonly sessionId: typeof SessionId.Type;
  readonly token: string;
};

const OwnerFile = Schema.Struct({
  sessionId: SessionId,
  token: Schema.String,
});

export class InvalidOwnerCredentialError extends Error {
  readonly _tag = "InvalidOwnerCredentialError";
}

const tokenPath = (dataRoot: string) => join(dataRoot, "owner.token");

export const loadOrCreateOwner = (dataRoot: string): Effect.Effect<OwnerSession> =>
  Effect.sync(() => {
    mkdirSync(dataRoot, { recursive: true, mode: 0o700 });
    const path = tokenPath(dataRoot);
    try {
      const parsed = Schema.decodeUnknownSync(OwnerFile)(JSON.parse(readFileSync(path, "utf8")));
      return parsed;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code === "ENOENT") {
        const session: OwnerSession = {
          sessionId: newSessionId(),
          token: randomBytes(32).toString("hex"),
        };
        writeFileSync(path, `${JSON.stringify(session)}\n`, { mode: 0o600 });
        chmodSync(path, 0o600);
        return session;
      }
      throw new InvalidOwnerCredentialError("invalid owner credential");
    }
  });

export const parseAuthorization = (
  header: string | undefined,
  owner: OwnerSession,
): { readonly kind: PrincipalKind; readonly sessionId: string } | null => {
  if (!header) {
    return null;
  }
  const bearer = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (bearer && bearer === owner.token) {
    return { kind: "owner", sessionId: owner.sessionId };
  }
  if (header.startsWith("Bot ")) {
    return { kind: "bot", sessionId: header.slice("Bot ".length) };
  }
  return null;
};
