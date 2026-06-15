import type { ComposioServices } from "../composio/index.js"
import type { AppConfig } from "../config.js"
import { nowIso } from "../lib/ids.js"
import type { Repositories } from "../repositories/index.js"
import { ScheduleProducer } from "./schedule-producer.js"

export type InvocationWorkerOptions = {
  pollIntervalMs?: number
  staleClaimMs?: number
}

export class InvocationWorker {
  private timer: ReturnType<typeof setInterval> | undefined
  private running = false
  private readonly producer: ScheduleProducer
  private readonly pollIntervalMs: number
  private readonly staleClaimMs: number

  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig,
    private readonly services: ComposioServices,
    options: InvocationWorkerOptions = {}
  ) {
    this.producer = new ScheduleProducer(repos, config, services)
    this.pollIntervalMs =
      options.pollIntervalMs ?? readPositiveInt("AGENTIS_WORKER_POLL_MS", 30_000)
    this.staleClaimMs =
      options.staleClaimMs ??
      readPositiveInt("AGENTIS_WORKER_STALE_CLAIM_MS", 15 * 60_000)
  }

  start() {
    if (this.timer) return
    void this.tick().catch((error) => {
      console.error("[agentis-worker] initial tick failed", error)
    })
    this.timer = setInterval(() => {
      void this.tick().catch((error) => {
        console.error("[agentis-worker] scheduled tick failed", error)
      })
    }, this.pollIntervalMs)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }

  async tick(now = nowIso()) {
    if (this.running) return
    this.running = true
    try {
      this.reclaimStaleClaims(now)
      await this.producer.processDueSchedules(now)
    } finally {
      this.running = false
    }
  }

  private reclaimStaleClaims(now: string) {
    const staleBefore = new Date(
      Date.parse(now) - this.staleClaimMs
    ).toISOString()
    const staleClaims = this.repos.agentInvocationRuns.listStaleClaims(
      staleBefore
    )

    for (const claim of staleClaims) {
      const failureReason = "Stale invocation claim recovered by worker."
      this.repos.agentInvocationRuns.markStatus(claim.id, {
        status: "failed",
        failureReason,
        finishedAt: now,
      })

      if (claim.sourceType === "schedule") {
        this.repos.agentSchedules.recordRunResult({
          id: claim.sourceId,
          lastRunStatus: "failed",
          lastFailureReason: failureReason,
          ranAt: now,
        })
      }
    }
  }
}

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
