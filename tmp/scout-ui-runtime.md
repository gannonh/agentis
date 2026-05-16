# Code Context

## Files Retrieved
1. `README.md` (lines 1-23) - architecture direction: Cloudflare, Flue, Vercel AI SDK, Agentis-owned seams.
2. `apps/web/src/App.tsx` (lines 1-204) - support-agent state, sample source data, runtime dependency, request construction, failure handling.
3. `apps/web/src/App.tsx` (lines 241-442) - form UI, hosted config rendering, transcript rendering, runtime/source labels.
4. `apps/web/src/lib/support-agent/chat-contracts.ts` (lines 1-46) - chat request, response, source, runtime metadata contracts.
5. `apps/web/src/lib/support-agent/model-runtime.ts` (lines 12-142) - model runtime, prompt assembly, provider error normalization.
6. `apps/web/src/lib/support-agent/documentation-context.ts` (lines 7-106) - local documentation registry, context resolver, source mapper.
7. `apps/web/src/lib/support-agent/runtime-boundary.ts` (lines 6-149) - existing runtime Interface, failure state mapping, response linkage guard.
8. `apps/web/src/lib/support-agent/http-runtime.ts` (lines 11-71) - browser HTTP Adapter into the support-agent runtime Interface.
9. `apps/web/src/lib/support-agent/api-handler.ts` (lines 20-114) - server endpoint, request guard, configured runtime creation, error payload.
10. `apps/web/src/lib/support-agent/configured-runtime.ts` (lines 15-49) - chooses demo or model Implementation.
11. `apps/web/src/lib/support-agent/flue-adapter.ts` (lines 8-131) - Flue Adapter input/output mapping and provenance guard.
12. `apps/web/src/lib/support-agent/hosted-deployment-config.ts` (lines 3-128) - hosted deployment config shape and Cloudflare preview request mapping.
13. `apps/web/src/lib/support-agent/local-responder.ts` (lines 7-29) - deterministic demo runtime Implementation.
14. `apps/web/src/App.test.tsx` (lines 185-620) - DOM-heavy tests covering runtime delegation, labels, provenance, concurrency, failure copy.
15. `apps/web/src/lib/support-agent/model-runtime.test.ts` (lines 18-191) - prompt, provider failure, and malformed output tests.
16. `apps/web/src/lib/support-agent/documentation-context.test.ts` (lines 21-127) - resolver behavior, duplicate IDs, path mismatch, source mapping.
17. `apps/web/src/lib/support-agent/flue-adapter.test.ts` (lines 15-266) - Adapter mapping, provenance, secret stripping, runtime boundary usage.

## Key Code

Existing runtime Interface and linkage seam:

```ts
// apps/web/src/lib/support-agent/runtime-boundary.ts:6-8
export type SupportAgentRuntime = {
  respond(request: SupportAgentChatRequest): Promise<SupportAgentChatResponse>
}
```

```ts
// apps/web/src/lib/support-agent/runtime-boundary.ts:131-149
export async function respondWithSupportAgentRuntime(
  runtime: SupportAgentRuntime,
  request: SupportAgentChatRequest
): Promise<SupportAgentChatResponse> {
  const response = await runtime.respond(request)

  if (
    response.agentId !== request.agentId ||
    response.conversationId !== request.conversationId ||
    response.inReplyToMessageId !== request.messageId
  ) {
    throw new SupportAgentRuntimeError({
      code: "SUPPORT_AGENT_RESPONSE_LINKAGE_MISMATCH",
      message: "Support agent response did not match the submitted message.",
    })
  }

  return response
}
```

UI request construction and orchestration sit inside `App`:

```ts
// apps/web/src/App.tsx:151-199
async function handleQuestionSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  const question = supportQuestion.trim()
  if (!question || !selectedSource) return
  if (isSubmittingRef.current) return
  isSubmittingRef.current = true
  setIsSubmittingSupportQuestion(true)
  setSupportQuestionFailure(undefined)
  const messageSequence = nextMessageSequenceRef.current
  nextMessageSequenceRef.current += 1
  const messageId = messageSequence === 0
    ? supportAgentChatRequestFixture.messageId
    : `${supportAgentChatRequestFixture.messageId}_${messageSequence + 1}`
  const request: SupportAgentChatRequest = { ...supportAgentChatRequestFixture, messageId, question, knowledgeSourceIds: knowledgeSources.map((source) => source.id), knowledgeSources }
  try {
    const response = await respondWithSupportAgentRuntime(supportAgentResponder, request)
    setSubmittedTurns((turns) => [...turns, { request, response }])
    setSupportQuestion("")
    setSupportQuestionFailure(undefined)
  } catch (error) {
    console.error("Support agent response failed", error)
    setSupportQuestionFailure(toSupportAgentFailureState(error))
    nextMessageSequenceRef.current = messageSequence
  }
}
```

