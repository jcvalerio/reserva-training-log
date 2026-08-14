import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MeasurementSeriesPoint } from "@/measurements/measurement-series";
import type { BodyMeasurementTrend } from "@/measurements/measurement-trend";
import type { ConsistencySummary } from "@/workouts/consistency";
import type { ExerciseSeriesGroup } from "@/workouts/exercise-series";
import type { ExerciseImprovement, ExerciseImprovementRow } from "@/workouts/improvement";
import type { MuscleVolumeSummary } from "@/workouts/muscle-volume";
import type { PlanSessionTemplate } from "@/plans/plan-repository";
import type { WorkoutSession } from "@/workouts/workout-repository";

import { formatRatio, ProgresoPageContent } from "./progreso-page-content";

function buildImprovement(overrides: Partial<ExerciseImprovement> = {}): ExerciseImprovement {
  return {
    improved: false,
    signals: [],
    latestVolumeLoadKg: 800,
    previousVolumeLoadKg: 800,
    latestMaxPain: 0,
    previousMaxPain: 0,
    latestAvgWeightKg: 80,
    previousAvgWeightKg: 80,
    latestAvgReps: 10,
    previousAvgReps: 10,
    latestEstimated1RmKg: null,
    previousEstimated1RmKg: null,
    latestAsymmetryGapKg: null,
    previousAsymmetryGapKg: null,
    ...overrides,
  };
}

function buildTemplate(overrides: Partial<PlanSessionTemplate> = {}): PlanSessionTemplate {
  return {
    id: "template-1",
    workoutPlanId: "plan-1",
    weekNumber: 1,
    dayIndex: 1,
    nameEs: "Pierna — cuádriceps",
    nameEn: null,
    focus: "Cuádriceps y pantorrilla",
    estimatedDurationMinutes: 60,
    mobilityNotesEs: "Movilidad.",
    ...overrides,
  };
}

function buildSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: "session-1",
    athleteProfileId: "profile-1",
    workoutPlanId: "plan-1",
    planSessionTemplateId: "template-1",
    status: "completed",
    startedAt: new Date("2026-07-20T12:00:00Z"),
    completedAt: new Date("2026-07-20T13:00:00Z"),
    notes: null,
    sessionRpe: null,
    createdAt: new Date("2026-07-20T12:00:00Z"),
    updatedAt: new Date("2026-07-20T13:00:00Z"),
    ...overrides,
  };
}

type Props = React.ComponentProps<typeof ProgresoPageContent>;

function renderPage(overrides: Partial<Props> = {}) {
  const defaults: Props = {
    hasProfile: true,
    improvements: [],
    completedSessions: [{ session: buildSession(), template: buildTemplate() }],
    bodyMeasurementTrend: null,
    measurementSeries: [],
    exerciseSeriesGroups: [],
    defaultExerciseName: null,
    muscleVolumeSummary: null,
    consistencySummary: null,
  };
  return render(<ProgresoPageContent {...defaults} {...overrides} />);
}

