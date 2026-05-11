import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { Button, buttonVariants } from "./button"

describe("Button", () => {
  test("renders a native button with default styles and custom classes", () => {
    render(<Button className="custom-class">Save</Button>)

    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toHaveAttribute("data-slot", "button")
    expect(button).toHaveClass("custom-class", "bg-primary", "h-8")
  })

  test("builds classes for each variant and size", () => {
    expect(buttonVariants({ variant: "outline", size: "xs" })).toContain(
      "border-border"
    )
    expect(buttonVariants({ variant: "secondary", size: "sm" })).toContain(
      "bg-secondary"
    )
    expect(buttonVariants({ variant: "ghost", size: "lg" })).toContain(
      "hover:bg-muted"
    )
    expect(buttonVariants({ variant: "destructive", size: "icon" })).toContain(
      "bg-destructive/10"
    )
    expect(buttonVariants({ variant: "link", size: "icon-xs" })).toContain(
      "hover:underline"
    )
    expect(buttonVariants({ size: "icon-sm" })).toContain("size-7")
    expect(buttonVariants({ size: "icon-lg" })).toContain("size-9")
  })
})
