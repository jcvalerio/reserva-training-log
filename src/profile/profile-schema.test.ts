import { describe, expect, it } from "vitest";

import { composeProfileNotes, parseAthleteProfileFormData } from "./profile-schema";

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

  it("keeps limitations and muscle priorities as explicit notes until dedicated tables exist", () => {
    expect(
      composeProfileNotes({
        notes: "Entrena 5 días por semana.",
        painSensitiveAreas: "Bursitis de hombro derecho.",
        musclePriorities: "Cuádriceps y pantorrillas, énfasis lado derecho.",
      }),
    ).toBe(
      "Notas: Entrena 5 días por semana.\n\n" +
        "Limitaciones / zonas sensibles: Bursitis de hombro derecho.\n\n" +
        "Prioridades musculares: Cuádriceps y pantorrillas, énfasis lado derecho.",
    );
  });
});
