import { describe, expect, it } from "vitest";

import { generatedWorkoutPlanSchema } from "./generated-plan-schema";
import { getPlanTemplateById, isPlanTemplateId, planTemplates } from "./plan-templates";

describe("plan-templates catalog", () => {
  it("has a unique id per template and a build() that produces a valid plan", () => {
    const ids = planTemplates.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const template of planTemplates) {
      expect(() => generatedWorkoutPlanSchema.parse(template.build())).not.toThrow();
    }
  });

  it("looks up a known template by id and returns undefined for an unknown one", () => {
    expect(getPlanTemplateById("hypertrophy")?.id).toBe("hypertrophy");
    expect(getPlanTemplateById("fat_loss")?.id).toBe("fat_loss");
    expect(getPlanTemplateById("not-a-real-id")).toBeUndefined();
  });

  it("narrows a known id with isPlanTemplateId and rejects unknown strings", () => {
    expect(isPlanTemplateId("hypertrophy")).toBe(true);
    expect(isPlanTemplateId("not-a-real-id")).toBe(false);
  });
});
