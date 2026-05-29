import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, expect, it, vi } from "vitest"
import { DebugSeedingPage } from "./debug-seeding"
import {
  deleteAllDebugData,
  deleteDebugDataset,
  listDebugDatasets,
  seedDebugDataset,
} from "@/lib/api/debug-seeds-client"

vi.mock("@/lib/api/debug-seeds-client", () => ({
  listDebugDatasets: vi.fn(),
  seedDebugDataset: vi.fn(),
  deleteDebugDataset: vi.fn(),
  deleteAllDebugData: vi.fn(),
}))

const richDataset = {
  id: "rich-agent-workspace",
  name: "Rich agent workspace",
  description:
    "Seeds five pre-built agents with projects, threads, memories, artifacts, and varied tool access for manual and e2e testing.",
}

const seedResult = {
  dataset: richDataset,
  counts: {
    agents: 5,
    projects: 2,
    threads: 5,
    artifacts: 6,
    savedMemories: 8,
    projectMemories: 4,
    integrationConnections: 5,
  },
}

const deleteAllResult = {
  counts: {
    agents: 0,
    projects: 0,
    threads: 0,
    artifacts: 0,
    savedMemories: 0,
    projectMemories: 0,
    integrationConnections: 0,
  },
}

beforeEach(() => {
  vi.mocked(listDebugDatasets).mockReset()
  vi.mocked(seedDebugDataset).mockReset()
  vi.mocked(deleteDebugDataset).mockReset()
  vi.mocked(deleteAllDebugData).mockReset()
  vi.mocked(listDebugDatasets).mockResolvedValue({ datasets: [richDataset] })
  vi.mocked(seedDebugDataset).mockResolvedValue(seedResult)
  vi.mocked(deleteDebugDataset).mockResolvedValue(seedResult)
  vi.mocked(deleteAllDebugData).mockResolvedValue(deleteAllResult)
})

it("lists debug datasets and seeds the rich workspace scenario", async () => {
  const user = userEvent.setup()
  render(<DebugSeedingPage />)

  expect(await screen.findByText("Debug data seeding")).toBeInTheDocument()
  expect(screen.getByText("Rich agent workspace")).toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: /Seed Rich agent workspace/ }))

  await waitFor(() => {
    expect(seedDebugDataset).toHaveBeenCalledWith("rich-agent-workspace")
  })
  expect(screen.getByText("Seeded Rich agent workspace.")).toBeInTheDocument()
  expect(screen.getByText("5 agents")).toBeInTheDocument()
  expect(screen.getByText("6 artifacts")).toBeInTheDocument()
})

it("deletes the selected debug dataset", async () => {
  const user = userEvent.setup()
  render(<DebugSeedingPage />)

  await screen.findByText("Rich agent workspace")
  await user.click(screen.getByRole("button", { name: /Delete Rich agent workspace/ }))

  await waitFor(() => {
    expect(deleteDebugDataset).toHaveBeenCalledWith("rich-agent-workspace")
  })
  expect(screen.getByText("Deleted Rich agent workspace.")).toBeInTheDocument()
})

it("deletes all data for a full local reset", async () => {
  const user = userEvent.setup()
  render(<DebugSeedingPage />)

  await screen.findByText("Rich agent workspace")
  await user.click(screen.getByRole("button", { name: "Delete all data" }))

  await waitFor(() => {
    expect(deleteAllDebugData).toHaveBeenCalledOnce()
  })
  expect(screen.getByText("Deleted all data.")).toBeInTheDocument()
  expect(screen.getByText("0 agents")).toBeInTheDocument()
})
