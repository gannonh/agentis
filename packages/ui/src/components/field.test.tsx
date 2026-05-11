import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "./field"

describe("Field components", () => {
  test("renders field structure with custom classes and orientations", () => {
    render(
      <FieldSet className="set-class">
        <FieldLegend className="legend-class" variant="label">
          Details
        </FieldLegend>
        <FieldGroup className="group-class">
          <Field className="field-class" orientation="horizontal">
            <FieldLabel htmlFor="name" className="label-class">
              Name
            </FieldLabel>
            <FieldContent className="content-class">
              <FieldTitle className="title-class">Public name</FieldTitle>
              <FieldDescription className="description-class">
                Visible in previews.
              </FieldDescription>
            </FieldContent>
          </Field>
          <Field className="responsive-field" orientation="responsive">
            Responsive field
          </Field>
        </FieldGroup>
      </FieldSet>
    )

    expect(document.querySelector(".field-class")).toHaveClass(
      "field-class",
      "flex-row"
    )
    expect(screen.getByText("Details")).toHaveAttribute(
      "data-variant",
      "label"
    )
    expect(screen.getByText("Public name")).toHaveClass("title-class")
    expect(screen.getByText("Visible in previews.")).toHaveClass(
      "description-class"
    )
    expect(screen.getByText("Responsive field")).toHaveClass(
      "responsive-field",
      "@md/field-group:flex-row"
    )
  })

  test("renders field separators with and without content", () => {
    render(
      <>
        <FieldSeparator className="plain-separator" />
        <FieldSeparator className="labeled-separator">or</FieldSeparator>
      </>
    )

    expect(document.querySelector(".plain-separator")).toHaveAttribute(
      "data-content",
      "false"
    )
    expect(screen.getByText("or")).toHaveAttribute(
      "data-slot",
      "field-separator-content"
    )
  })

  test("renders field errors for children and unique validation messages", () => {
    const { rerender } = render(
      <FieldError className="error-class">Required</FieldError>
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Required")
    expect(screen.getByRole("alert")).toHaveClass("error-class")

    rerender(<FieldError />)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()

    rerender(<FieldError errors={[{ message: "Required" }]} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Required")

    rerender(
      <FieldError
        errors={[
          { message: "Required" },
          { message: "Invalid" },
          { message: "Invalid" },
          undefined,
        ]}
      />
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Required")
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid")
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })
})
