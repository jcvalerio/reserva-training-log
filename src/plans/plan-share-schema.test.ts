import { describe, expect, it } from "vitest";

import { parsePlanShareFormData } from "./plan-share-schema";

describe("parsePlanShareFormData", () => {
  it("trims and lowercases a valid email", () => {
    const formData = new FormData();
    formData.set("recipientEmail", "  Athlete@Example.com  ");

    expect(parsePlanShareFormData(formData)).toEqual({ recipientEmail: "athlete@example.com" });
  });

  it("rejects an invalid email", () => {
    const formData = new FormData();
    formData.set("recipientEmail", "not-an-email");

    expect(() => parsePlanShareFormData(formData)).toThrow();
  });

  it("rejects a missing email", () => {
    const formData = new FormData();

    expect(() => parsePlanShareFormData(formData)).toThrow();
  });
});