Documentation context is a local registry plus resolver:

```ts
// apps/web/src/lib/support-agent/documentation-context.ts:24-55
const localDocumentationSourcesByKnowledgeSourceId = new Map<string, LocalDocumentationSource>([
  ["knowledge_product_docs", { sourceId: "source_product_docs_setup", path: "docs/knowledge/product-documentation-sample.md", ... }],
  ["knowledge_release_notes", { sourceId: "source_release_notes_may", path: "docs/knowledge/release-notes-sample.md", ... }],
])
```

Model runtime resolves context during prompt assembly and again for citations:

```ts
// apps/web/src/lib/support-agent/model-runtime.ts:40-54
const result = await generateSupportAgentText({ config, generateText, request })
const documentationContext = resolveSupportAgentDocumentationContext(request)
return { ...requestIds, answer: result.text, sources: toSupportAgentSources(documentationContext), runtime: { mode: "model", provider: config.provider, model: config.model } }
```

Flue Adapter is already a strong boundary candidate:

```ts
// apps/web/src/lib/support-agent/flue-adapter.ts:49-85
export function toFlueSupportAgentRuntimeInput(request: SupportAgentChatRequest): FlueSupportAgentRuntimeInput {
  const documentationContext = resolveSupportAgentDocumentationContext(request)
  ...
}
```

## Architecture

The current flow starts in `App`: sample docs are selected, the UI builds a `SupportAgentChatRequest`, then calls a `SupportAgentRuntime` through `respondWithSupportAgentRuntime`. The default browser Implementation is `createSupportAgentHttpRuntime`, which posts to `/api/support-agent/respond`. The API handler builds a configured model runtime using environment values and a text generator. Runtime Implementations share `resolveSupportAgentDocumentationContext`, which validates selected source IDs and local paths, then supplies model prompt context, local demo answers, Flue Adapter inputs, and response sources.

Depth exists in a few places already: the runtime Interface is small, Flue has an Adapter Module, provider config normalizes missing credentials, and the boundary enforces response linkage. The highest-friction areas have low Locality: UI state, request construction, hosted config preview, transcript rendering, provider label formatting, demo source data, and failure rendering all sit in `App.tsx`; documentation source identity is repeated between `App` and the local resolver; prompt construction is private inside model runtime while tests assert full provider calls.

## Architecture deepening candidates

1. `apps/web/src/App.tsx` as a shallow UI plus runtime orchestration Module

Files: `apps/web/src/App.tsx` (lines 30-55, 66-204, 241-442), `apps/web/src/App.test.tsx` (lines 185-620).

Friction: `App` owns sample source data, hosted config preparation, support chat request construction, message ID sequencing, concurrency prevention, runtime failure mapping, runtime label formatting, and transcript rendering. The existing runtime Interface gives a Seam at `supportAgentResponder`, but most chat behavior is still embedded in React event code. This lowers Locality when changing conversation behavior or setup behavior.

Depth opportunity: deepen the Module boundary around support-agent UI orchestration while keeping React focused on rendering and event wiring. This would give Leverage because the same request and transcript rules could serve a Vercel AI SDK chat UX later without copying App-specific code.

deletion test: If the support-agent chat orchestration were deleted from `App`, the hosted config preview and static template UI could still render. If the hosted config block were deleted, chat could still submit. The mixed file fails this deletion test today because both flows share state and render locality.

Testability impact: many tests exercise logic through DOM interactions and injected runtimes, including delegation (lines 185-224), HTTP default behavior (lines 297-338), concurrency (lines 413-452), linkage failures (lines 454-485), and failure copy (lines 487-620). A deeper Module boundary would move part of this coverage to unit tests and leave DOM tests for screen behavior.

2. Documentation context registry as a deeper knowledge Module

Files: `apps/web/src/App.tsx` (lines 30-49, 172-187), `apps/web/src/lib/support-agent/documentation-context.ts` (lines 24-95), `apps/web/src/lib/support-agent/model-runtime.ts` (lines 46-54, 120-136), `apps/web/src/lib/support-agent/local-responder.ts` (lines 10-24), `apps/web/src/lib/support-agent/flue-adapter.ts` (lines 49-85).

Friction: source IDs and local paths live in `App` and in the resolver registry. Requests carry both `knowledgeSourceIds` and `knowledgeSources`, and the resolver validates the request against the hardcoded local registry. This is useful for safety, but it spreads source identity across UI and runtime Implementation code.

Depth opportunity: deepen the knowledge Module so source selection, local context resolution, and source citation mapping have higher Locality. The current resolver is already a useful Seam, but its registry and transformation responsibilities are coupled.

