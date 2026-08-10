import { describe, expect, it } from "vitest";

import { createFatLossPlan } from "@/plans/fat-loss-plan";
import { createLegPriorityPlan } from "@/plans/leg-priority-plan";
import { createReadaptationPlan } from "@/plans/readaptation-plan";
import { createSeededHypertrophyPlan } from "@/plans/seeded-plan";

import {
  exerciseCatalog,
  findCatalogEntryByName,
  findCatalogEntryBySlug,
  jointLoadLabelsEs,
  jointLoads,
  movementPatternLabelsEs,
  movementPatterns,
  muscleGroupLabelsEs,
  muscleGroups,
  normalizeExerciseName,
  regionForMuscleGroup,
  weeklySetReferenceRange,
} from "./muscle-taxonomy";

describe("normalizeExerciseName", () => {
  it("folds case, accents and repeated whitespace", () => {
    expect(normalizeExerciseName("  Jalón   al   PECHO  ")).toBe("jalon al pecho");
    expect(normalizeExerciseName("Extensión de cuádriceps")).toBe("extension de cuadriceps");
    expect(normalizeExerciseName("Press francés con mancuerna")).toBe("press frances con mancuerna");
  });

  it("strips fat-loss-plan's block prefix", () => {
    // fat-loss-plan.ts prefixes every name with its circuit block because the
    // app has no grouping field: "Bloque 1 · Flexiones".
    expect(normalizeExerciseName("Bloque 1 · Flexiones")).toBe("flexiones");
    expect(normalizeExerciseName("Calentamiento · Bird dog")).toBe("bird dog");
    expect(normalizeExerciseName("Acondicionamiento · Remo 500m")).toBe("remo 500m");
  });

  it("keeps parentheticals, which carry real identity", () => {
    expect(normalizeExerciseName("Peso muerto (Deadlift)")).toBe("peso muerto (deadlift)");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeExerciseName("   ")).toBe("");
  });
});

describe("regionForMuscleGroup", () => {
  it("maps every muscle group to a region", () => {
    for (const group of muscleGroups) {
      expect(regionForMuscleGroup(group), group).toBeTruthy();
    }
  });

  it("puts the lateral delt on empuje and the posterior delt on tirón", () => {
    // This split is what makes the push:pull ratio meaningful — rear delts are
    // trained by rows and face pulls, not by presses.
    expect(regionForMuscleGroup("deltoides_lateral")).toBe("empuje");
    expect(regionForMuscleGroup("deltoides_posterior")).toBe("tiron");
  });
});

describe("vocabulary completeness", () => {
  it("labels every muscle group, movement pattern and joint load", () => {
    for (const group of muscleGroups) expect(muscleGroupLabelsEs[group], group).toBeTruthy();
    for (const pattern of movementPatterns) expect(movementPatternLabelsEs[pattern], pattern).toBeTruthy();
    for (const joint of jointLoads) expect(jointLoadLabelsEs[joint], joint).toBeTruthy();
  });

  it("gives every muscle group a reference range with min <= max", () => {
    for (const group of muscleGroups) {
      const range = weeklySetReferenceRange[group];
      expect(range, group).toBeDefined();
      expect(range.min, group).toBeLessThanOrEqual(range.max);
    }
  });
});

describe("exerciseCatalog", () => {
  it("has unique slugs", () => {
    const slugs = exerciseCatalog.map((catalogEntry) => catalogEntry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("never repeats a normalized name across entries", () => {
    // A duplicate would make findCatalogEntryByName silently resolve to
    // whichever entry happened to be declared last.
    const seen = new Map<string, string>();
    for (const catalogEntry of exerciseCatalog) {
      for (const name of [catalogEntry.nameEs, ...(catalogEntry.aliases ?? [])]) {
        const key = normalizeExerciseName(name);
        expect(seen.has(key) ? `${key} (also on ${seen.get(key)})` : key).toBe(key);
        seen.set(key, catalogEntry.slug);
      }
    }
  });

  it("never lists an entry's primary group among its secondaries", () => {
    for (const catalogEntry of exerciseCatalog) {
      if (!catalogEntry.primaryMuscleGroup) continue;
      expect(catalogEntry.secondaryMuscleGroups, catalogEntry.slug).not.toContain(
        catalogEntry.primaryMuscleGroup,
      );
    }
  });

  it("resolves by slug and by name", () => {
    expect(findCatalogEntryBySlug("face-pull")?.primaryMuscleGroup).toBe("deltoides_posterior");
    expect(findCatalogEntryByName("Face pull")?.slug).toBe("face-pull");
    expect(findCatalogEntryByName("no existe este ejercicio")).toBeNull();
  });

  it("resolves aliases to the same entry as the canonical name", () => {
    expect(findCatalogEntryByName("Sentadilla búlgara")?.slug).toBe("sentadilla-bulgara");
    expect(findCatalogEntryByName("Bulgarian split squat")?.slug).toBe("sentadilla-bulgara");
    expect(findCatalogEntryByName("Extensión de tríceps en máquina o polea")?.slug).toBe("triceps-en-polea");
  });

  it("classifies cardio with a null primary group, distinct from unclassified", () => {
    const cardio = findCatalogEntryByName("Bloque · Remo 500m");
    expect(cardio).not.toBeNull();
    expect(cardio?.primaryMuscleGroup).toBeNull();
  });

  it("gives a substitute a different group than the exercise it replaced", () => {
    // The real case from the dev DB: "Pantorrilla sentada unilateral" was
    // logged as a substitute for "Press inclinado en máquina". This is why
    // createSubstituteExercise resolves exerciseId from the substitute's own
    // name instead of inheriting the original's — inheriting would credit calf
    // work to pecho, silently and permanently, in the weekly-volume report.
    expect(findCatalogEntryByName("Press inclinado en máquina")?.primaryMuscleGroup).toBe("pecho");
    expect(findCatalogEntryByName("Pantorrilla sentada unilateral")?.primaryMuscleGroup).toBe("pantorrillas");
  });

  it("classifies every exercise name shipped by every plan template", () => {
    // The guard that stops a future template quietly introducing an exercise
    // no report can account for.
    const plans = [
      createSeededHypertrophyPlan(),
      createLegPriorityPlan(),
      createReadaptationPlan(),
      createFatLossPlan(),
    ];
    const unclassified: string[] = [];
    for (const plan of plans) {
      for (const session of plan.sessions) {
        for (const exercise of session.exercises) {
          if (!findCatalogEntryByName(exercise.exerciseNameEs)) {
            unclassified.push(exercise.exerciseNameEs);
          }
        }
      }
    }
    expect([...new Set(unclassified)]).toEqual([]);
  });
});
