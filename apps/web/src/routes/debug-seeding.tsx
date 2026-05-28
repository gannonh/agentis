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

function formatCounts(result: DebugSeedResult) {
  return [
    `${result.counts.agents} agents`,
    `${result.counts.projects} projects`,
    `${result.counts.threads} threads`,
    `${result.counts.artifacts} artifacts`,
    `${result.counts.savedMemories} saved memories`,
    `${result.counts.integrationConnections} integrations`,
  ]
}

export function DebugSeedingPage() {
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
    action: "seed" | "delete"
  ) {
    setWorkingDatasetId(dataset.id)
    setError(null)
    setMessage(null)
    try {
      const result =
        action === "seed"
          ? await seedDebugDataset(dataset.id)
          : await deleteDebugDataset(dataset.id)
      setLastResult(result)
      setMessage(
        `${action === "seed" ? "Seeded" : "Deleted"} ${result.dataset.name}.`
      )
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
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="border-border bg-muted/40 rounded-md border px-3 py-2 text-sm">
          {message}
        </div>
      ) : null}
      {lastResult ? (
        <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
          {formatCounts(lastResult).map((count) => (
            <span key={count} className="bg-muted rounded-md px-2 py-1">
              {count}
            </span>
          ))}
        </div>
      ) : null}
      <div className="grid gap-4">
        {loading ? <p className="text-muted-foreground text-sm">Loading datasets…</p> : null}
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
