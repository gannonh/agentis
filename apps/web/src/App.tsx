import { useState } from "react"
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
  supportAgentChatRequestFixture,
  supportAgentChatResponseFixture,
  type SupportAgentChatRequest,
  type SupportAgentChatResponse,
} from "./lib/support-agent"

const sampleDocumentationSource = {
  id: "knowledge_product_docs",
  name: "Product documentation sample",
}

export function App() {
  const [templateName, setTemplateName] = useState("Customer support agent")
  const [selectedSourceId, setSelectedSourceId] = useState<string>()
  const [supportQuestion, setSupportQuestion] = useState("")
  const [submittedRequest, setSubmittedRequest] =
    useState<SupportAgentChatRequest>()
  const [submittedResponse, setSubmittedResponse] =
    useState<SupportAgentChatResponse>()
  const selectedSource = selectedSourceId === sampleDocumentationSource.id
    ? sampleDocumentationSource
    : undefined
  const submittedQuestion = submittedRequest?.question
  const submittedContext = submittedRequest
    ? [
        submittedRequest.agentId,
        submittedRequest.conversationId,
        submittedRequest.messageId,
        submittedRequest.knowledgeSourceIds.join(", "),
      ].join(" / ")
    : undefined

  function handleQuestionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const question = supportQuestion.trim()
    if (!question || !selectedSource) {
      return
    }

    setSubmittedRequest({
      ...supportAgentChatRequestFixture,
      question,
      knowledgeSourceIds: [selectedSource.id],
    })
    setSubmittedResponse({
      ...supportAgentChatResponseFixture,
      inReplyToMessageId: supportAgentChatRequestFixture.messageId,
    })
    setSupportQuestion("")
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
                  onChange={(event) => setTemplateName(event.target.value)}
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
                onValueChange={(value) => setSelectedSourceId(value[0])}
                className="w-full flex-col items-stretch"
                orientation="vertical"
                spacing={2}
              >
                <ToggleGroupItem
                  value={sampleDocumentationSource.id}
                  variant="outline"
                  className="h-auto justify-start gap-3 px-3 py-2 text-left"
                  aria-label={sampleDocumentationSource.name}
                >
                  <BookOpenText data-icon="inline-start" />
                  <span className="flex flex-col gap-1">
                    <span>{sampleDocumentationSource.name}</span>
                    <span className="text-muted-foreground text-xs font-normal">
                      Product setup, billing, and troubleshooting articles.
                    </span>
                  </span>
                </ToggleGroupItem>
              </ToggleGroup>
            </FieldSet>
            <div>
              <Button size="lg">
                Start with support agent
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
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
              </Field>
              <Button
                type="submit"
                disabled={!selectedSource || !supportQuestion.trim()}
              >
                Ask support agent
                <PaperPlaneTilt data-icon="inline-end" />
              </Button>
            </form>
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
              {submittedRequest ? (
                <div className="border-border bg-background flex flex-col gap-3 border p-3">
                  <div>
                    <p className="text-muted-foreground text-xs">User</p>
                    <p>{submittedQuestion}</p>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {submittedContext}
                  </p>
                  {submittedResponse ? (
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Assistant
                      </p>
                      <p>{submittedResponse.answer}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