deletion test: Deleting `documentation-context.ts` breaks local demo answers, model prompts, Flue input mapping, and source citations. That broad blast radius shows high Leverage, but also means the Module should be intentionally owned and easy to test.

Testability impact: existing resolver tests cover selected source resolution, duplicate IDs, unknown IDs, path mismatch, and source mapping (`documentation-context.test.ts` lines 21-127). Deeper Locality would reduce duplicated fixture content in model and Flue tests and make source lifecycle changes testable without rendering `App`.

3. Prompt assembly inside `model-runtime.ts`

Files: `apps/web/src/lib/support-agent/model-runtime.ts` (lines 12-142), `apps/web/src/lib/support-agent/model-runtime.test.ts` (lines 18-127).

Friction: `toSupportAgentPrompt` is private, so tests validate prompt behavior by mocking `generateText` and asserting the entire provider call. `respond` also resolves documentation context once indirectly during prompt assembly and again for sources. That duplication is small now, but it will add friction as knowledge lifecycle and retrieval rules deepen.

Depth opportunity: deepen prompt assembly as its own Implementation detail with a clearer Seam inside the model runtime Module. This would preserve the existing external Interface while improving Locality around prompt rules, context formatting, and citation source reuse.

deletion test: If prompt assembly were removed, provider invocation would still exist but would lose domain semantics. If provider invocation were removed, prompt formatting could still be verified. Today those concerns are tested together.

Testability impact: unit tests could target prompt behavior without a provider mock and runtime tests could focus on provider failure normalization (`model-runtime.test.ts` lines 129-191). This improves signal when prompt content changes for Flue, AI SDK, or knowledge source expansion.

4. Runtime boundary, HTTP Adapter, and error/failure handling

Files: `apps/web/src/lib/support-agent/runtime-boundary.ts` (lines 6-149), `apps/web/src/lib/support-agent/http-runtime.ts` (lines 25-71), `apps/web/src/lib/support-agent/api-handler.ts` (lines 20-85), `apps/web/src/App.tsx` (lines 196-199, 291-323).

Friction: `runtime-boundary.ts` mixes the runtime Interface, runtime error codes, UI-facing failure state, and linkage validation. The HTTP Adapter parses error payloads but casts successful payloads directly to `SupportAgentChatResponse`. The API handler maps failures for transport, and `App` maps failures again for display. This gives a working Seam but low Depth around transport validation and user-safe error projection.

Depth opportunity: deepen the boundary Module so runtime errors, response validation, and user-safe failure projection have clear Locality across browser, server, and React rendering. The existing `respondWithSupportAgentRuntime` guard is the best starting point because it already protects message linkage.

deletion test: Deleting `respondWithSupportAgentRuntime` would remove the only linkage check before UI rendering. Deleting `toSupportAgentFailureState` would affect both API payloads and UI alerts. These are core boundaries, not incidental helpers.

Testability impact: current tests catch linkage mismatch through `App` (`App.test.tsx` lines 454-485) and failure copy through DOM assertions (`App.test.tsx` lines 487-620). More Depth at the boundary would allow focused tests for malformed success payloads, runtime code propagation, and safe display copy without exercising form interactions.

5. Hosted deployment setup and chat runtime sharing `App` state

Files: `apps/web/src/App.tsx` (lines 125-148, 326-400), `apps/web/src/lib/support-agent/hosted-deployment-config.ts` (lines 3-128), `apps/web/src/lib/support-agent/flue-adapter.ts` (lines 8-31, 49-85), `README.md` (lines 7-16).

Friction: README direction says Flue and Cloudflare are key architecture paths, while `App` currently displays a hosted config preview next to an interactive chat demo. Both use selected source data, but the deployment config path and chat response path have different change rates. Runtime Adapter names and Cloudflare preview details live below the UI but are rendered directly by `App`.

Depth opportunity: deepen the setup/deployment Module separately from the chat runtime Module while keeping the selected-source Seam shared. This creates Leverage for future deployment state, credentials, and Cloudflare preview flow without increasing the chat component surface.

deletion test: Deleting hosted config creation should not affect chat submission. Deleting chat submission should not affect preparing a browser-safe deployment config. The current component makes those deletions possible only by carefully editing shared state and render branches.

Testability impact: hosted config tests already validate the pure config shape, while `App.test.tsx` checks DOM rendering and secret absence (lines 88-115). Deeper Locality would keep secret-safety tests close to deployment config and reduce the number of full App tests needed for deployment preview changes.

## Start Here

Open `apps/web/src/App.tsx` first. It is the highest-friction Module because it crosses UI rendering, request construction, runtime invocation, failure projection, transcript state, and hosted deployment preview. Then open `apps/web/src/lib/support-agent/runtime-boundary.ts` to preserve the existing Interface and Seam while deepening nearby Implementations.
