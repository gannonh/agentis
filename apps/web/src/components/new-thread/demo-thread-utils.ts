export const DEMO_THREAD_PREFIX = "seed_thread_"

export function isDemoThreadId(threadId: string): boolean {
  return threadId.startsWith(DEMO_THREAD_PREFIX)
}

export function selectDemoThreads<T extends { id: string }>(
  threads: T[],
  limit: number
): T[] {
  return threads.filter((thread) => isDemoThreadId(thread.id)).slice(0, limit)
}

export function selectRecentThreads<T extends { id: string }>(
  threads: T[],
  limit: number
): T[] {
  return threads
    .filter((thread) => !isDemoThreadId(thread.id))
    .slice(0, limit)
}
