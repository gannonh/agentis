import type { SupportAgentSource } from "./chat-contracts"

function formatFreshnessStatus(
  status: NonNullable<SupportAgentSource["freshnessStatus"]>
): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function SupportAgentProvenanceList({
  sources,
}: {
  sources: SupportAgentSource[]
}) {
  if (sources.length === 0) {
    return null
  }

  return (
    <section
      aria-label="Answer provenance"
      className="mt-3 flex flex-col gap-3 border-t border-border pt-3"
    >
      <p className="text-xs font-medium">Sources cited</p>
      {sources.map((source) => (
        <article className="flex flex-col gap-1" key={source.id}>
          <p className="text-xs font-medium">Source: {source.title}</p>
          <dl className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <div>
              <dt className="inline">Citation ID: </dt>
              <dd className="inline">{source.id}</dd>
            </div>
            <div>
              <dt className="inline">Knowledge source: </dt>
              <dd className="inline">{source.knowledgeSourceId}</dd>
            </div>
            {source.sourceVersionId ? (
              <div>
                <dt className="inline">Source version: </dt>
                <dd className="inline">{source.sourceVersionId}</dd>
              </div>
            ) : null}
            {source.chunkId ? (
              <div>
                <dt className="inline">Chunk: </dt>
                <dd className="inline">{source.chunkId}</dd>
              </div>
            ) : null}
            {source.locationLabel ? (
              <div>
                <dt className="inline">Location: </dt>
                <dd className="inline">{source.locationLabel}</dd>
              </div>
            ) : null}
            {source.freshnessStatus ? (
              <div>
                <dt className="inline">Freshness: </dt>
                <dd className="inline">
                  {formatFreshnessStatus(source.freshnessStatus)}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="text-xs">{source.excerpt}</p>
        </article>
      ))}
    </section>
  )
}
