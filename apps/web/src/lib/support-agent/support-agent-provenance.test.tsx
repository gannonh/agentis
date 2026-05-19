import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { supportAgentChatResponseFixture } from "./chat-fixtures"
import { SupportAgentProvenanceList } from "./support-agent-provenance"

describe("SupportAgentProvenanceList", () => {
  test("renders browser-safe provenance from retrieved chunks", () => {
    render(
      <SupportAgentProvenanceList sources={supportAgentChatResponseFixture.sources} />
    )

    expect(screen.getByLabelText("Answer provenance")).toBeInTheDocument()
    expect(
      screen.getByText("Source: Product documentation sample")
    ).toBeInTheDocument()
    expect(
      screen.getByText("citation_chunk_product_docs_setup")
    ).toBeInTheDocument()
    expect(screen.getByText("knowledge_product_docs")).toBeInTheDocument()
    expect(
      screen.getByText("ksrcv_product_docs_2026_05_19")
    ).toBeInTheDocument()
    expect(screen.getByText("chunk_product_docs_setup")).toBeInTheDocument()
    expect(screen.getByText("Citation ID:")).toBeInTheDocument()
    expect(screen.getByText("Knowledge source:")).toBeInTheDocument()
    expect(screen.getByText("Freshness:")).toBeInTheDocument()
    expect(screen.getByText("Fresh")).toBeInTheDocument()
    expect(
      screen.getByText("Select Product documentation sample during setup.")
    ).toBeInTheDocument()
  })

  test("renders nothing when sources are empty", () => {
    const { container } = render(<SupportAgentProvenanceList sources={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
