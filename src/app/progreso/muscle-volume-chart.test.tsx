import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { VolumeView, WeeklyMuscleVolume } from "@/workouts/muscle-volume";

import { MuscleVolumeChart, weekOverWeekDelta } from "./muscle-volume-chart";

function buildView(
  byMuscleGroup: WeeklyMuscleVolume["byMuscleGroup"] = [],
  overrides: Partial<VolumeView> = {},
): VolumeView {
  return { key: "week", labelEs: "Esta semana", byMuscleGroup, weeksCounted: 0, isAverage: false, ...overrides };
}

function buildWeek(
  byMuscleGroup: WeeklyMuscleVolume["byMuscleGroup"] = [],
  weekStartDate = new Date("2026-08-03T00:00:00"),
): WeeklyMuscleVolume {
  return {
    weekStartDate,
    byMuscleGroup,
    totalEffectiveSets: byMuscleGroup.reduce((sum, row) => sum + row.effectiveSets, 0),
  };
}

describe("weekOverWeekDelta", () => {
  it("returns null when there is no previous week at all", () => {
    expect(weekOverWeekDelta(null, "pecho", 3)).toBeNull();
  });

  it("returns null when the previous week has no volume", () => {
    // The case that matters: on a first week of training, comparing against an
    // empty week would render "+3" for every muscle and read as progress when
    // there was simply nothing before.
    expect(weekOverWeekDelta(buildWeek([]), "pecho", 3)).toBeNull();
  });

  it("reports an increase, a decrease and no change", () => {
    const previous = buildWeek([
      { muscleGroup: "pecho", effectiveSets: 3 },
      { muscleGroup: "dorsal", effectiveSets: 6 },
      { muscleGroup: "cuadriceps", effectiveSets: 4 },
    ]);
    expect(weekOverWeekDelta(previous, "pecho", 6)).toBe(3);
    expect(weekOverWeekDelta(previous, "dorsal", 3)).toBe(-3);
    expect(weekOverWeekDelta(previous, "cuadriceps", 4)).toBe(0);
  });

  it("treats a muscle absent last week as zero, once there is a baseline", () => {
    const previous = buildWeek([{ muscleGroup: "pecho", effectiveSets: 3 }]);
    expect(weekOverWeekDelta(previous, "biceps", 2)).toBe(2);
  });

  it("keeps half-set precision from secondary-muscle credit", () => {
    const previous = buildWeek([{ muscleGroup: "biceps", effectiveSets: 1.5 }]);
    expect(weekOverWeekDelta(previous, "biceps", 3)).toBe(1.5);
  });
});

describe("MuscleVolumeChart", () => {
  it("renders only the groups with volume, collapsing the rest into one line", () => {
    render(<MuscleVolumeChart view={buildView([{ muscleGroup: "pecho", effectiveSets: 3 }])} />);

    expect(screen.getByRole("button", { name: /Pecho/ })).toBeVisible();
    expect(screen.getByText(/Sin series esta semana/)).toBeVisible();
  });

  it("shows no deltas when there is no comparable previous week", () => {
    render(<MuscleVolumeChart view={buildView([{ muscleGroup: "pecho", effectiveSets: 3 }])} />);

    expect(screen.queryByText(/▲/)).toBeNull();
    expect(screen.queryByText(/▼/)).toBeNull();
  });

  it("shows the week-over-week delta when a real previous week exists", () => {
    render(
      <MuscleVolumeChart
        view={buildView([{ muscleGroup: "pecho", effectiveSets: 6 }])}
        previousWeek={buildWeek([{ muscleGroup: "pecho", effectiveSets: 3 }], new Date("2026-07-27T00:00:00"))}
      />,
    );

    expect(screen.getByText("▲ +3")).toBeVisible();
    expect(screen.getByText(/compara con la semana pasada/)).toBeVisible();
  });

  it("says so plainly when nothing was trained this week", () => {
    render(<MuscleVolumeChart view={buildView([])} />);

    expect(screen.getByText("Todavía no hay series registradas esta semana.")).toBeVisible();
  });
});
