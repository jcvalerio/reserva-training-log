import { describe, expect, it } from "vitest";

import { parseAthleteProfileFormData, parseProfileListInput } from "./profile-schema";

describe("profile schema", () => {
  it("defaults MVP training targets to Spanish-first hypertrophy settings", () => {
    const formData = new FormData();
    formData.set("name", "Juan Tester");

    const input = parseAthleteProfileFormData(formData);

    expect(input).toMatchObject({
      name: "Juan Tester",
      targetTrainingDaysPerWeek: 5,
      targetSessionDurationMinutes: 60,
      primaryGoal: "hypertrophy",
      secondaryGoals: ["mobility", "fat_loss"],
      progressionAggressiveness: "aggressive",
      preferredLocale: "es",
      timezone: "America/Costa_Rica",
    });
  });

  it("normalizes multiline limitations and priorities for dedicated persistence", () => {
    expect(parseProfileListInput(" Bursitis hombro derecho \n\n Cuádriceps lado derecho ")).toEqual([
      "Bursitis hombro derecho",
      "Cuádriceps lado derecho",
    ]);
  });
});
