# Agentis Context

Agentis is a product for configuring and deploying useful agents without requiring users to write code. This context records the product language used by the current support-agent template and hosted runtime work.

## Language

**Agentis**:
The product that owns user-facing agent configuration, routing, persistence decisions, integrations, deployment state, and policy.
_Avoid_: Agent platform, app shell

**Agent**:
A configured assistant that answers or acts for a user through Agentis-managed channels.
_Avoid_: Bot, workflow

**Support Agent**:
An agent that answers customer questions from selected knowledge sources and returns cited answers.
_Avoid_: Help bot, docs chatbot

**Support-Agent Template**:
The starting configuration flow for creating a documentation-backed support agent.
_Avoid_: Template screen, starter flow

**Knowledge Source**:
A user-selected source of product or project knowledge that a support agent may use when answering.
_Avoid_: Data source, document, file

**Documentation Context**:
The answer-ready content resolved from selected knowledge sources for a support-agent request.
_Avoid_: Prompt context, docs payload

**Conversation**:
A sequence of user and assistant turns scoped to one agent interaction.
_Avoid_: Session, thread

**Message**:
A single user or assistant entry inside a conversation.
_Avoid_: Chat item, event

**Source Reference**:
The public citation metadata shown with a support-agent answer.
_Avoid_: Provenance, citation blob

**Hosted Deployment Config**:
A browser-safe handoff that describes a support-agent template, selected knowledge sources, runtime adapter, and deployment intent.
_Avoid_: Deployment manifest, runtime config

**Preview Deployment**:
A maintainer-triggered hosted deployment check for a support agent before production deployment.
_Avoid_: Publish, release

**Runtime Adapter**:
The Agentis-owned mapping between Agentis support-agent contracts and a concrete runtime such as Flue.
_Avoid_: Runtime integration, backend adapter

## Relationships

- An **Agentis** user configures one or more **Agents**.
- A **Support-Agent Template** creates or previews exactly one **Support Agent**.
- A **Support Agent** answers within one or more **Conversations**.
- A **Conversation** contains one or more **Messages**.
- A **Support Agent** uses one or more selected **Knowledge Sources**.
- **Documentation Context** is resolved from selected **Knowledge Sources**.
- A support-agent answer includes zero or more **Source References**.
- A **Hosted Deployment Config** describes one **Support-Agent Template** and one deployment intent.
- A **Preview Deployment** consumes one **Hosted Deployment Config**.
- A **Runtime Adapter** maps Agentis support-agent requests and responses to one concrete runtime.

## Example dialogue

> **Dev:** "When the user selects a **Knowledge Source**, do we send the raw file to the **Support Agent**?"
> **Domain expert:** "No. Agentis resolves **Documentation Context** from the selected **Knowledge Source**, and the answer returns public **Source References**."
>
> **Dev:** "Does **Prepare hosted config** create the **Preview Deployment**?"
> **Domain expert:** "No. It creates a **Hosted Deployment Config** that a maintainer command can use to start a **Preview Deployment**."

## Flagged ambiguities

- "session" appears in runtime research, but product-facing support-agent chat should use **Conversation** unless referring to a specific runtime's storage model.
- "provenance" appears in runtime code and evals, but UI-facing answer metadata should use **Source Reference**.
- "document" can mean a file, rendered content, or selected source; use **Knowledge Source** for user-selectable knowledge and **Documentation Context** for resolved answer content.
