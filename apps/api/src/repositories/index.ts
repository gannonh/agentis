import type { AppDatabase } from "../db/client.js"
import { MessageRepository } from "./message-repository.js"
import { RunRepository } from "./run-repository.js"
import { RunStepRepository } from "./run-step-repository.js"
import { ThreadRepository } from "./thread-repository.js"

export function createRepositories(db: AppDatabase) {
  return {
    threads: new ThreadRepository(db),
    messages: new MessageRepository(db),
    runs: new RunRepository(db),
    steps: new RunStepRepository(db),
  }
}

export type Repositories = ReturnType<typeof createRepositories>
