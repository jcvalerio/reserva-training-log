import { describe, expect, it } from "vitest";

import { parseSessionCompletionFormData } from "./session-completion-schema";

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseSessionCompletionFormData", () => {
  it("returns undefined for both fields when the form is empty", () => {
    const input = parseSessionCompletionFormData(buildFormData());

    expect(input).toEqual({ notes: undefined, sessionRpe: undefined });
  });

  it("parses trimmed notes and a numeric RPE", () => {
    const input = parseSessionCompletionFormData(
      buildFormData({ notes: "  Buena sesión, subí todo.  ", sessionRpe: "7" }),
    );

    expect(input.notes).toBe("Buena sesión, subí todo.");
    expect(input.sessionRpe).toBe(7);
  });

  it("rejects an RPE outside 1-10", () => {
    expect(() => parseSessionCompletionFormData(buildFormData({ sessionRpe: "11" }))).toThrow();
    expect(() => parseSessionCompletionFormData(buildFormData({ sessionRpe: "0" }))).toThrow();
  });
});
