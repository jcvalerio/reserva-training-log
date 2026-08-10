import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { muscleGroups } from "@/training/muscle-taxonomy";
import type { VolumeView, WeeklyMuscleVolume } from "@/workouts/muscle-volume";

import { anteriorRegions, posteriorRegions } from "./body-map-geometry";
import { BodyMap, shadeForVolume } from "./body-map";

function buildView(
  byMuscleGroup: WeeklyMuscleVolume["byMuscleGroup"] = [],
  overrides: Partial<VolumeView> = {},
): VolumeView {
  return { key: "week", labelEs: "Esta semana", byMuscleGroup, weeksCounted: 0, isAverage: false, ...overrides };
}

describe("body-map geometry", () => {
  it("covers all 13 muscle groups across the two views", () => {
    // The reason this artwork is vendored rather than taken from a library:
    // owning it lets the front view carry deltoides_lateral and the back view
    // deltoides_posterior, which no library's taxonomy expresses.
    const covered = new Set(
      [...anteriorRegions, ...posteriorRegions]
        .map((region) => region.muscleGroup)
        .filter((group): group is NonNullable<typeof group> => group !== null),
    );
    expect([...muscleGroups].filter((group) => !covered.has(group))).toEqual([]);
  });

  it("puts the lateral delt on the front and the posterior delt on the back", () => {
    const front = anteriorRegions.map((region) => region.muscleGroup);
    const back = posteriorRegions.map((region) => region.muscleGroup);
    expect(front).toContain("deltoides_lateral");
    expect(back).toContain("deltoides_posterior");
    expect(front).not.toContain("deltoides_posterior");
  });

  it("has non-empty polygon data for every region", () => {
    for (const region of [...anteriorRegions, ...posteriorRegions]) {
      expect(region.polygons.length).toBeGreaterThan(0);
      for (const points of region.polygons) {
        expect(points.trim()).not.toBe("");
      }
    }
  });
});

describe("shadeForVolume", () => {
  it("shades an untrained muscle as empty", () => {
    expect(shadeForVolume("pecho", 0)).toBe(0);
  });

  it("scales against each muscle's own reference range, not an absolute count", () => {
    // 12 sets is at the top of the range for pantorrillas (8-16 -> not yet max)
    // but below it for pecho (10-20). An absolute scale would misread both.
    expect(shadeForVolume("pantorrillas", 16)).toBe(3);
    expect(shadeForVolume("pecho", 16)).toBe(2);
  });

  it("still steps up for groups whose reference minimum is zero", () => {
    // core and abductores have min 0; without flooring the divisor any volume
    // at all would jump straight to "in range".
    expect(shadeForVolume("core", 1)).toBe(2);
    expect(shadeForVolume("core", 0)).toBe(0);
  });

  it("marks volume below the reference minimum as the lightest shade", () => {
    expect(shadeForVolume("pecho", 3)).toBe(1);
  });
});

describe("BodyMap", () => {
  it("renders both views with accessible labels", () => {
    render(<BodyMap view={buildView([{ muscleGroup: "pecho", effectiveSets: 6 }])} />);

    const views = screen.getAllByRole("img");
    expect(views).toHaveLength(2);
    expect(views[0]!.getAttribute("aria-label")).toContain("frente");
    expect(views[1]!.getAttribute("aria-label")).toContain("espalda");
  });

  it("prompts the user to tap before anything is selected", () => {
    render(<BodyMap view={buildView()} />);

    expect(screen.getByText("Toca un músculo para ver sus series.")).toBeVisible();
  });
});
