import { asc, eq } from "drizzle-orm"
import type { MemoriesListResponse, SavedMemory } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { savedMemories, savedMemoryCategories } from "../db/schema.js"
import { nowIso } from "../lib/ids.js"
import { mapSavedMemory, mapSavedMemoryCategory } from "../lib/mappers.js"

const CATEGORY_SEEDS = [
  {
    id: "memory_category_user_fact",
    name: "User Fact",
    description: "Stable details a user has shared about themselves.",
  },
  {
    id: "memory_category_preference",
    name: "Preference",
    description: "How a user wants agents to work or communicate.",
  },
  {
    id: "memory_category_project_context",
    name: "Project Context",
    description: "Durable context about active projects and product direction.",
  },
  {
    id: "memory_category_domain_knowledge",
    name: "Domain Knowledge",
    description: "Reusable facts and terminology for a domain.",
  },
  {
    id: "memory_category_people",
    name: "People",
    description: "Stakeholders, teammates, and relationship notes.",
  },
  {
    id: "memory_category_active_work",
    name: "Active Work",
    description: "Current workstreams and near-term execution context.",
  },
  {
    id: "memory_category_tools_workflows",
    name: "Tools & Workflows",
    description: "Tooling choices, process notes, and workflow habits.",
  },
  {
    id: "memory_category_organization",
    name: "Organization",
    description: "Company, team, and operating context.",
  },
] as const

const MEMORY_SEEDS = [
  {
    id: "memory_seed_agentis_m07",
    content:
      "Agentis is adding a Memories foundation so users can browse how agents learn from saved context.",
    category: "Project Context",
    usageGuidance:
      "Use when explaining the M07 Memories work or deciding which learning surfaces should reference saved memories.",
    tags: ["agentis", "memories", "m07"],
    importance: "high",
    date: "2026-05-27",
    scope: "project",
    associatedAgent: "Senior Reviewer",
    source: "seeded",
    provenance: "mocked seed memory from the M07 planning artifacts",
  },
  {
    id: "memory_seed_plain_language",
    content:
      "Use concise, direct product copy when presenting learning and memory concepts.",
    category: "Preference",
    usageGuidance:
      "Apply when drafting empty states, navigation labels, and memory card metadata.",
    tags: ["copy", "tone"],
    importance: "medium",
    date: "2026-05-27",
    scope: "global",
    associatedAgent: null,
    source: "seeded",
    provenance: "mocked seed memory from product direction notes",
  },
  {
    id: "memory_seed_filtering",
    content:
      "Memory categories must stay visible even when they do not contain saved memories.",
    category: "Tools & Workflows",
    usageGuidance:
      "Use when implementing or reviewing category filters and category counts.",
    tags: ["filtering", "categories"],
    importance: "high",
    date: "2026-05-27",
    scope: "project",
    associatedAgent: null,
    source: "seeded",
    provenance: "mocked seed memory from S014 requirements",
  },
] as const

export class SavedMemoryRepository {
  constructor(private readonly db: AppDatabase) {}

  list(): MemoriesListResponse {
    this.ensureSeeds()
    const memories = this.db
      .select()
      .from(savedMemories)
      .orderBy(asc(savedMemories.date), asc(savedMemories.id))
      .all()
      .map(mapSavedMemory)
    const counts = new Map<string, number>()
    for (const memory of memories) {
      counts.set(memory.category, (counts.get(memory.category) ?? 0) + 1)
    }
    const categories = this.db
      .select()
      .from(savedMemoryCategories)
      .orderBy(asc(savedMemoryCategories.sortOrder))
      .all()
      .map((category) =>
        mapSavedMemoryCategory(category, counts.get(category.name) ?? 0)
      )
    return { categories, memories }
  }

  listByCategory(category: SavedMemory["category"]): MemoriesListResponse {
    const response = this.list()
    return {
      categories: response.categories,
      memories: response.memories.filter((memory) => memory.category === category),
    }
  }

  private ensureSeeds() {
    const now = nowIso()
    for (const [index, category] of CATEGORY_SEEDS.entries()) {
      const existing = this.db
        .select({ id: savedMemoryCategories.id })
        .from(savedMemoryCategories)
        .where(eq(savedMemoryCategories.id, category.id))
        .get()
      if (!existing) {
        this.db
          .insert(savedMemoryCategories)
          .values({ ...category, sortOrder: index })
          .run()
      }
    }

    for (const memory of MEMORY_SEEDS) {
      const existing = this.db
        .select({ id: savedMemories.id })
        .from(savedMemories)
        .where(eq(savedMemories.id, memory.id))
        .get()
      if (!existing) {
        this.db
          .insert(savedMemories)
          .values({
            ...memory,
            tagsJson: JSON.stringify(memory.tags),
            createdAt: now,
            updatedAt: now,
          })
          .run()
      }
    }
  }
}
