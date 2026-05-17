import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, BookOpenText, PaperPlaneTilt } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import {
  createHostedSupportAgentDeploymentConfig,
  createHostedSupportAgentDeploymentStatus,
  createHostedSupportAgentHttpRuntime,
  createSupportAgentHttpRuntime,
  respondWithSupportAgentRuntime,
  supportAgentChatRequestFixture,
  toSupportAgentFailureState,
  type SupportAgentChatRequest,
  type SupportAgentChatResponse,
  type HostedSupportAgentChatRuntimeHandoff,
  type HostedSupportAgentDeploymentConfig,
  type HostedSupportAgentDeploymentStatus,
  type SupportAgentFailureState,
  type SupportAgentRuntime,
} from "./lib/support-agent"

type SupportKnowledgeSource = {
  id: string
  name: string
  description: string
  contextReference: SupportAgentChatRequest["knowledgeSources"][number]["contextReference"]
}

const sampleDocumentationSources: SupportKnowledgeSource[] = [
  {
    id: "knowledge_product_docs",
    name: "Product documentation sample",
    description: "Product setup, billing, and troubleshooting articles.",
    contextReference: {
      type: "local-documentation" as const,
      path: "docs/knowledge/product-documentation-sample.md",
    },
  },
  {
    id: "knowledge_release_notes",
    name: "Release notes sample",
    description: "Recent product updates and support-agent changes.",
    contextReference: {
      type: "local-documentation" as const,
      path: "docs/knowledge/release-notes-sample.md",
    },
  },
]

function resolveSelectedKnowledgeSource(
  selectedSourceId: string | undefined,
  hostedChatHandoff: HostedSupportAgentChatRuntimeHandoff | undefined
): SupportKnowledgeSource | undefined {
  if (!selectedSourceId) {
    return undefined
  }

  const sampleSource = sampleDocumentationSources.find(
    (source) => source.id === selectedSourceId
  )
  if (sampleSource) {
    return sampleSource
  }

  const hostedContextReference =
    hostedChatHandoff?.knowledge.contextReferences.find(
      (reference) => reference.knowledgeSourceId === selectedSourceId
    )
  if (!hostedContextReference) {
    return undefined
  }

  return {
    id: hostedContextReference.knowledgeSourceId,
    name: formatHostedKnowledgeSourceName(
      hostedContextReference.knowledgeSourceId
    ),
    description: "Hosted deployment knowledge source.",
    contextReference: {
      type: hostedContextReference.type,
      path: hostedContextReference.path,
    },
  }
}

function formatHostedKnowledgeSourceName(sourceId: string) {
  const name = sourceId.split(/[-_]+/).filter(Boolean).join(" ")

  return name
    ? name.charAt(0).toUpperCase() + name.slice(1)
    : "Hosted knowledge source"
}

const serverSupportAgentResponder = createSupportAgentHttpRuntime({
  fetch: (...args) => globalThis.fetch(...args),
})

type SubmittedSupportTurn = {
  request: SupportAgentChatRequest
  response: SupportAgentChatResponse
}

type AppProps = {
  hostedChatHandoff?: HostedSupportAgentChatRuntimeHandoff
  hostedDeploymentStatus?: HostedSupportAgentDeploymentStatus
  supportAgentResponder?: SupportAgentRuntime
}

