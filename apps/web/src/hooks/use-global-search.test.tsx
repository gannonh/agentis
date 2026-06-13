import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { GlobalSearchProvider } from "@/components/shell/global-search-provider"
import { useGlobalSearch } from "./use-global-search"
import { isEditableTarget } from "@/lib/keyboard"

function renderGlobalSearchHook() {
  return renderHook(() => useGlobalSearch(), {
    wrapper: GlobalSearchProvider,
  })
}

describe("useGlobalSearch", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  it("opens the palette from the global shortcut", () => {
    const { result } = renderGlobalSearchHook()

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true })
      )
    })

    expect(result.current.open).toBe(true)
  })

  it("ignores the shortcut while typing in an input", () => {
    const input = document.createElement("input")
    document.body.appendChild(input)
    input.focus()

    const { result } = renderGlobalSearchHook()

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      })
      Object.defineProperty(event, "target", { value: input })
      window.dispatchEvent(event)
    })

    expect(result.current.open).toBe(false)
    expect(isEditableTarget(input)).toBe(true)
  })
})
