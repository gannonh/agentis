import { FetchHttpClient, HttpApiClient } from "@effect/platform";
import { Effect, Either, Schema } from "effect";
import { AgentisJsonApi } from "../../src/api.js";
import {
  CommandReceipt,
  type CommandRequest,
  type ProviderKind,
  type SourceKind,
} from "../../src/schema.js";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly detail: unknown,
  ) {
    super(message);
  }
}

const errorMessage = (error: unknown) => {
  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string") return error.message;
    if ("error" in error && typeof error.error === "string") return error.error;
  }
  return "The workspace request failed.";
};

const result = async <A, E>(effect: Effect.Effect<A, E, never>): Promise<A> => {
  const outcome = await Effect.runPromise(Effect.either(effect));
  if (Either.isRight(outcome)) return outcome.right;
  throw new ApiClientError(errorMessage(outcome.left), outcome.left);
};

const client = () =>
  Effect.runPromise(
    HttpApiClient.make(AgentisJsonApi, { baseUrl: window.location.origin }).pipe(
      Effect.provide(FetchHttpClient.layer),
    ),
  );

const mutationHeaders = (csrfToken: string) => ({
  "x-agentis-csrf": csrfToken,
});

export const apiClient = {
  exchangeBootstrap: async (code: string) => {
    const current = await client();
    return result(current.json.exchangeBootstrap({ headers: {}, payload: { code } }));
  },
  session: async () => {
    const current = await client();
    return result(current.json.session({ headers: {} }));
  },
  acknowledgeSetup: async (
    csrfToken: string,
    provider: ProviderKind,
    sources: readonly SourceKind[],
  ) => {
    const current = await client();
    return result(
      current.json.acknowledgeSetup({
        headers: mutationHeaders(csrfToken),
        payload: { provider, sources },
      }),
    );
  },
  status: async () => {
    const current = await client();
    return result(current.json.status({ headers: {} }));
  },
  command: async (csrfToken: string, request: CommandRequest) => {
    const current = await client();
    const outcome = await Effect.runPromise(
      Effect.either(
        current.json.command({
          headers: mutationHeaders(csrfToken),
          payload: request,
        }),
      ),
    );
    if (Either.isRight(outcome)) return outcome.right;
    try {
      return Schema.decodeUnknownSync(CommandReceipt)(outcome.left);
    } catch {
      throw new ApiClientError(errorMessage(outcome.left), outcome.left);
    }
  },
  artifactBytes: async (contentUrl: string) => {
    const response = await fetch(contentUrl, { credentials: "same-origin" });
    if (!response.ok) {
      let detail: unknown;
      try {
        detail = await response.json();
      } catch {
        detail = { message: `Artifact request failed (${response.status}).` };
      }
      throw new ApiClientError(errorMessage(detail), detail);
    }
    return response.arrayBuffer();
  },
};
