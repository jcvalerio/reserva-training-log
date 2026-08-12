import type { ExerciseImprovement, ExerciseImprovementRow, ImprovementSignal } from "@/workouts/improvement";

export type TopExerciseRow = {
  exerciseNameEs: string;
  signal: ImprovementSignal;
  labelEs: string;
  displayEs: string;
  /** Percentage (or, for pain, a raw point drop) — comparable enough across
   *  signal types to rank by, never shown directly. */
  magnitude: number;
};

// When more than one signal fired for the same exercise, this decides which
// one gets the headline — most strength-relevant first, matching what a
// lifter would actually want called out (a 1RM jump over a plain volume
// increase; volume over the more incidental pain/asymmetry signals).
const SIGNAL_PRIORITY: ImprovementSignal[] = [
  "estimated_1rm",
  "load_at_reps",
  "reps_at_load",
  "volume_load",
  "asymmetry_performance",
  "pain",
];

const SIGNAL_LABEL_ES: Record<ImprovementSignal, string> = {
  estimated_1rm: "1RM estimado",
  load_at_reps: "Peso",
  reps_at_load: "Reps",
  volume_load: "Volumen",
  asymmetry_performance: "Asimetría",
  pain: "Dolor",
};

function growthPercent(latest: number, previous: number): number | null {
  if (previous <= 0) {
    return null;
  }
  return ((latest - previous) / previous) * 100;
}

// Every growth signal (all but pain) only ever fires once computeExerciseImprovement's
// gate confirms latest >= previous * 1.05 — so when a percentage is returned here
// it is always positive by construction, never a coincidence of the formatting.
function rowForSignal(
  exerciseNameEs: string,
  signal: ImprovementSignal,
  improvement: ExerciseImprovement,
): TopExerciseRow | null {
  const labelEs = SIGNAL_LABEL_ES[signal];

  switch (signal) {
    case "estimated_1rm": {
      if (improvement.latestEstimated1RmKg === null || improvement.previousEstimated1RmKg === null) {
        return null;
      }
      const pct = growthPercent(improvement.latestEstimated1RmKg, improvement.previousEstimated1RmKg);
      return pct === null ? null : { exerciseNameEs, signal, labelEs, displayEs: `+${pct.toFixed(1)}%`, magnitude: pct };
    }
    case "load_at_reps": {
      const pct = growthPercent(improvement.latestAvgWeightKg, improvement.previousAvgWeightKg);
      return pct === null ? null : { exerciseNameEs, signal, labelEs, displayEs: `+${pct.toFixed(1)}%`, magnitude: pct };
    }
    case "reps_at_load": {
      const pct = growthPercent(improvement.latestAvgReps, improvement.previousAvgReps);
      return pct === null ? null : { exerciseNameEs, signal, labelEs, displayEs: `+${pct.toFixed(1)}%`, magnitude: pct };
    }
    case "volume_load": {
      const pct = growthPercent(improvement.latestVolumeLoadKg, improvement.previousVolumeLoadKg);
      return pct === null ? null : { exerciseNameEs, signal, labelEs, displayEs: `+${pct.toFixed(1)}%`, magnitude: pct };
    }
    case "asymmetry_performance": {
      const { latestAsymmetryGapKg, previousAsymmetryGapKg } = improvement;
      if (latestAsymmetryGapKg === null || previousAsymmetryGapKg === null || previousAsymmetryGapKg <= 0) {
        return null;
      }
      // Smaller gap is the improvement here, so this is "% of the gap closed"
      // — always positive when the signal fired, shown with a leading minus
      // to read naturally as "the gap got smaller" rather than implying growth.
      const closedPct = (1 - latestAsymmetryGapKg / previousAsymmetryGapKg) * 100;
      return { exerciseNameEs, signal, labelEs, displayEs: `−${closedPct.toFixed(0)}%`, magnitude: closedPct };
    }
    case "pain": {
      // Pain is an ordinal 0-10 score, not a ratio — a point drop, not a percent.
      const drop = improvement.previousMaxPain - improvement.latestMaxPain;
      return { exerciseNameEs, signal, labelEs, displayEs: `−${drop}`, magnitude: drop };
    }
  }
}

/**
 * Ranks improved exercises by how much their headline signal moved. A
 * reformatting of the same per-exercise deltas "Mejoras recientes" already
 * renders in full below this — not a new computation, and not shown for an
 * exercise that computeExerciseImprovement didn't already mark improved.
 */
export function buildTopExerciseRows(improvements: ExerciseImprovementRow[], limit = 5): TopExerciseRow[] {
  const rows: TopExerciseRow[] = [];

  for (const { exerciseNameEs, improvement } of improvements) {
    const signal = SIGNAL_PRIORITY.find((candidate) => improvement.signals.includes(candidate));
    if (!signal) {
      continue;
    }
    const row = rowForSignal(exerciseNameEs, signal, improvement);
    if (row) {
      rows.push(row);
    }
  }

  return rows.sort((a, b) => b.magnitude - a.magnitude).slice(0, limit);
}

export function TopExercisesList({ rows }: { rows: TopExerciseRow[] }) {
  return (
    <ul className="grid grid-cols-1 gap-0.5">
      {rows.map((row) => (
        <li key={row.exerciseNameEs} className="flex items-start justify-between gap-3 rounded-lg px-1 py-2">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-zinc-100">{row.exerciseNameEs}</span>
            <span className="block text-xs text-zinc-400">{row.labelEs}</span>
          </span>
          <span className="shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-emerald-300">{row.displayEs}</span>
        </li>
      ))}
    </ul>
  );
}
