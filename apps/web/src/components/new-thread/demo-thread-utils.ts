const DEMO_THREAD_PREFIX = "seed_thread_"
export const HOME_THREAD_SECTION_LIMIT = 3

export function partitionHomeThreads<T extends { id: string }>(
  threads: T[],
  limit = HOME_THREAD_SECTION_LIMIT
): { demoThreads: T[]; recentThreads: T[] } {
  const demoThreads: T[] = []
  const recentThreads: T[] = []

  for (const thread of threads) {
    const isDemoThread = thread.id.startsWith(DEMO_THREAD_PREFIX)

    if (isDemoThread && demoThreads.length < limit) {
      demoThreads.push(thread)
    } else if (!isDemoThread && recentThreads.length < limit) {
      recentThreads.push(thread)
    }

    if (demoThreads.length >= limit && recentThreads.length >= limit) {
      break
    }
  }

  return { demoThreads, recentThreads }
}
