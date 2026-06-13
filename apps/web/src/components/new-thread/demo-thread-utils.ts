import type { ThreadListItem } from "@workspace/shared"

const DEMO_THREAD_PREFIX = "seed_thread_"

export function isDemoThread(thread: ThreadListItem): boolean {
  return thread.id.startsWith(DEMO_THREAD_PREFIX)
}

export { DEMO_THREAD_PREFIX }
