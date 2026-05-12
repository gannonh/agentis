import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { Input } from "./input"
import { Label } from "./label"
import { Separator } from "./separator"
import { Toggle, toggleVariants } from "./toggle"
import { ToggleGroup, ToggleGroupItem } from "./toggle-group"

describe("form control components", () => {
  test("renders labels, inputs, and separators with data slots", () => {
    render(
      <>
        <Label htmlFor="email" className="label-class">
          Email
        </Label>
        <Input
          id="email"
          className="input-class"
          type="email"
          defaultValue="team@example.com"
        />
        <Separator className="separator-class" orientation="vertical" />
      </>
    )

    expect(screen.getByText("Email")).toHaveAttribute("data-slot", "label")
    expect(screen.getByText("Email")).toHaveClass("label-class")
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "data-slot",
      "input"
    )
    expect(screen.getByLabelText("Email")).toHaveClass("input-class")
    expect(screen.getByRole("separator")).toHaveAttribute(
      "data-slot",
      "separator"
    )
    expect(screen.getByRole("separator")).toHaveClass("separator-class")
    expect(screen.getByRole("separator")).toHaveClass(
      "data-[orientation=vertical]:w-px"
    )
  })

  test("builds toggle classes for variants and sizes", () => {
    expect(toggleVariants({ variant: "outline", size: "sm" })).toContain(
      "border-input"
    )
    expect(toggleVariants({ size: "lg" })).toContain("h-9")
  })

  test("renders standalone toggles and grouped toggle items", async () => {
    render(
      <>
        <Toggle className="toggle-class" variant="outline" size="sm">
          Standalone
        </Toggle>
        <ToggleGroup
          aria-label="Sources"
          className="group-class"
          variant="outline"
          size="lg"
          spacing={2}
          orientation="vertical"
        >
          <ToggleGroupItem className="item-class" value="docs">
            Docs
          </ToggleGroupItem>
          <ToggleGroupItem value="api">API</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup aria-label="Fallback sources">
          <ToggleGroupItem variant="outline" size="sm" value="guide">
            Guide
          </ToggleGroupItem>
        </ToggleGroup>
      </>
    )

    expect(screen.getByRole("button", { name: "Standalone" })).toHaveAttribute(
      "data-slot",
      "toggle"
    )
    expect(screen.getByRole("button", { name: "Standalone" })).toHaveClass(
      "toggle-class",
      "h-7"
    )
    expect(screen.getByRole("group", { name: "Sources" })).toHaveAttribute(
      "data-orientation",
      "vertical"
    )
    expect(screen.getByRole("group", { name: "Sources" })).toHaveClass(
      "data-[orientation=vertical]:flex-col"
    )
    expect(screen.getByRole("button", { name: "Docs" })).toHaveAttribute(
      "data-slot",
      "toggle-group-item"
    )
    expect(screen.getByRole("button", { name: "Docs" })).toHaveAttribute(
      "data-variant",
      "outline"
    )
    expect(screen.getByRole("button", { name: "Docs" })).toHaveAttribute(
      "data-size",
      "lg"
    )
    expect(screen.getByRole("button", { name: "Docs" })).toHaveClass(
      "group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0"
    )
    expect(screen.getByRole("button", { name: "Guide" })).toHaveAttribute(
      "data-variant",
      "outline"
    )
    expect(screen.getByRole("button", { name: "Guide" })).toHaveAttribute(
      "data-size",
      "sm"
    )

    fireEvent.click(screen.getByRole("button", { name: "Docs" }))
    expect(screen.getByRole("button", { name: "Docs" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })
})