describe("ProgresoPageContent", () => {
  it("shows an empty state pointing to /entrenar when there is no history", () => {
    renderPage({ completedSessions: [] });

    expect(screen.getByRole("heading", { name: "Todavía no hay historial" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a Entrenar" })).toHaveAttribute("href", "/entrenar");
  });

  it("shows an empty state when there is no profile yet", () => {
    renderPage({ hasProfile: false, completedSessions: [] });

    expect(screen.getByRole("heading", { name: "Todavía no hay historial" })).toBeVisible();
  });

  it("lists completed sessions linking to their read-only session view", () => {
    renderPage();

    expect(screen.getByRole("link", { name: /Pierna — cuádriceps/ })).toHaveAttribute("href", "/entrenar/session-1");
    expect(screen.getByText(/Día 1/)).toBeVisible();
    // startedAt 12:00, completedAt 13:00 in the fixture.
    expect(screen.getByText(/60 min/)).toBeVisible();
    expect(
      screen.getByText("Registra el mismo ejercicio en dos sesiones completadas para ver comparaciones aquí."),
    ).toBeVisible();
  });

  it("shows per-session training load and a Carga KPI tile when RPE was logged", () => {
    renderPage({ completedSessions: [{ session: buildSession({ sessionRpe: 7 }), template: buildTemplate() }] }); // 60min * 7 = 420 UA

    expect(screen.getAllByText(/420 UA/)[0]).toBeVisible();
    expect(screen.getByText("420")).toBeVisible(); // Carga KPI tile value
  });

  it("shows a dash in the Carga KPI tile when no session has an RPE", () => {
    renderPage({ completedSessions: [{ session: buildSession({ sessionRpe: null }), template: buildTemplate() }] });

    expect(screen.queryByText(/\d+ UA/)).toBeNull(); // no per-session load line either
    const kpiTiles = screen.getAllByText("—");
    expect(kpiTiles.length).toBeGreaterThan(0); // Carga KPI tile falls back to a dash
  });

  it("shows the Mejorando KPI tile as a fraction of improved exercises", () => {
    const improvements: ExerciseImprovementRow[] = [
      { exerciseNameEs: "A", latestCompletedAt: null, improvement: buildImprovement({ improved: true }) },
      { exerciseNameEs: "B", latestCompletedAt: null, improvement: buildImprovement({ improved: false }) },
    ];

    renderPage({ improvements });

    expect(screen.getByText("1/2")).toBeVisible();
  });

  it("shows the Esta semana KPI tile from the consistency summary", () => {
    const consistencySummary: ConsistencySummary = {
      weeks: [{ weekStartDate: new Date("2026-07-20T00:00:00"), daysTrained: 3 }],
      targetDaysPerWeek: 5,
      currentWeekDaysTrained: 3,
    };

    renderPage({ consistencySummary });

    expect(screen.getByText("3/5")).toBeVisible();
  });

  it("shows an improved badge and matching signals for an exercise that improved", () => {
    const improvements: ExerciseImprovementRow[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        latestCompletedAt: new Date("2026-07-27T12:00:00Z"),
        improvement: buildImprovement({
          improved: true,
          signals: ["volume_load"],
          latestVolumeLoadKg: 840,
          previousVolumeLoadKg: 800,
          latestAvgWeightKg: 84,
          previousAvgWeightKg: 80,
        }),
      },
    ];

    renderPage({ improvements });

    // "Prensa de piernas" now legitimately appears twice — once as this
    // card's own heading, once in "Ejercicios que más mejoraron" above it
    // (see the dedicated test for that section below) — so the heading role
    // disambiguates instead of a plain text match.
    expect(screen.getByRole("heading", { name: "Prensa de piernas" })).toBeVisible();
    expect(screen.getByText("Mejora ≥5%")).toBeVisible();
    expect(screen.getByText("Volumen +5%")).toBeVisible();
    expect(screen.getByText(/Peso prom: 80kg → 84kg/)).toBeVisible();
  });

  it("lists improved exercises in 'Ejercicios que más mejoraron', ranked by their headline signal", () => {
    const improvements: ExerciseImprovementRow[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        latestCompletedAt: new Date("2026-07-27T12:00:00Z"),
        improvement: buildImprovement({
          improved: true,
          signals: ["volume_load"],
          latestVolumeLoadKg: 840,
          previousVolumeLoadKg: 800, // +5%
        }),
      },
      {
        exerciseNameEs: "Sentadilla",
        latestCompletedAt: new Date("2026-07-27T12:00:00Z"),
        improvement: buildImprovement({
          improved: true,
          signals: ["estimated_1rm"],
          latestEstimated1RmKg: 120,
          previousEstimated1RmKg: 100, // +20%, should rank first
        }),
      },
      {
        exerciseNameEs: "Sin cambios",
        latestCompletedAt: new Date("2026-07-27T12:00:00Z"),
        improvement: buildImprovement({ improved: false, signals: [] }),
      },
    ];

    renderPage({ improvements });

    expect(screen.getByText("Ejercicios que más mejoraron")).toBeVisible();
    const names = screen
      .getAllByText(/^(Prensa de piernas|Sentadilla)$/)
      .filter((el) => el.tagName === "SPAN")
      .map((el) => el.textContent);
    expect(names).toEqual(["Sentadilla", "Prensa de piernas"]);
    expect(screen.getByText("+20.0%")).toBeVisible();
    expect(screen.getByText("+5.0%")).toBeVisible();
  });

  it("hides 'Ejercicios que más mejoraron' when nothing improved", () => {
    const improvements: ExerciseImprovementRow[] = [
      {
        exerciseNameEs: "Sin cambios",
        latestCompletedAt: null,
        improvement: buildImprovement({ improved: false, signals: [] }),
      },
    ];

    renderPage({ improvements });

    expect(screen.queryByText("Ejercicios que más mejoraron")).toBeNull();
  });

  it("shows a neutral badge and no signal chips for an exercise with no 5% change", () => {
    const improvements: ExerciseImprovementRow[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        latestCompletedAt: new Date("2026-07-27T12:00:00Z"),
        improvement: buildImprovement({ latestVolumeLoadKg: 805, previousVolumeLoadKg: 800 }),
      },
    ];

    renderPage({ improvements });

    expect(screen.getByText("Sin cambio de 5%")).toBeVisible();
    expect(screen.queryByText("Volumen +5%")).toBeNull();
  });

  it("shows the body measurement trend and chart when there is more than one measurement", () => {
    const bodyMeasurementTrend: BodyMeasurementTrend = {
      measurementCount: 3,
      firstMeasuredAt: new Date("2026-06-01T12:00:00Z"),
      latestMeasuredAt: new Date("2026-07-20T12:00:00Z"),
      bodyWeightKg: { firstValue: 82, latestValue: 78.5, deltaValue: -3.5 },
      waistCm: { firstValue: 90, latestValue: 88, deltaValue: -2 },
      chestCm: null,
      hipsCm: null,
      latestThighGapCm: 1.5,
      latestCalfGapCm: null,
      thighGapImproved: true,
      calfGapImproved: null,
    };
    const measurementSeries: MeasurementSeriesPoint[] = [
      { measuredAt: new Date("2026-06-01T12:00:00Z"), bodyWeightKg: 82, waistCm: 90 },
      { measuredAt: new Date("2026-07-20T12:00:00Z"), bodyWeightKg: 78.5, waistCm: 88 },
    ];

    renderPage({ bodyMeasurementTrend, measurementSeries });

    expect(screen.getByText("Tendencia corporal")).toBeVisible();
    expect(screen.getByText(/Peso: 82\.0kg → 78\.5kg \(-3\.5kg\)/)).toBeVisible();
    expect(screen.getByText(/Cintura: 90\.0cm → 88\.0cm \(-2\.0cm\)/)).toBeVisible();
    expect(screen.getByText(/Muslo: \+1\.5cm \(mejoró vs\. la anterior\)/)).toBeVisible();
    expect(screen.getByText(/Pantorrilla: —/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver mediciones" })).toHaveAttribute("href", "/mediciones");
  });

  it("shows a single-measurement message instead of a trend or chart when there's only one entry", () => {
    const bodyMeasurementTrend: BodyMeasurementTrend = {
      measurementCount: 1,
      firstMeasuredAt: new Date("2026-07-20T12:00:00Z"),
      latestMeasuredAt: new Date("2026-07-20T12:00:00Z"),
      bodyWeightKg: { firstValue: 82, latestValue: 82, deltaValue: 0 },
      waistCm: null,
      chestCm: null,
      hipsCm: null,
      latestThighGapCm: null,
      latestCalfGapCm: null,
      thighGapImproved: null,
      calfGapImproved: null,
    };

    renderPage({
      bodyMeasurementTrend,
      measurementSeries: [{ measuredAt: new Date("2026-07-20T12:00:00Z"), bodyWeightKg: 82, waistCm: null }],
    });

    expect(screen.getByText(/1 medición registrada/)).toBeVisible();
    expect(screen.queryByText(/Peso: /)).toBeNull();
  });

  it("hides the body trend section entirely when there are no measurements", () => {
    renderPage();

    expect(screen.queryByText("Tendencia corporal")).toBeNull();
  });

  it("shows the exercise progression chart section when there is at least one exercise series", () => {
    const exerciseSeriesGroups: ExerciseSeriesGroup[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        isUnilateral: false,
        primaryMuscleGroup: null,
        isClassified: false,
        substitutedForNameEs: null,
        points: [
          {
            completedAt: new Date("2026-07-20T12:00:00Z"),
            avgWeightKg: 80,
            volumeLoadKg: 800,
            best1RmKg: 96,
            leftAvgWeightKg: null,
            rightAvgWeightKg: null,
            leftVolumeLoadKg: null,
            rightVolumeLoadKg: null,
            leftBest1RmKg: null,
            rightBest1RmKg: null,
            leftAvgRir: null,
            rightAvgRir: null,
          },
        ],
      },
    ];

    renderPage({ exerciseSeriesGroups, defaultExerciseName: "Prensa de piernas" });

    expect(screen.getByText("Ejercicios por grupo muscular")).toBeVisible();
    // The dropdown is gone — that was the whole point of the change.
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("button", { name: /Prensa de piernas/ })).toBeVisible();
  });

  it("hides the exercise progression chart section when there is no exercise series", () => {
    renderPage();

    expect(screen.queryByText("Ejercicios por grupo muscular")).toBeNull();
  });

  it("shows the consistency chart section when a consistency summary is provided", () => {
    const consistencySummary: ConsistencySummary = {
      weeks: [{ weekStartDate: new Date("2026-07-20T00:00:00"), daysTrained: 3 }],
      targetDaysPerWeek: 5,
      currentWeekDaysTrained: 3,
    };

    renderPage({ consistencySummary });

    expect(screen.getByText("Consistencia semanal")).toBeVisible();
  });
});

