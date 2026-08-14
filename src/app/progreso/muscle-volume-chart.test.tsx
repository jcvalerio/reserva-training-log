import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { VolumeView, WeeklyMuscleVolume } from "@/workouts/muscle-volume";

import { MuscleVolumeChart, weekOverWeekDelta } from "./muscle-volume-chart";

function buildView(
  byMuscleGroup: WeeklyMuscleVolume["byMuscleGroup"] = [],
  overrides: Partial<VolumeView> = {},
): VolumeView {
  return {
    key: "week",
    labelEs: "Esta semana",
    byMuscleGroup,
    weeksCounted: 0,
    isAverage: false,
    comparison: null,
    ...overrides,
  };
}

function buildComparison(byMuscleGroup: WeeklyMuscleVolume["byMuscleGroup"]) {
  return { labelEs: "la semana pasada", byMuscleGroup };
}


describe("weekOverWeekDelta", () => {
  it("returns null when there is no previous week at all", () => {
    expect(weekOverWeekDelta(null, "pecho", 3)).toBeNull();
  });

  it("returns null when the previous week had no volume", () => {
    // buildMuscleVolumeSummary passes null rather than an empty week for
    // exactly this reason: on a first week of training, comparing against
    // nothing would render "+3" for every muscle and read as progress.
    expect(weekOverWeekDelta(null, "pecho", 3)).toBeNull();
  });

  it("reports an increase, a decrease and no change", () => {
    const previous = buildComparison([
      { muscleGroup: "pecho", effectiveSets: 3, avgRir: null, rirSetCount: 0 },
      { muscleGroup: "dorsal", effectiveSets: 6, avgRir: null, rirSetCount: 0 },
      { muscleGroup: "cuadriceps", effectiveSets: 4, avgRir: null, rirSetCount: 0 },
    ]);
    expect(weekOverWeekDelta(previous, "pecho", 6)).toBe(3);
    expect(weekOverWeekDelta(previous, "dorsal", 3)).toBe(-3);
    expect(weekOverWeekDelta(previous, "cuadriceps", 4)).toBe(0);
  });

  it("treats a muscle absent last week as zero, once there is a baseline", () => {
    const previous = buildComparison([{ muscleGroup: "pecho", effectiveSets: 3, avgRir: null, rirSetCount: 0 }]);
    expect(weekOverWeekDelta(previous, "biceps", 2)).toBe(2);
  });

  it("keeps half-set precision from secondary-muscle credit", () => {
    const previous = buildComparison([{ muscleGroup: "biceps", effectiveSets: 1.5, avgRir: null, rirSetCount: 0 }]);
    expect(weekOverWeekDelta(previous, "biceps", 3)).toBe(1.5);
  });
});

describe("MuscleVolumeChart", () => {
  it("renders only the groups with volume, collapsing the rest into one line", () => {
    render(<MuscleVolumeChart view={buildView([{ muscleGroup: "pecho", effectiveSets: 3, avgRir: null, rirSetCount: 0 }])} />);

    expect(screen.getByRole("button", { name: /Pecho/ })).toBeVisible();
    expect(screen.getByText(/Sin series esta semana/)).toBeVisible();
  });

  it("shows no deltas when there is no comparable previous week", () => {
    render(<MuscleVolumeChart view={buildView([{ muscleGroup: "pecho", effectiveSets: 3, avgRir: null, rirSetCount: 0 }])} />);

    expect(screen.queryByText(/▲/)).toBeNull();
    expect(screen.queryByText(/▼/)).toBeNull();
  });

  it("shows the week-over-week delta when a real previous week exists", () => {
    render(
      <MuscleVolumeChart
        view={buildView([{ muscleGroup: "pecho", effectiveSets: 6, avgRir: null, rirSetCount: 0 }], {
          comparison: buildComparison([{ muscleGroup: "pecho", effectiveSets: 3, avgRir: null, rirSetCount: 0 }]),
        })}
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
