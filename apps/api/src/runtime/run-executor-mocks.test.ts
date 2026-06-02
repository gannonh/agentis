import { afterEach, describe, expect, it, vi } from "vitest"
import { createDefaultMockLanguageModel } from "./run-executor-mocks.js"

type StreamableModel = {
  doStream: () => Promise<{ stream: ReadableStream<unknown> }>
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("run executor mocks", () => {
  it("clears the default mock stream timer when the stream is cancelled", async () => {
    vi.useFakeTimers()
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval")
    const model = createDefaultMockLanguageModel("") as unknown as StreamableModel
    const { stream } = await model.doStream()
    const reader = stream.getReader()

    await reader.read()
    await reader.cancel()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
