import { describe, expect, it } from "vitest";
import { claudeResultText } from "../src/claude-result.js";
const result = (
  status: number | null,
  text: string,
  is_error = true,
): Parameters<typeof claudeResultText>[0] => ({
  subtype: "success",
  is_error,
  api_error_status: status,
  result: text,
});
describe("Claude native result classification", () => {
  it.each([
    [401, "auth-unavailable"],
    [403, "auth-unavailable"],
    [429, "quota"],
  ])("classifies native status %s without exposing provider content", (status, failure) => {
    expect(() => claudeResultText(result(Number(status), "sensitive provider content"))).toThrow(
      String(failure),
    );
  });
  it("classifies insufficient API credits and preserves ordinary error text drafts", () => {
    expect(() => claudeResultText(result(null, "Your credit balance is too low"))).toThrow("quota");
    expect(claudeResultText(result(null, "Error: file missing", false))).toBe(
      "Error: file missing",
    );
  });
});
