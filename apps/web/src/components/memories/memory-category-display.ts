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

const categoryTone = "border-border bg-muted/40 text-muted-foreground"

const CATEGORY_DISPLAY: Record<SavedMemoryCategoryKey, MemoryCategoryDisplay> =
  {
    memory_category_user_fact: {
      icon: UserIcon,
      tone: categoryTone,
    },
    memory_category_preference: {
      icon: FavouriteIcon,
      tone: categoryTone,
    },
    memory_category_project_context: {
      icon: FolderLibraryIcon,
      tone: categoryTone,
    },
    memory_category_domain_knowledge: {
      icon: BookOpen01Icon,
      tone: categoryTone,
    },
    memory_category_people: {
      icon: UserGroupIcon,
      tone: categoryTone,
    },
    memory_category_active_work: {
      icon: Briefcase01Icon,
      tone: categoryTone,
    },
    memory_category_tools_workflows: {
      icon: Wrench01Icon,
      tone: categoryTone,
    },
    memory_category_organization: {
      icon: Building05Icon,
      tone: categoryTone,
    },
  }

export function getCategoryDisplay(
  category: SavedMemoryCategoryKey
): MemoryCategoryDisplay {
  return CATEGORY_DISPLAY[category]
}
