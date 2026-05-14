import type { SupportAgentChatRequest } from "./chat-contracts"

export type SupportAgentEvalScoringDimension =
  | "correctness"
  | "grounding"
  | "latency"
  | "cost"

export type SupportAgentExpectedGrounding = {
  requiredKnowledgeSourceIds: string[]
  requiredSourceIds: string[]
  notes: string
}

export type SupportAgentEvalKnowledgeSourceId =
  | "knowledge_product_docs"
  | "knowledge_release_notes"

export type SupportAgentEvalQuestion = {
  id: string
  description: string
  request: SupportAgentChatRequest
  expectedAnswerTerms: string[]
  expectedGrounding: SupportAgentExpectedGrounding
}

export const supportAgentEvalScoringDimensions: SupportAgentEvalScoringDimension[] = [
  "correctness",
  "grounding",
  "latency",
  "cost",
]

const supportAgentEvalKnowledgeSources: SupportAgentChatRequest["knowledgeSources"] = [
  {
    id: "knowledge_product_docs",
    title: "Product documentation sample",
    description: "Product setup, billing, and troubleshooting articles.",
    contextReference: {
      type: "local-documentation",
      path: "docs/knowledge/product-documentation-sample.md",
    },
  },
  {
    id: "knowledge_release_notes",
    title: "Release notes sample",
    description: "Recent product updates and support-agent changes.",
    contextReference: {
      type: "local-documentation",
      path: "docs/knowledge/release-notes-sample.md",
    },
  },
]

export const supportAgentEvalQuestions: SupportAgentEvalQuestion[] = [
  createEvalQuestion({
    id: "support-agent-eval-001",
    description: "Setup question grounded in product documentation.",
    question: "How do I connect product documentation to a support agent?",
    knowledgeSourceIds: ["knowledge_product_docs"],
    expectedAnswerTerms: ["Product documentation sample", "setup"],
    expectedGroundingNotes: "Answer should cite the product docs setup excerpt.",
  }),
  createEvalQuestion({
    id: "support-agent-eval-002",
    description: "Billing routing question grounded in product documentation.",
    question: "Which article should support use for invoice or payment failure questions?",
    knowledgeSourceIds: ["knowledge_product_docs"],
    expectedAnswerTerms: ["billing", "invoice", "payment"],
    expectedGroundingNotes: "Answer should route billing questions to the billing article.",
  }),
  createEvalQuestion({
    id: "support-agent-eval-003",
    description: "Troubleshooting escalation question grounded in product documentation.",
    question: "What details should the support agent ask for before escalating a troubleshooting issue?",
    knowledgeSourceIds: ["knowledge_product_docs"],
    expectedAnswerTerms: ["workspace URL", "affected feature", "latest error"],
    expectedGroundingNotes: "Answer should list the three troubleshooting details from product docs.",
  }),
  createEvalQuestion({
    id: "support-agent-eval-004",
    description: "Release note capability question grounded in release notes.",
    question: "What changed in May for selected documentation context?",
    knowledgeSourceIds: ["knowledge_release_notes"],
    expectedAnswerTerms: ["May", "selected documentation context", "Agentis GUI"],
    expectedGroundingNotes: "Answer should cite the May release note source.",
  }),
  createEvalQuestion({
    id: "support-agent-eval-005",
    description: "Runtime handoff question grounded in release notes.",
    question: "When does Agentis resolve local demo docs before handing input to the runtime adapter?",
    knowledgeSourceIds: ["knowledge_release_notes"],
    expectedAnswerTerms: ["local demo docs", "runtime adapter", "Flue-ready"],
    expectedGroundingNotes: "Answer should mention the release note runtime handoff language.",
  }),
  createEvalQuestion({
    id: "support-agent-eval-006",
    description: "Source selection question grounded in both documentation sources.",
    question: "Which source covers setup and which source covers recent support-agent changes?",
    knowledgeSourceIds: ["knowledge_product_docs", "knowledge_release_notes"],
    expectedAnswerTerms: ["Product documentation sample", "Release notes sample"],
    expectedGroundingNotes: "Answer should distinguish the two selected sources.",
  }),
  createEvalQuestion({
    id: "support-agent-eval-007",
    description: "Provenance question grounded in product documentation.",
    question: "What source should be cited when answering support setup questions?",
    knowledgeSourceIds: ["knowledge_product_docs"],
    expectedAnswerTerms: ["Product documentation sample", "source_product_docs_setup"],
    expectedGroundingNotes: "Returned provenance should include source_product_docs_setup.",
  }),
  createEvalQuestion({
    id: "support-agent-eval-008",
    description: "Provenance question grounded in release notes.",
    question: "What source should be cited for the May support-agent release note?",
    knowledgeSourceIds: ["knowledge_release_notes"],
    expectedAnswerTerms: ["Release notes sample", "source_release_notes_may"],
    expectedGroundingNotes: "Returned provenance should include source_release_notes_may.",
  }),
  createEvalQuestion({
    id: "support-agent-eval-009",
    description: "Knowledge lifecycle question grounded in selected sources.",
    question: "Can the support agent answer from both billing docs and release notes in one response?",
    knowledgeSourceIds: ["knowledge_product_docs", "knowledge_release_notes"],
    expectedAnswerTerms: ["billing", "release notes", "selected"],
    expectedGroundingNotes: "Answer should use both selected source records.",
  }),
  createEvalQuestion({
    id: "support-agent-eval-010",
    description: "Grounding boundary question grounded in product documentation.",
    question: "If no selected source covers a customer's workspace error, what should the support agent ask for?",
    knowledgeSourceIds: ["knowledge_product_docs"],
    expectedAnswerTerms: ["workspace URL", "affected feature", "latest error"],
    expectedGroundingNotes: "Answer should avoid unsupported claims and use troubleshooting criteria.",
  }),
]

function createEvalQuestion({
  id,
  description,
  question,
  knowledgeSourceIds,
  expectedAnswerTerms,
  expectedGroundingNotes,
}: {
  id: string
  description: string
  question: string
  knowledgeSourceIds: SupportAgentEvalKnowledgeSourceId[]
  expectedAnswerTerms: string[]
  expectedGroundingNotes: string
}): SupportAgentEvalQuestion {
  return {
    id,
    description,
    request: {
      agentId: "agent_support_template",
      conversationId: `conversation_${id}`,
      messageId: `message_${id}`,
      question,
      knowledgeSourceIds,
      knowledgeSources: supportAgentEvalKnowledgeSources,
    },
    expectedAnswerTerms,
    expectedGrounding: {
      requiredKnowledgeSourceIds: knowledgeSourceIds,
      requiredSourceIds: knowledgeSourceIds.map(toExpectedSourceId),
      notes: expectedGroundingNotes,
    },
  }
}

function toExpectedSourceId(knowledgeSourceId: SupportAgentEvalKnowledgeSourceId): string {
  if (knowledgeSourceId === "knowledge_release_notes") {
    return "source_release_notes_may"
  }

  return "source_product_docs_setup"
}
