import {
  BookOpen01Icon,
  Briefcase01Icon,
  Building05Icon,
  FavouriteIcon,
  FolderLibraryIcon,
  UserGroupIcon,
  UserIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import type { SavedMemoryCategoryKey } from "@workspace/shared"

type MemoryCategoryDisplay = {
  icon: IconSvgElement
  tone: string
}

const CATEGORY_DISPLAY: Record<SavedMemoryCategoryKey, MemoryCategoryDisplay> =
  {
    memory_category_user_fact: {
      icon: UserIcon,
      tone: "border-blue-500/40 bg-blue-500/15 text-blue-300",
    },
    memory_category_preference: {
      icon: FavouriteIcon,
      tone: "border-pink-500/40 bg-pink-500/15 text-pink-300",
    },
    memory_category_project_context: {
      icon: FolderLibraryIcon,
      tone: "border-slate-500/40 bg-slate-500/15 text-slate-300",
    },
    memory_category_domain_knowledge: {
      icon: BookOpen01Icon,
      tone: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    },
    memory_category_people: {
      icon: UserGroupIcon,
      tone: "border-violet-500/40 bg-violet-500/15 text-violet-300",
    },
    memory_category_active_work: {
      icon: Briefcase01Icon,
      tone: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
    },
    memory_category_tools_workflows: {
      icon: Wrench01Icon,
      tone: "border-orange-500/40 bg-orange-500/15 text-orange-300",
    },
    memory_category_organization: {
      icon: Building05Icon,
      tone: "border-zinc-500/40 bg-zinc-500/15 text-zinc-300",
    },
  }

export function getCategoryDisplay(
  category: SavedMemoryCategoryKey
): MemoryCategoryDisplay {
  return CATEGORY_DISPLAY[category]
}