describe("ProgresoPageContent — ¿Está funcionando?", () => {
  function buildVolumeSummary(byMuscleGroup: MuscleVolumeSummary["views"][number]["byMuscleGroup"]): MuscleVolumeSummary {
    const week: MuscleVolumeSummary["currentWeek"] = {
      weekStartDate: new Date("2026-08-03T00:00:00"),
      byMuscleGroup: [],
      totalEffectiveSets: 0,
    };
    return {
      weeks: [week],
      currentWeek: week,
      previousWeek: null,
      unclassifiedExerciseNames: [],
      pushPullRatio: null,
      quadHamstringRatio: null,
      painByLocation: [],
      views: [
        { key: "week", labelEs: "Esta semana", byMuscleGroup: [], weeksCounted: 0, isAverage: false, comparison: null },
        { key: "four_weeks", labelEs: "4 semanas", byMuscleGroup, weeksCounted: 4, isAverage: true, comparison: null },
      ],
    };
  }

  function buildSeriesGroup(exerciseNameEs: string, primaryMuscleGroup: ExerciseSeriesGroup["primaryMuscleGroup"]): ExerciseSeriesGroup {
    return { exerciseNameEs, isUnilateral: false, primaryMuscleGroup, isClassified: true, substitutedForNameEs: null, points: [] };
  }

  // Scoped to the section: "Series por grupo muscular" renders the same
  // muscle-group labels just below, so an unscoped getByText("Pecho") matches
  // both and passes for the wrong reason.
  function progressSection() {
    return within(screen.getByRole("region", { name: "¿Está funcionando?" }));
  }

  it("states the verdict and the lift in weight x reps, not in volume-load kg", () => {
    renderPage({
      muscleVolumeSummary: buildVolumeSummary([{ muscleGroup: "pecho", effectiveSets: 13 }]),
      exerciseSeriesGroups: [buildSeriesGroup("Press de banca", "pecho")],
      improvements: [
        {
          exerciseNameEs: "Press de banca",
          improvement: buildImprovement({
            improved: true,
            signals: ["reps_at_load"],
            previousAvgWeightKg: 60,
            previousAvgReps: 8,
            latestAvgWeightKg: 60,
            latestAvgReps: 10,
          }),
          latestCompletedAt: new Date("2026-08-10T12:00:00"),
        },
      ],
    });

    expect(progressSection().getByText("Pecho")).toBeVisible();
    expect(progressSection().getByText("Creciendo")).toBeVisible();
    expect(progressSection().getByText("60kg × 8 → 60kg × 10")).toBeVisible();
  });

  // The join's whole reason for existing: same set count, opposite verdict,
  // because only one of the two is producing anything.
  it("separates a stalled group from a growing one at an identical set count", () => {
    renderPage({
      muscleVolumeSummary: buildVolumeSummary([
        { muscleGroup: "pecho", effectiveSets: 13 },
        { muscleGroup: "dorsal", effectiveSets: 13 },
      ]),
      exerciseSeriesGroups: [buildSeriesGroup("Press de banca", "pecho"), buildSeriesGroup("Jalón", "dorsal")],
      improvements: [
        {
          exerciseNameEs: "Press de banca",
          improvement: buildImprovement({ improved: true, signals: ["volume_load"] }),
          latestCompletedAt: new Date("2026-08-10T12:00:00"),
        },
        { exerciseNameEs: "Jalón", improvement: buildImprovement(), latestCompletedAt: new Date("2026-08-10T12:00:00") },
      ],
    });

    expect(progressSection().getByText("Creciendo")).toBeVisible();
    expect(progressSection().getByText("Estancado")).toBeVisible();
    expect(progressSection().getByText(/El volumen ya alcanza/)).toBeVisible();
  });

  it("surfaces pain on the row itself rather than behind a disclosure", () => {
    renderPage({
      muscleVolumeSummary: buildVolumeSummary([{ muscleGroup: "pecho", effectiveSets: 26 }]),
      exerciseSeriesGroups: [buildSeriesGroup("Press de banca", "pecho")],
      improvements: [
        {
          exerciseNameEs: "Press de banca",
          improvement: buildImprovement({ latestMaxPain: 4 }),
          latestCompletedAt: new Date("2026-08-10T12:00:00"),
        },
      ],
    });

    expect(progressSection().getByText("Pasado de vuelta")).toBeVisible();
    expect(progressSection().getByText("Dolor 4")).toBeVisible();
  });

  it("hides the section entirely when there is no volume summary", () => {
    renderPage({ muscleVolumeSummary: null });

    expect(screen.queryByText("¿Está funcionando?")).toBeNull();
  });
});

describe("formatRatio", () => {
  it("reads the correct way round when the right side is larger", () => {
    // Real dev-DB data: cuádriceps 4, femorales 6 -> 0.667. There is MORE
    // femoral work, so this must not render "1.5 : 1". Both branches were
    // inverted when this shipped and the dashboard stated the opposite of
    // the data.
    expect(formatRatio(4 / 6)).toBe("1 : 1.5");
  });

  it("reads the correct way round when the left side is larger", () => {
    expect(formatRatio(8 / 4)).toBe("2.0 : 1");
  });

  it("renders an even split as 1 : 1", () => {
    expect(formatRatio(1)).toBe("1.0 : 1");
  });
});
