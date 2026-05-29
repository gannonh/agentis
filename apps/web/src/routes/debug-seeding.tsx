import type { ReactElement } from "react"
import { useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import {
  deleteDebugDataset,
  listDebugDatasets,
  seedDebugDataset,
  type DebugDataset,
  type DebugSeedResult,
} from "@/lib/api/debug-seeds-client"

type DebugSeedAction = "seed" | "delete"

function formatCounts(result: DebugSeedResult): string[] {
  return [
    `${result.counts.agents} agents`,
    `${result.counts.projects} projects`,
    `${result.counts.threads} threads`,
    `${result.counts.artifacts} artifacts`,
    `${result.counts.savedMemories} saved memories`,
    `${result.counts.integrationConnections} integrations`,
  ]
}

async function runDebugSeedAction(
  datasetId: string,
  action: DebugSeedAction
): Promise<DebugSeedResult> {
  if (action === "seed") return seedDebugDataset(datasetId)
  return deleteDebugDataset(datasetId)
}

function getDebugSeedActionLabel(action: DebugSeedAction): string {
  return action === "seed" ? "Seeded" : "Deleted"
}

export function DebugSeedingPage(): ReactElement {
  const [datasets, setDatasets] = useState<DebugDataset[]>([])
  const [loading, setLoading] = useState(true)
  const [workingDatasetId, setWorkingDatasetId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<DebugSeedResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    void listDebugDatasets()
      .then((response) => {
        if (!active) return
        setDatasets(response.datasets)
        setError(null)
      })
      .catch((loadError) => {
        if (!active) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load debug datasets"
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function runAction(
    dataset: DebugDataset,
    action: DebugSeedAction
  ): Promise<void> {
    setWorkingDatasetId(dataset.id)
    setError(null)
    setMessage(null)
    try {
      const result = await runDebugSeedAction(dataset.id, action)
      setLastResult(result)
      setMessage(`${getDebugSeedActionLabel(action)} ${result.dataset.name}.`)
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : `Failed to ${action} debug dataset`
      )
    } finally {
      setWorkingDatasetId(null)
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title="Debug data seeding"
        description="Seed and delete deterministic manual testing datasets for the local workspace."
      />
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          {message}
        </div>
      ) : null}
      {lastResult ? (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {formatCounts(lastResult).map((count) => (
            <span key={count} className="rounded-md bg-muted px-2 py-1">
              {count}
            </span>
          ))}
        </div>
      ) : null}
      <div className="grid gap-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading datasets…</p>
        ) : null}
        {datasets.map((dataset) => {
          const working = workingDatasetId === dataset.id
          return (
            <Card key={dataset.id}>
              <CardHeader>
                <CardTitle>{dataset.name}</CardTitle>
                <CardDescription>{dataset.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={working}
                  onClick={() => void runAction(dataset, "seed")}
                >
                  Seed {dataset.name}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={working}
                  onClick={() => void runAction(dataset, "delete")}
                >
                  Delete {dataset.name}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </PageLayout>
  )
}
