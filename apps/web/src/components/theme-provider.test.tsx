import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { ThemeProvider, useTheme } from "./theme-provider"

type MediaChangeEvent = { matches: boolean }
type MediaListener = (event: MediaChangeEvent) => void

function mockSystemTheme(matches: boolean) {
  const listeners = new Set<MediaListener>()
  const mediaQueryList = {
    get matches() {
      return matches
    },
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: vi.fn((_event: "change", listener: MediaListener) => {
      listeners.add(listener)
    }),
    removeEventListener: vi.fn(
      (_event: "change", listener: MediaListener) => {
        listeners.delete(listener)
      }
    ),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }

  vi.stubGlobal("matchMedia", vi.fn(() => mediaQueryList))

  return {
    setMatches(nextMatches: boolean) {
      matches = nextMatches
      listeners.forEach((listener) => listener({ matches: nextMatches }))
    },
  }
}

function ThemeProbe() {
  const { theme, setTheme } = useTheme()

  return (
    <>
      <span data-testid="theme">{theme}</span>
      <button type="button" onClick={() => setTheme("dark")}>
        Set dark
      </button>
    </>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ThemeProvider", () => {
  test("resolves the system theme and exposes an updater", () => {
    mockSystemTheme(false)

    render(
      <ThemeProvider disableTransitionOnChange={false}>
        <ThemeProbe />
      </ThemeProvider>
    )

    expect(document.documentElement).toHaveClass("light")
    expect(screen.getByTestId("theme")).toHaveTextContent("system")

    fireEvent.click(screen.getByRole("button", { name: "Set dark" }))

    expect(localStorage.getItem("theme")).toBe("dark")
    expect(screen.getByTestId("theme")).toHaveTextContent("dark")
    expect(document.documentElement).toHaveClass("dark")
  })

  test("uses a stored theme and temporarily disables transitions", () => {
    mockSystemTheme(false)
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        callback(0)
        return 1
      })
    )
    localStorage.setItem("theme", "dark")

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    )

    expect(screen.getByTestId("theme")).toHaveTextContent("dark")
    expect(document.documentElement).toHaveClass("dark")
    expect(document.head.querySelector("style")).toBeNull()
  })

  test("updates a system theme when the media query changes", () => {
    const systemTheme = mockSystemTheme(false)

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    )

    expect(document.documentElement).toHaveClass("light")

    systemTheme.setMatches(true)

    expect(document.documentElement).toHaveClass("dark")
  })

  test("toggles with the d key outside editable targets", () => {
    mockSystemTheme(true)

    render(
      <ThemeProvider>
        <input aria-label="Name" />
        <div aria-label="Rich text" contentEditable role="textbox" />
        <ThemeProbe />
      </ThemeProvider>
    )

    fireEvent.keyDown(window, { key: "x" })
    fireEvent.keyDown(window, { key: "d", repeat: true })
    fireEvent.keyDown(window, { key: "d", metaKey: true })
    fireEvent.keyDown(window, { key: "d", ctrlKey: true })
    fireEvent.keyDown(window, { key: "d", altKey: true })
    fireEvent.keyDown(screen.getByRole("button", { name: "Set dark" }), {
      key: "x",
    })
    fireEvent.keyDown(screen.getByLabelText("Name"), { key: "d" })

    const richText = screen.getByRole("textbox", { name: "Rich text" })
    richText.setAttribute("contenteditable", "true")
    expect(richText).toHaveAttribute("contenteditable", "true")
    // jsdom does not derive isContentEditable from the contenteditable attribute.
    Object.defineProperty(richText, "isContentEditable", {
      configurable: true,
      value: true,
    })
    fireEvent.keyDown(richText, { key: "d" })

    expect(localStorage.getItem("theme")).toBeNull()
    expect(document.documentElement).toHaveClass("dark")

    fireEvent.keyDown(window, { key: "d" })

    expect(localStorage.getItem("theme")).toBe("light")
    expect(document.documentElement).toHaveClass("light")

    fireEvent.keyDown(window, { key: "D" })

    expect(localStorage.getItem("theme")).toBe("dark")
    expect(document.documentElement).toHaveClass("dark")

    fireEvent.keyDown(window, { key: "d" })

    expect(localStorage.getItem("theme")).toBe("light")
    expect(document.documentElement).toHaveClass("light")
  })

  test("toggles from system light to dark", () => {
    mockSystemTheme(false)

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    )

    fireEvent.keyDown(window, { key: "d" })

    expect(localStorage.getItem("theme")).toBe("dark")
    expect(document.documentElement).toHaveClass("dark")
  })

  test("syncs valid storage events and resets invalid values", () => {
    mockSystemTheme(false)

    render(
      <ThemeProvider defaultTheme="light">
        <ThemeProbe />
      </ThemeProvider>
    )

    fireEvent(
      window,
      new StorageEvent("storage", {
        key: "theme",
        newValue: "dark",
        storageArea: sessionStorage,
      })
    )
    fireEvent(
      window,
      new StorageEvent("storage", {
        key: "other-theme",
        newValue: "dark",
        storageArea: localStorage,
      })
    )

    expect(screen.getByTestId("theme")).toHaveTextContent("light")

    fireEvent(
      window,
      new StorageEvent("storage", {
        key: "theme",
        newValue: "dark",
        storageArea: localStorage,
      })
    )

    expect(screen.getByTestId("theme")).toHaveTextContent("dark")
    expect(document.documentElement).toHaveClass("dark")

    fireEvent(
      window,
      new StorageEvent("storage", {
        key: "theme",
        newValue: "invalid",
        storageArea: localStorage,
      })
    )

    expect(screen.getByTestId("theme")).toHaveTextContent("light")
    expect(document.documentElement).toHaveClass("light")
  })

  test("throws when used outside a provider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)

    expect(() => render(<ThemeProbe />)).toThrow(
      "useTheme must be used within a ThemeProvider"
    )

    consoleError.mockRestore()
  })
})
