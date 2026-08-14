// The "¿Está funcionando?" report: one verdict per muscle group.
//
// Nothing here is a new measurement. Weekly sets already exist
// (buildMuscleVolumeSummary), per-exercise progression already exists
// (buildExerciseImprovements), and the exercise -> muscle group link already
// exists (toExerciseSeriesGroups). What was missing is the *join*: the page
// could say "pecho got 13 sets" and it could draw a bench-press line, but it
// could never say "pecho is getting enough work and still isn't moving" —
// which is the sentence a progress report exists to produce.
//
// Volume is the input, progression is the output, and each combination of the
// two has a DIFFERENT correction. That is the whole point of crossing them:
// adding load to a muscle already past its recoverable volume digs the hole
// deeper, while adding sets to an under-dosed one fixes it in a week.

import { muscleGroups, weeklySetReferenceRange, type MuscleGroup } from "@/training/muscle-taxonomy";

import type { ExerciseSeriesGroup } from "./exercise-series";
import type { ExerciseImprovementRow } from "./improvement";
import { PAIN_THRESHOLD, UNCLASSIFIED_BUCKET, type VolumeView } from "./muscle-volume";

export type MuscleProgressVerdict =
  /** In (or over) the band and at least one exercise moved. Change nothing. */
  | "growing"
  /** Enough sets, nothing moved. The dose is fine — intensity is the suspect. */
  | "stalled"
  /** Under the band's floor. The cheap correction: add sets before adding load. */
  | "under_stimulus"
  /** Over the band's ceiling and nothing moved — fatigue that isn't buying muscle. */
  | "overreaching"
  /** Trained, but no exercise has two completed instances yet to compare. */
  | "no_data";

export type BandPosition = "below" | "within" | "above";

/**
 * The headline lift for a group, stated in the units the athlete trains in
 * (weight x reps) rather than as volume-load kg or an estimated 1RM.
 *
 * Both are averages across the instance's sets, not a single best set — they
 * come straight from ExerciseImprovement, which is what the 5%-improvement
 * signals are already computed against. Showing a best set here would let the
 * lift contradict the verdict beside it.
 */
export type MuscleProgressLift = {
  exerciseNameEs: string;
  previousWeightKg: number;
  previousReps: number;
  latestWeightKg: number;
  latestReps: number;
  improved: boolean;
};

export type MuscleProgressRow = {
  muscleGroup: MuscleGroup;
  /** Sets/week for a single-week view, average sets/week for the multi-week
   *  views — whatever unit the VolumeView passed in carries. */
  effectiveSetsPerWeek: number;
  referenceRange: { min: number; max: number };
  bandPosition: BandPosition;
  /** Exercises primarily training this group that have two instances to compare. */
  comparedExerciseCount: number;
  improvedExerciseCount: number;
  bestLift: MuscleProgressLift | null;
  /** Highest pain logged on this group's compared exercises. Surfaced on the
   *  row rather than hidden behind a disclosure: pain is a conditional signal,
   *  and the app already gates progression on it at PAIN_THRESHOLD. */
  maxPainScore: number;
  verdict: MuscleProgressVerdict;
};

// Attention-first, so the top row is the one to act on. Ties fall back to the
// taxonomy's own anatomical order, which keeps the table stable between visits
// instead of reshuffling every time a signal flips.
const VERDICT_PRIORITY: MuscleProgressVerdict[] = [
  "overreaching",
  "stalled",
  "under_stimulus",
  "no_data",
  "growing",
];

function bandPositionFor(effectiveSetsPerWeek: number, range: { min: number; max: number }): BandPosition {
  if (effectiveSetsPerWeek < range.min) {
    return "below";
  }
  return effectiveSetsPerWeek > range.max ? "above" : "within";
}

function verdictFor(
  bandPosition: BandPosition,
  comparedExerciseCount: number,
  improvedExerciseCount: number,
): MuscleProgressVerdict {
  // No second instance anywhere in the group, so the output half is unknown.
  // The input half still is not: sets under the floor is a statement about the
  // dose that needs no trend data to make.
  if (comparedExerciseCount === 0) {
    return bandPosition === "below" ? "under_stimulus" : "no_data";
  }

  if (improvedExerciseCount > 0) {
    return "growing";
  }

  // Flat. Which correction applies depends entirely on where the dose sits.
  if (bandPosition === "above") {
    return "overreaching";
  }
  return bandPosition === "below" ? "under_stimulus" : "stalled";
}

/**
 * Picks the one lift that best corroborates the verdict beside it.
 *
 * An improved exercise wins over a flat one — a row that reads "Creciendo"
 * next to a lift that visibly did not move would undermine both. Among
 * equals, the biggest per-set gain (weight x reps), then the most recent.
 */
function pickBestLift(candidates: ExerciseImprovementRow[]): MuscleProgressLift | null {
  if (candidates.length === 0) {
    return null;
  }

  const ranked = [...candidates].sort((a, b) => {
    if (a.improvement.improved !== b.improvement.improved) {
      return a.improvement.improved ? -1 : 1;
    }
    const gainDelta = perSetGain(b) - perSetGain(a);
    if (gainDelta !== 0) {
      return gainDelta;
    }
    const recencyDelta = (b.latestCompletedAt?.getTime() ?? 0) - (a.latestCompletedAt?.getTime() ?? 0);
    return recencyDelta !== 0 ? recencyDelta : a.exerciseNameEs.localeCompare(b.exerciseNameEs, "es");
  });

  const best = ranked[0]!;
  return {
    exerciseNameEs: best.exerciseNameEs,
    previousWeightKg: best.improvement.previousAvgWeightKg,
    previousReps: best.improvement.previousAvgReps,
    latestWeightKg: best.improvement.latestAvgWeightKg,
    latestReps: best.improvement.latestAvgReps,
    improved: best.improvement.improved,
  };
}

