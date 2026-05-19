import {
  supportKnowledgeRuntimeErrorMessages,
  type SupportKnowledgeRuntimeErrorCode,
} from "./knowledge-contracts"

export class SupportKnowledgeRuntimeError extends Error {
  readonly code: SupportKnowledgeRuntimeErrorCode

  constructor({
    code,
    message,
  }: {
    code: SupportKnowledgeRuntimeErrorCode
    message?: string
  }) {
    super(message ?? supportKnowledgeRuntimeErrorMessages[code])
    this.name = "SupportKnowledgeRuntimeError"
    this.code = code
  }
}
