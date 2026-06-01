import {
  documentPublicSchema,
  type Document,
  type DocumentPublic,
} from "@workspace/shared"

export function toPublicDocument(document: Document): DocumentPublic {
  return documentPublicSchema.parse(document)
}