/** Relative change in per-set work (weight x reps) — one scalar that ranks a
 *  weight jump and a rep jump on the same scale. Zero when there's no
 *  baseline to divide by, so a first-ever comparison never sorts to the top. */
function perSetGain(row: ExerciseImprovementRow): number {
  const previous = row.improvement.previousAvgWeightKg * row.improvement.previousAvgReps;
  if (previous <= 0) {
    return 0;
  }
  const latest = row.improvement.latestAvgWeightKg * row.improvement.latestAvgReps;
  return (latest - previous) / previous;
}

/**
 * Joins weekly volume, per-exercise progression, and the exercise->muscle
 * group link into one verdict per muscle group.
 *
 * Only groups with logged sets in the period appear. A group the plan never
 * trains would otherwise render as a permanent "falta estímulo" row for every
 * muscle the athlete deliberately doesn't work — the body map and the volume
 * bars already show absence, and this report is about the groups in play.
 *
 * One asymmetry worth stating: the sets column includes secondary credit at
 * half a set (a remo genuinely trains bíceps), while the progression column
 * counts only exercises whose PRIMARY group is this one. That is deliberate —
 * a remo getting stronger is evidence about the back, not proof the biceps
 * grew, so it must not be allowed to mark bíceps "Creciendo".
 */
export function buildMuscleProgressRows(
  view: VolumeView,
  seriesGroups: ExerciseSeriesGroup[],
  improvements: ExerciseImprovementRow[],
): MuscleProgressRow[] {
  const primaryGroupByExerciseName = new Map<string, MuscleGroup>();
  for (const group of seriesGroups) {
    if (group.primaryMuscleGroup) {
      primaryGroupByExerciseName.set(group.exerciseNameEs, group.primaryMuscleGroup);
    }
  }

  const improvementsByGroup = new Map<MuscleGroup, ExerciseImprovementRow[]>();
  for (const row of improvements) {
    const muscleGroup = primaryGroupByExerciseName.get(row.exerciseNameEs);
    if (!muscleGroup) {
      continue;
    }
    const existing = improvementsByGroup.get(muscleGroup);
    if (existing) {
      existing.push(row);
    } else {
      improvementsByGroup.set(muscleGroup, [row]);
    }
  }

  const rows: MuscleProgressRow[] = [];

  for (const entry of view.byMuscleGroup) {
    if (entry.muscleGroup === UNCLASSIFIED_BUCKET || entry.effectiveSets <= 0) {
      continue;
    }
    const muscleGroup = entry.muscleGroup;
    const referenceRange = weeklySetReferenceRange[muscleGroup];
    const groupImprovements = improvementsByGroup.get(muscleGroup) ?? [];
    const bandPosition = bandPositionFor(entry.effectiveSets, referenceRange);
    const improvedExerciseCount = groupImprovements.filter((row) => row.improvement.improved).length;

    rows.push({
      muscleGroup,
      effectiveSetsPerWeek: entry.effectiveSets,
      referenceRange,
      bandPosition,
      comparedExerciseCount: groupImprovements.length,
      improvedExerciseCount,
      bestLift: pickBestLift(groupImprovements),
      maxPainScore: groupImprovements.reduce((max, row) => Math.max(max, row.improvement.latestMaxPain), 0),
      verdict: verdictFor(bandPosition, groupImprovements.length, improvedExerciseCount),
    });
  }

  return rows.sort((a, b) => {
    const priorityDelta = VERDICT_PRIORITY.indexOf(a.verdict) - VERDICT_PRIORITY.indexOf(b.verdict);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return muscleGroups.indexOf(a.muscleGroup) - muscleGroups.indexOf(b.muscleGroup);
  });
}

/**
 * Picks the window the verdicts are computed over.
 *
 * Deliberately NOT the period pills that drive the body map and the volume
 * bars. Declaring a muscle group "estancado" off a single week is noise — one
 * missed session or one deload week would flip the verdict — so this fixes on
 * the 4-week average, which is also the timescale the corrections it suggests
 * play out over. Falls back to the current week only while there isn't yet a
 * completed week to average, so a first-week athlete still gets a report.
 */
export function pickProgressView(views: VolumeView[]): VolumeView | null {
  const fourWeeks = views.find((view) => view.key === "four_weeks");
  if (fourWeeks && fourWeeks.weeksCounted > 0) {
    return fourWeeks;
  }
  return views.find((view) => view.key === "week") ?? null;
}

/** True when any row carries pain at or above the app's own progression gate.
 *  Lets the caller escalate the section instead of the athlete having to open
 *  something to find out. */
export function hasPainFlag(rows: MuscleProgressRow[]): boolean {
  return rows.some((row) => row.maxPainScore > PAIN_THRESHOLD);
}
