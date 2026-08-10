import type { MuscleGroup } from "@/training/muscle-taxonomy";

import { average, totalVolumeLoadKg } from "./improvement";
import { toStrengthSetLog, type ExerciseInstance, type StrengthSetLog } from "./workout-repository";

export type ExerciseSeriesPoint = {
  completedAt: Date;
  avgWeightKg: number;
  volumeLoadKg: number;
  // Only meaningful for unilateral exercises; null when that side has no
  // logged sets for this instance (e.g. a bilateral warm-up set mixed in, or
  // a session where only one side got trained).
  leftAvgWeightKg: number | null;
  rightAvgWeightKg: number | null;
  leftVolumeLoadKg: number | null;
  rightVolumeLoadKg: number | null;
  // Average RIR per side — a load-matched pair of sides can carry very
  // different effort (e.g. weak side at RIR0/failure, strong side at RIR4
  // deliberately held back per progression-rules.md's "stronger side
  // matches weaker side's load" rule), which the weight/volume fields above
  // can't reveal on their own.
  leftAvgRir: number | null;
  rightAvgRir: number | null;
};

export type ExerciseSeriesGroup = {
  exerciseNameEs: string;
  isUnilateral: boolean;
  /** Read off the most recent instance — classification is per prescription,
   *  but this series is keyed by name, so the same name across two days could
   *  in principle carry different links. Most recent wins; the weekly volume
   *  report resolves per prescription and stays correct either way. */
  primaryMuscleGroup: MuscleGroup | null;
  isClassified: boolean;
  substitutedForNameEs: string | null;
  points: ExerciseSeriesPoint[];
};

function sideAverage(sets: StrengthSetLog[], side: "left" | "right", selector: (set: StrengthSetLog) => number): number | null {
  const sideSets = sets.filter((set) => set.side === side);
  return sideSets.length ? average(sideSets.map(selector)) : null;
}

function sideVolume(sets: StrengthSetLog[], side: "left" | "right"): number | null {
  const sideSets = sets.filter((set) => set.side === side);
  return sideSets.length ? totalVolumeLoadKg(sideSets) : null;
}

/**
 * Builds an ascending (oldest-first) per-exercise series for the /progreso
 * progression chart, from the same ExerciseInstance[] shape
 * getRecentExerciseInstancesByName already returns (most-recent-first,
 * duration-type instances excluded at the query). Skips instances with no
 * completedAt or no logged sets — nothing to plot for those.
 */
export function buildExerciseSeries(instances: ExerciseInstance[]): ExerciseSeriesPoint[] {
  const points: ExerciseSeriesPoint[] = [];

  for (const instance of instances) {
    if (!instance.completedAt || instance.sets.length === 0) {
      continue;
    }
    const strengthSets = instance.sets.map(toStrengthSetLog);
    points.push({
      completedAt: instance.completedAt,
      avgWeightKg: average(strengthSets.map((set) => Number(set.actualWeightKg))),
      volumeLoadKg: totalVolumeLoadKg(strengthSets),
      leftAvgWeightKg: sideAverage(strengthSets, "left", (set) => Number(set.actualWeightKg)),
      rightAvgWeightKg: sideAverage(strengthSets, "right", (set) => Number(set.actualWeightKg)),
      leftVolumeLoadKg: sideVolume(strengthSets, "left"),
      rightVolumeLoadKg: sideVolume(strengthSets, "right"),
      leftAvgRir: sideAverage(strengthSets, "left", (set) => set.rir),
      rightAvgRir: sideAverage(strengthSets, "right", (set) => set.rir),
    });
  }

  return points.sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
}

/**
 * Builds the /progreso exercise list, sorted alphabetically (es).
 * isUnilateral is read off the first instance — whether an exercise is
 * unilateral is a property of the exercise prescription, not expected to
 * change instance-to-instance.
 *
 * Groups with no points are dropped. An exerciseLog row is created as soon as
 * you open an exercise while training, so an exercise you started and logged
 * nothing against — or whose sets you later deleted — still comes back from
 * getRecentExerciseInstancesByName with zero sets. Two such rows exist in the
 * real data ("Extensión de cuádriceps unilateral", "Prensa bilateral"), and
 * they were rendering as exercise rows with a dash and no chart. There is no
 * series to show, so there should be no row: filtered here at the source
 * rather than in the list component, so pickDefaultExerciseName can't pick one
 * either.
 */
export function toExerciseSeriesGroups(instancesByName: Map<string, ExerciseInstance[]>): ExerciseSeriesGroup[] {
  return [...instancesByName.entries()]
    .map(([exerciseNameEs, instances]) => ({
      exerciseNameEs,
      isUnilateral: instances[0]?.isUnilateral ?? false,
      // instances are newest-first from the query, so [0] is the most recent.
      primaryMuscleGroup: instances[0]?.primaryMuscleGroup ?? null,
      isClassified: instances[0]?.isClassified ?? false,
      substitutedForNameEs: instances[0]?.substitutedForNameEs ?? null,
      points: buildExerciseSeries(instances),
    }))
    .filter((group) => group.points.length > 0)
    .sort((a, b) => a.exerciseNameEs.localeCompare(b.exerciseNameEs, "es"));
}

export type EffortGapPoint = {
  completedAt: Date;
  // left avg RIR - right avg RIR. Positive: left had more reserve, i.e.
  // right worked closer to failure at the matched load. Negative: the
  // opposite. Zero: both sides equally challenged at that load — the point
  // at which matching load stops masking a real capacity difference.
  gapRir: number;
};

/**
 * Derives the effort (RIR) gap between sides for a unilateral exercise —
 * the signal a load-matched dual-line weight/volume chart can't show, since
 * matching load by design makes both sides' weight/volume lines converge
 * regardless of how much real capacity difference remains. Only includes
 * instances where both sides have a recorded RIR.
 */
export function buildEffortGapSeries(points: ExerciseSeriesPoint[]): EffortGapPoint[] {
  const withBothSides = points.filter(
    (point): point is ExerciseSeriesPoint & { leftAvgRir: number; rightAvgRir: number } =>
      point.leftAvgRir !== null && point.rightAvgRir !== null,
  );
  return withBothSides.map((point) => ({ completedAt: point.completedAt, gapRir: point.leftAvgRir - point.rightAvgRir }));
}

/**
 * Defaults the /progreso exercise picker to whichever exercise was trained
 * most recently — the most likely thing the user just came here to check.
 */
export function pickDefaultExerciseName(groups: ExerciseSeriesGroup[]): string | null {
  let bestName: string | null = null;
  let bestLatestMs = -Infinity;

  for (const group of groups) {
    const latestMs = group.points.at(-1)?.completedAt.getTime() ?? -Infinity;
    if (latestMs > bestLatestMs) {
      bestLatestMs = latestMs;
      bestName = group.exerciseNameEs;
    }
  }

  return bestName;
}