export function App({
  hostedChatHandoff,
  hostedDeploymentStatus,
  supportAgentResponder,
}: AppProps = {}) {
  const [hostedDeploymentAccessToken, setHostedDeploymentAccessToken] =
    useState("")
  const activeSupportAgentResponder = useMemo(() => {
    if (supportAgentResponder) {
      return supportAgentResponder
    }

    if (hostedChatHandoff) {
      const deploymentAccessToken = hostedDeploymentAccessToken.trim()
      if (!deploymentAccessToken) {
        return serverSupportAgentResponder
      }

      return createHostedSupportAgentHttpRuntime({
        handoff: hostedChatHandoff,
        deploymentAccessToken,
      })
    }

    return serverSupportAgentResponder
  }, [hostedChatHandoff, hostedDeploymentAccessToken, supportAgentResponder])
  const [templateName, setTemplateName] = useState(
    hostedChatHandoff?.template.name ?? "Customer support agent"
  )
  const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>(
    hostedChatHandoff?.knowledge.sourceIds[0]
  )
  const [supportQuestion, setSupportQuestion] = useState("")
  const [supportQuestionFailure, setSupportQuestionFailure] =
    useState<SupportAgentFailureState>()
  const [hostedDeploymentConfig, setHostedDeploymentConfig] =
    useState<HostedSupportAgentDeploymentConfig>()
  const [preparedHostedDeploymentStatus, setPreparedHostedDeploymentStatus] =
    useState<HostedSupportAgentDeploymentStatus>()
  const [isSubmittingSupportQuestion, setIsSubmittingSupportQuestion] =
    useState(false)
  const [submittedTurns, setSubmittedTurns] = useState<SubmittedSupportTurn[]>(
    []
  )

  useEffect(() => {
    setTemplateName(
      hostedChatHandoff?.template.name ?? "Customer support agent"
    )
    setSelectedSourceId(hostedChatHandoff?.knowledge.sourceIds[0])
  }, [hostedChatHandoff])

  const isSubmittingRef = useRef(false)
  const nextMessageSequenceRef = useRef(0)
  const selectedSource = resolveSelectedKnowledgeSource(
    selectedSourceId,
    hostedChatHandoff
  )
  const visibleHostedDeploymentStatus =
    hostedDeploymentStatus ??
    preparedHostedDeploymentStatus ??
    (hostedChatHandoff
      ? createHostedSupportAgentDeploymentStatus({
          state: "deployed",
          deployment: {
            id: hostedChatHandoff.deployment.id,
            publicName: hostedChatHandoff.deployment.publicName,
            chatUrl: hostedChatHandoff.deployment.chatUrl,
          },
        })
      : undefined)

  function getSubmittedContext(request: SupportAgentChatRequest) {
    return [
      request.agentId,
      request.conversationId,
      request.messageId,
      request.knowledgeSourceIds.join(", "),
    ].join(" / ")
  }

  function getRuntimeLabel(response: SupportAgentChatResponse) {
    if (response.runtime?.mode === "model") {
      const runtime = response.runtime as { provider?: string; mode: string }
      const provider = runtime.provider ?? runtime.mode
      const providerLabel = runtime.provider
        ? formatProviderLabel(provider)
        : provider
      return `Runtime: ${providerLabel} / ${response.runtime.model}`
    }

    if (response.runtime?.mode === "demo") {
      return "Runtime: deterministic demo fixture"
    }

    return "Runtime: unavailable"
  }

  function formatProviderLabel(provider: string) {
    if (provider === "openai") {
      return "OpenAI"
    }

    if (provider === "anthropic") {
      return "Anthropic"
    }

    return provider.charAt(0).toUpperCase() + provider.slice(1)
  }

  function handleTemplateNameChange(value: string) {
    setTemplateName(value)
    setHostedDeploymentConfig(undefined)
    setPreparedHostedDeploymentStatus(undefined)
  }

  function handleKnowledgeSourceChange(value: string[]) {
    setSelectedSourceId(value[0])
    setHostedDeploymentConfig(undefined)
    setPreparedHostedDeploymentStatus(undefined)
  }

  function handleHostedConfigPrepare(source: SupportKnowledgeSource) {
    const config = createHostedSupportAgentDeploymentConfig({
      templateName,
      knowledgeSources: [
        {
          id: source.id,
          title: source.name,
          description: source.description,
          contextReference: source.contextReference,
        },
      ],
    })

    setHostedDeploymentConfig(config)
    setPreparedHostedDeploymentStatus(
      createHostedSupportAgentDeploymentStatus({
        state: "configured",
        deployment: {
          id: "support-agent-preview-config",
          publicName: config.template.name,
        },
      })
    )
  }

  async function handleQuestionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const question = supportQuestion.trim()
    if (
      !question ||
      !selectedSource ||
      (hostedChatHandoff && !hostedDeploymentAccessToken.trim())
    ) {
      return
    }

    if (isSubmittingRef.current) {
      return
    }

    isSubmittingRef.current = true
    setIsSubmittingSupportQuestion(true)
    setSupportQuestionFailure(undefined)

    const messageSequence = nextMessageSequenceRef.current
    nextMessageSequenceRef.current += 1
    const messageId =
      messageSequence === 0
        ? supportAgentChatRequestFixture.messageId
        : `${supportAgentChatRequestFixture.messageId}_${messageSequence + 1}`
    const knowledgeSources: SupportAgentChatRequest["knowledgeSources"] = [
      {
        id: selectedSource.id,
        title: selectedSource.name,
        description: selectedSource.description,
        contextReference: selectedSource.contextReference,
      },
    ]

    const request: SupportAgentChatRequest = {
      ...supportAgentChatRequestFixture,
      messageId,
      question,
      knowledgeSourceIds: knowledgeSources.map((source) => source.id),
      knowledgeSources,
    }
    try {
      const response = await respondWithSupportAgentRuntime(
        activeSupportAgentResponder,
        request
      )
      setSubmittedTurns((turns) => [...turns, { request, response }])
      setSupportQuestion("")
      setSupportQuestionFailure(undefined)
    } catch (error) {
      console.error("Support agent response failed", error)
      setSupportQuestionFailure(toSupportAgentFailureState(error))
      nextMessageSequenceRef.current = messageSequence
    } finally {
      isSubmittingRef.current = false
      setIsSubmittingSupportQuestion(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex min-h-14 items-center justify-between border-b border-border px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="size-2.5 shrink-0 bg-primary" aria-hidden="true" />
          <span className="text-sm font-medium">Agentis</span>
        </div>
        <Button variant="outline" size="sm">
          Templates
        </Button>
      </header>

      <main className="flex flex-1 px-4 py-8 sm:px-6 lg:px-10">
        <section className="flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex max-w-xl flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {hostedChatHandoff ? "Hosted support" : "Support template"}
              </p>
              <h1 className="text-3xl font-semibold tracking-normal text-balance">
                {hostedChatHandoff
                  ? "Hosted support-agent web chat"
                  : "Configure a support agent"}
              </h1>
            </div>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              {hostedChatHandoff
                ? "Ask the deployed support agent through the Agentis server runtime boundary."
                : "Start with a documentation-backed support agent that can answer product questions from a curated source set."}
            </p>
            {hostedChatHandoff ? (
              <div className="flex max-w-md flex-col gap-1 border border-border bg-background p-3 text-sm">
                <p>Deployment: {hostedChatHandoff.deployment.publicName}</p>
                <p className="text-xs text-muted-foreground">
                  Runtime boundary: Agentis server endpoint /{" "}
                  {hostedChatHandoff.runtime.adapter}
                </p>
              </div>
            ) : null}
            <FieldGroup className="max-w-md">
              <Field>
                <FieldLabel htmlFor="template-name">Template name</FieldLabel>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(event) =>
                    handleTemplateNameChange(event.target.value)
                  }
                />
                <FieldDescription>
                  This name appears in the setup preview.
                </FieldDescription>
              </Field>
            </FieldGroup>
            <FieldSet className="max-w-md">
              <FieldLegend>Knowledge source</FieldLegend>
              <ToggleGroup
                aria-label="Knowledge source"
                value={selectedSourceId ? [selectedSourceId] : []}
                onValueChange={handleKnowledgeSourceChange}
                className="w-full flex-col items-stretch"
                orientation="vertical"
                spacing={2}
              >
                {sampleDocumentationSources.map((source) => (
                  <ToggleGroupItem
                    value={source.id}
                    variant="outline"
                    className="h-auto justify-start gap-3 px-3 py-2 text-left"
                    aria-label={source.name}
                    key={source.id}
                  >
                    <BookOpenText data-icon="inline-start" />
                    <span className="flex flex-col gap-1">
                      <span>{source.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {source.description}
                      </span>
                    </span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FieldSet>
            <form
              className="flex max-w-md flex-col gap-3"
              onSubmit={handleQuestionSubmit}
            >
              {hostedChatHandoff ? (
                <Field>
                  <FieldLabel htmlFor="hosted-deployment-access-token">
                    Deployment access token
                  </FieldLabel>
                  <Input
                    id="hosted-deployment-access-token"
                    type="password"
                    value={hostedDeploymentAccessToken}
                    onChange={(event) =>
                      setHostedDeploymentAccessToken(event.target.value)
                    }
                    placeholder="Required for hosted preview access"
                  />
                  <FieldDescription>
                    The token is sent as a request header and is not stored in
                    the deployment handoff.
                  </FieldDescription>
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor="support-question">
                  Support question
                </FieldLabel>
                <Input
                  id="support-question"
                  value={supportQuestion}
                  onChange={(event) => setSupportQuestion(event.target.value)}
                  placeholder="Ask about setup, billing, or troubleshooting"
                />
                {supportQuestionFailure ? (
                  <FieldDescription className="text-destructive">
                    {supportQuestionFailure.userMessage}
                  </FieldDescription>
                ) : null}
              </Field>
              <Button
                type="submit"
                disabled={
                  !selectedSource ||
                  !supportQuestion.trim() ||
                  (hostedChatHandoff && !hostedDeploymentAccessToken.trim()) ||
                  isSubmittingSupportQuestion
                }
              >
                Ask support agent
                <PaperPlaneTilt data-icon="inline-end" />
              </Button>
              {supportQuestionFailure ? (
                <div
                  className="flex flex-col gap-2 border border-destructive/50 bg-background p-3 text-sm"
                  role="alert"
                >
                  <p className="font-medium">{supportQuestionFailure.title}</p>
                  <p>{supportQuestionFailure.userMessage}</p>
                  <p className="text-muted-foreground">
                    {supportQuestionFailure.maintainerMessage}
                  </p>
                  {supportQuestionFailure.runtimeCode ? (
                    <p className="text-xs text-muted-foreground">
                      Runtime code: {supportQuestionFailure.runtimeCode}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </form>
            <div className="flex max-w-md justify-end">
              <Button
                size="lg"
                type="button"
                disabled={!selectedSource}
                aria-disabled={!selectedSource}
                title={
                  selectedSource
                    ? "Prepare a browser-safe hosted deployment config."
                    : "Select a knowledge source before preparing hosted config."
                }
                onClick={
                  selectedSource
                    ? () => handleHostedConfigPrepare(selectedSource)
                    : undefined
                }
              >
                Prepare hosted config
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-4 border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Template preview</p>
              <span className="text-xs text-muted-foreground">Ready</span>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="border border-border bg-background p-3">
                <h2 className="font-medium">{templateName}</h2>
                Agent answers from selected documentation.
              </div>
              <div className="border border-border bg-background p-3">
                {selectedSource
                  ? `Selected source: ${selectedSource.name}`
                  : "Select sample documentation to continue setup."}
              </div>
              {visibleHostedDeploymentStatus ? (
                <section
                  aria-label="Hosted deployment status"
                  className="border border-border bg-background p-3"
                >
                  <p className="text-xs font-medium">
                    {visibleHostedDeploymentStatus.title}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {visibleHostedDeploymentStatus.userMessage}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {visibleHostedDeploymentStatus.maintainerMessage}
                  </p>
                  {visibleHostedDeploymentStatus.deployment?.chatUrl ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Chat URL:{" "}
                      {visibleHostedDeploymentStatus.deployment.chatUrl}
                    </p>
                  ) : null}
                  {visibleHostedDeploymentStatus.failure ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Failure code: {visibleHostedDeploymentStatus.failure.code}
                    </p>
                  ) : null}
                </section>
              ) : null}
              {hostedDeploymentConfig ? (
                <section
                  aria-label="Hosted deployment config"
                  className="border border-border bg-background p-3"
                >
                  <p className="text-xs font-medium">
                    Hosted deployment config
                  </p>
                  <dl className="mt-2 flex flex-col gap-1 text-xs">
                    <div>
                      <dt className="inline text-muted-foreground">
                        Template:{" "}
                      </dt>
                      <dd className="inline">
                        {hostedDeploymentConfig.template.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-muted-foreground">
                        Knowledge source IDs:{" "}
                      </dt>
                      <dd className="inline">
                        {hostedDeploymentConfig.knowledge.sourceIds.join(", ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-muted-foreground">
                        Runtime adapter:{" "}
                      </dt>
                      <dd className="inline">
                        {hostedDeploymentConfig.runtime.adapter}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-muted-foreground">
                        Deployment target:{" "}
                      </dt>
                      <dd className="inline">
                        {hostedDeploymentConfig.deployment.target}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-muted-foreground">
                        Credentials:{" "}
                      </dt>
                      <dd className="inline">
                        {hostedDeploymentConfig.deployment.credentials}
                      </dd>
                    </div>
                  </dl>
                </section>
              ) : null}
              {submittedTurns.map(({ request, response }) => (
                <div
                  className="flex flex-col gap-3 border border-border bg-background p-3"
                  key={request.messageId}
                >
                  <div>
                    <p className="text-xs text-muted-foreground">User</p>
                    <p>{request.question}</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {getSubmittedContext(request)}
                  </p>
                  <div>
                    <p className="text-xs text-muted-foreground">Assistant</p>
                    <p>{response.answer}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {getRuntimeLabel(response)}
                    </p>
                    <div className="mt-3 border-t border-border pt-3">
                      {response.sources.map((source) => (
                        <div className="flex flex-col gap-1" key={source.id}>
                          <p className="text-xs">Source: {source.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Source ID: {source.id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {source.excerpt}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
