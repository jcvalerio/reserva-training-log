import { describe, expect, it } from "vitest";

import {
  buildSubstituteChoices,
  findReusableSubstitute,
  groupSubstitutes,
  isSymptomReason,
  normalizeSubstituteName,
  selectVisibleExercises,
} from "./exercise-substitution";

type Ex = {
  id: string;
  exerciseNameEs: string;
  orderIndex: number;
  substitutedForPrescriptionId: string | null;
};

function ex(id: string, orderIndex: number, substitutedFor: string | null = null, name = id): Ex {
  return { id, exerciseNameEs: name, orderIndex, substitutedForPrescriptionId: substitutedFor };
}

describe("selectVisibleExercises", () => {
  const plan = [ex("a", 1), ex("b", 2), ex("c", 3)];

  it("hides an alternative that hasn't been used this session", () => {
    const exercises = [...plan, ex("b-alt", 4, "b")];

    const visible = selectVisibleExercises(exercises, () => false);

    expect(visible.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("shows an alternative once it has sets logged this session, right after its original", () => {
    const exercises = [...plan, ex("b-alt", 4, "b")];

    const visible = selectVisibleExercises(exercises, (e) => e.id === "b-alt");

    // Not appended at the end, where its orderIndex of 4 would put it.
    expect(visible.map((e) => e.id)).toEqual(["a", "b", "b-alt", "c"]);
  });

  it("keeps the day from growing as alternatives accumulate over time", () => {
    const exercises = [...plan, ex("b-alt1", 4, "b"), ex("b-alt2", 5, "b"), ex("a-alt", 6, "a")];

    const visible = selectVisibleExercises(exercises, () => false);

    expect(visible).toHaveLength(3);
  });

  it("orders multiple used alternatives of the same exercise by orderIndex", () => {
    const exercises = [...plan, ex("b-alt2", 5, "b"), ex("b-alt1", 4, "b")];

    const visible = selectVisibleExercises(exercises, (e) => e.id.startsWith("b-alt"));

    expect(visible.map((e) => e.id)).toEqual(["a", "b", "b-alt1", "b-alt2", "c"]);
  });

  it("still shows a used alternative whose original is no longer in the day", () => {
    const exercises = [ex("a", 1), ex("ghost-alt", 9, "removed")];

    const visible = selectVisibleExercises(exercises, (e) => e.id === "ghost-alt");

    expect(visible.map((e) => e.id)).toEqual(["a", "ghost-alt"]);
  });

  it("sorts the plan's own exercises by orderIndex regardless of input order", () => {
    const visible = selectVisibleExercises([ex("c", 3), ex("a", 1), ex("b", 2)], () => false);

    expect(visible.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });
});

describe("groupSubstitutes", () => {
  it("buckets alternatives under the exercise they stand in for", () => {
    const grouped = groupSubstitutes([ex("a", 1), ex("b", 2), ex("a-alt", 3, "a"), ex("b-alt", 4, "b")]);

    expect([...grouped.keys()].sort()).toEqual(["a", "b"]);
    expect(grouped.get("a")!.map((e) => e.id)).toEqual(["a-alt"]);
  });

  it("returns an empty map when nothing has been substituted", () => {
    expect(groupSubstitutes([ex("a", 1), ex("b", 2)]).size).toBe(0);
  });
});

describe("buildSubstituteChoices", () => {
  it("deduplicates by name, since progression history is matched by name", () => {
    // "Core" really does appear on all five days of the live plan.
    const choices = buildSubstituteChoices(
      [
        { exerciseNameEs: "Core" },
        { exerciseNameEs: "Core" },
        { exerciseNameEs: "Prensa bilateral" },
      ],
      [],
    );

    expect(choices.map((c) => c.exerciseNameEs)).toEqual(["Core", "Prensa bilateral"]);
  });

  it("excludes the exercise being replaced, case-insensitively", () => {
    const choices = buildSubstituteChoices(
      [{ exerciseNameEs: "Prensa unilateral" }, { exerciseNameEs: "Curl martillo" }],
      ["prensa UNILATERAL"],
    );

    expect(choices.map((c) => c.exerciseNameEs)).toEqual(["Curl martillo"]);
  });

  it("sorts alphabetically using Spanish collation", () => {
    const choices = buildSubstituteChoices(
      [{ exerciseNameEs: "Zancada" }, { exerciseNameEs: "Élan" }, { exerciseNameEs: "Abducción" }],
      [],
    );

    expect(choices.map((c) => c.exerciseNameEs)).toEqual(["Abducción", "Élan", "Zancada"]);
  });
});

describe("normalizeSubstituteName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeSubstituteName("  Prensa   horizontal  ")).toBe("Prensa horizontal");
  });

  it("rejects a blank name rather than creating an unnamed exercise", () => {
    expect(normalizeSubstituteName("   ")).toBeNull();
    expect(normalizeSubstituteName("")).toBeNull();
  });

  it("caps runaway input", () => {
    expect(normalizeSubstituteName("x".repeat(200))).toHaveLength(120);
  });
});

describe("findReusableSubstitute", () => {
  it("reuses an existing alternative with the same name, so history stays continuous", () => {
    const existing = [{ exerciseNameEs: "Prensa horizontal" }];

    expect(findReusableSubstitute(existing, "prensa HORIZONTAL")).toBe(existing[0]);
  });

  it("returns null when it's a genuinely new alternative", () => {
    expect(findReusableSubstitute([{ exerciseNameEs: "Prensa horizontal" }], "Hack squat")).toBeNull();
  });
});

describe("isSymptomReason", () => {
  it("treats only 'no me sentí bien' as a symptom, not the equipment reasons", () => {
    expect(isSymptomReason("felt_wrong")).toBe(true);
    expect(isSymptomReason("machine_busy")).toBe(false);
    expect(isSymptomReason("machine_broken")).toBe(false);
    expect(isSymptomReason("other")).toBe(false);
  });
});
