import { useRef, useState } from "react"
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
  createSupportAgentHttpRuntime,
  respondWithSupportAgentRuntime,
  supportAgentChatRequestFixture,
  toSupportAgentFailureState,
  type SupportAgentChatRequest,
  type SupportAgentChatResponse,
  type HostedSupportAgentDeploymentConfig,
  type SupportAgentFailureState,
  type SupportAgentRuntime,
} from "./lib/support-agent"

const sampleDocumentationSources = [
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

type SampleDocumentationSource = (typeof sampleDocumentationSources)[number]

const serverSupportAgentResponder = createSupportAgentHttpRuntime({
  fetch: (...args) => globalThis.fetch(...args),
})

type SubmittedSupportTurn = {
  request: SupportAgentChatRequest
  response: SupportAgentChatResponse
}

type AppProps = {
  supportAgentResponder?: SupportAgentRuntime
}

export function App({
  supportAgentResponder = serverSupportAgentResponder,
}: AppProps = {}) {
  const [templateName, setTemplateName] = useState("Customer support agent")
  const [selectedSourceId, setSelectedSourceId] = useState<string>()
  const [supportQuestion, setSupportQuestion] = useState("")
  const [supportQuestionFailure, setSupportQuestionFailure] =
    useState<SupportAgentFailureState>()
  const [hostedDeploymentConfig, setHostedDeploymentConfig] =
    useState<HostedSupportAgentDeploymentConfig>()
  const [isSubmittingSupportQuestion, setIsSubmittingSupportQuestion] =
    useState(false)
  const [submittedTurns, setSubmittedTurns] = useState<SubmittedSupportTurn[]>(
    []
  )
  const isSubmittingRef = useRef(false)
  const nextMessageSequenceRef = useRef(0)
  const selectedSource = sampleDocumentationSources.find(
    (source) => source.id === selectedSourceId
  )

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
  }

  function handleKnowledgeSourceChange(value: string[]) {
    setSelectedSourceId(value[0])
    setHostedDeploymentConfig(undefined)
  }

  function handleHostedConfigPrepare(source: SampleDocumentationSource) {
    setHostedDeploymentConfig(
      createHostedSupportAgentDeploymentConfig({
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
    )
  }

  async function handleQuestionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const question = supportQuestion.trim()
    if (!question || !selectedSource) {
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
    const messageId = messageSequence === 0
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
        supportAgentResponder,
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
    <div className="bg-background flex min-h-svh flex-col">
      <header className="border-border flex min-h-14 items-center justify-between border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-primary size-2.5 shrink-0" aria-hidden="true" />
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
              <p className="text-muted-foreground text-xs font-medium uppercase">
                Support template
              </p>
              <h1 className="text-3xl font-semibold tracking-normal text-balance">
                Configure a support agent
              </h1>
            </div>
            <p className="text-muted-foreground max-w-lg text-base leading-7">
              Start with a documentation-backed support agent that can answer
              product questions from a curated source set.
            </p>
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
                      <span className="text-muted-foreground text-xs font-normal">
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
                  isSubmittingSupportQuestion
                }
              >
                Ask support agent
                <PaperPlaneTilt data-icon="inline-end" />
              </Button>
              {supportQuestionFailure ? (
                <div
                  className="border-destructive/50 bg-background flex flex-col gap-2 border p-3 text-sm"
                  role="alert"
                >
                  <p className="font-medium">{supportQuestionFailure.title}</p>
                  <p>{supportQuestionFailure.userMessage}</p>
                  <p className="text-muted-foreground">
                    {supportQuestionFailure.maintainerMessage}
                  </p>
                  {supportQuestionFailure.runtimeCode ? (
                    <p className="text-muted-foreground text-xs">
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

          <div className="border-border bg-muted/40 flex w-full max-w-sm flex-col gap-4 border p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Template preview</p>
              <span className="text-muted-foreground text-xs">Ready</span>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="border-border bg-background border p-3">
                <h2 className="font-medium">{templateName}</h2>
                Agent answers from selected documentation.
              </div>
              <div className="border-border bg-background border p-3">
                {selectedSource
                  ? `Selected source: ${selectedSource.name}`
                  : "Select sample documentation to continue setup."}
              </div>
              {hostedDeploymentConfig ? (
                <section
                  aria-label="Hosted deployment config"
                  className="border-border bg-background border p-3"
                >
                  <p className="text-xs font-medium">Hosted deployment config</p>
                  <dl className="mt-2 flex flex-col gap-1 text-xs">
                    <div>
                      <dt className="text-muted-foreground inline">Template: </dt>
                      <dd className="inline">{hostedDeploymentConfig.template.name}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline">Knowledge source IDs: </dt>
                      <dd className="inline">
                        {hostedDeploymentConfig.knowledge.sourceIds.join(", ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline">Runtime adapter: </dt>
                      <dd className="inline">
                        {hostedDeploymentConfig.runtime.adapter}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline">Deployment target: </dt>
                      <dd className="inline">
                        {hostedDeploymentConfig.deployment.target}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline">credentials: </dt>
                      <dd className="inline">
                        {hostedDeploymentConfig.deployment.credentials}
                      </dd>
                    </div>
                  </dl>
                </section>
              ) : null}
              {submittedTurns.map(({ request, response }) => (
                <div
                  className="border-border bg-background flex flex-col gap-3 border p-3"
                  key={request.messageId}
                >
                  <div>
                    <p className="text-muted-foreground text-xs">User</p>
                    <p>{request.question}</p>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {getSubmittedContext(request)}
                  </p>
                  <div>
                    <p className="text-muted-foreground text-xs">Assistant</p>
                    <p>{response.answer}</p>
                    <p className="text-muted-foreground mt-2 text-xs">
                      {getRuntimeLabel(response)}
                    </p>
                    <div className="border-border mt-3 border-t pt-3">
                      {response.sources.map((source) => (
                        <div className="flex flex-col gap-1" key={source.id}>
                          <p className="text-xs">Source: {source.title}</p>
                          <p className="text-muted-foreground text-xs">
                            Source ID: {source.id}
                          </p>
                          <p className="text-muted-foreground text-xs">
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
