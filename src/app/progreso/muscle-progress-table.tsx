import { formatKg } from "@/lib/format";
import { muscleGroupLabelsEs } from "@/training/muscle-taxonomy";
import type { MuscleProgressLift, MuscleProgressRow, MuscleProgressVerdict } from "@/workouts/muscle-progress";

// Deliberately NOT a <table>. Four columns of muscle group / sets / lift /
// verdict is exactly the fixed-track layout that has already overflowed this
// page three times (a 112px label column couldn't fit "Abductores y
// aductores"). Each group is a stacked block instead, so every field gets the
// card's full width and nothing is ever squeezed into a track it can't fit.

const VERDICT_LABEL_ES: Record<MuscleProgressVerdict, string> = {
  growing: "Creciendo",
  stalled: "Estancado",
  under_stimulus: "Falta estímulo",
  overreaching: "Pasado de vuelta",
  no_data: "Sin datos",
};

// Each verdict earns its colour from what it asks of you, not from how it
// sounds: emerald = change nothing, amber = adjust, rose = back off,
// zinc = we can't say yet.
const VERDICT_CLASS: Record<MuscleProgressVerdict, string> = {
  growing: "bg-emerald-300/10 text-emerald-300",
  stalled: "bg-amber-300/10 text-amber-200",
  under_stimulus: "bg-sky-300/10 text-sky-200",
  overreaching: "bg-rose-400/10 text-rose-300",
  no_data: "bg-zinc-800 text-zinc-400",
};

const BAR_CLASS: Record<MuscleProgressVerdict, string> = {
  growing: "bg-emerald-300",
  stalled: "bg-amber-300",
  under_stimulus: "bg-sky-300",
  overreaching: "bg-rose-400",
  no_data: "bg-zinc-600",
};

// The correction, not a restatement of the verdict. A group that needs nothing
// says nothing — silence is the useful answer for "Creciendo", and printing an
// encouragement on every healthy row would bury the three that need action.
const VERDICT_ACTION_ES: Record<MuscleProgressVerdict, string | null> = {
  growing: null,
  stalled: "El volumen ya alcanza: acércate más al fallo o cambia el ejercicio.",
  under_stimulus: "Añade series antes de subir el peso.",
  overreaching: "Baja el volumen. Es fatiga que no se está convirtiendo en músculo.",
  no_data: "Repite un mismo ejercicio en dos sesiones para poder compararlo.",
};

export function MuscleProgressTable({ rows }: { rows: MuscleProgressRow[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2">
      {rows.map((row) => (
        <li key={row.muscleGroup} className="rounded-xl bg-zinc-950/40 p-3 ring-1 ring-zinc-800">
          <MuscleProgressRowContent row={row} />
        </li>
      ))}
    </ul>
  );
}

function MuscleProgressRowContent({ row }: { row: MuscleProgressRow }) {
  const action = VERDICT_ACTION_ES[row.verdict];

  return (
    <>
      {/* min-w-0 on the name so a long label ("Abductores y aductores")
          wraps instead of pushing the verdict chip out of the card. */}
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-semibold text-zinc-100">{muscleGroupLabelsEs[row.muscleGroup]}</p>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {/* Pain rides on the row rather than waiting inside a disclosure:
              it's a conditional signal, and the app already blocks aggressive
              progression on it. Absent entirely when nothing crossed the gate. */}
          {row.maxPainScore > 2 ? (
            <span className="rounded-full bg-rose-400/10 px-2 py-1 text-xs font-semibold text-rose-300">
              Dolor {row.maxPainScore}
            </span>
          ) : null}
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${VERDICT_CLASS[row.verdict]}`}>
            {VERDICT_LABEL_ES[row.verdict]}
          </span>
        </div>
      </div>

      <div className="mt-2">
        <BandBar row={row} />
      </div>

      {row.bestLift ? (
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          <span className="text-zinc-400">{row.bestLift.exerciseNameEs}: </span>
          {formatLift(row.bestLift)}
        </p>
      ) : null}

      {action ? <p className="mt-1 text-xs leading-5 text-zinc-400">{action}</p> : null}
    </>
  );
}

/**
 * Sets against the reference band.
 *
 * The band is a lit zone on the track and the actual value a bar over it, so
 * "below the floor" and "past the ceiling" are visible without reading either
 * number. The floor and ceiling are then re-drawn as ticks ON TOP of the bar:
 * an opaque fill covers the zone it passes, which hid the single case the bar
 * most needs to show — a group that overshot its ceiling looked identical to
 * one that exactly filled it.
 *
 * Everything is percentage-based, so no fixed track can overflow, and an
 * above-band value stays inside the card because the scale grows with it.
 */
function BandBar({ row }: { row: MuscleProgressRow }) {
  const { referenceRange, effectiveSetsPerWeek } = row;
  const scaleMax = Math.max(referenceRange.max, effectiveSetsPerWeek) * 1.1 || 1;
  const percentOf = (value: number) => Math.min(100, (value / scaleMax) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="absolute inset-y-0 bg-zinc-700"
          style={{ left: `${percentOf(referenceRange.min)}%`, right: `${100 - percentOf(referenceRange.max)}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${BAR_CLASS[row.verdict]}`}
          style={{ width: `${percentOf(effectiveSetsPerWeek)}%` }}
        />
        {/* A zero floor is the left edge of the track, not a boundary to mark. */}
        {referenceRange.min > 0 ? (
          <div className="absolute inset-y-0 w-px bg-zinc-950/70" style={{ left: `${percentOf(referenceRange.min)}%` }} />
        ) : null}
        <div className="absolute inset-y-0 w-px bg-zinc-950/70" style={{ left: `${percentOf(referenceRange.max)}%` }} />
      </div>
      <p className="shrink-0 text-xs tabular-nums text-zinc-400">
        <span className="font-semibold text-zinc-200">{formatSets(effectiveSetsPerWeek)}</span> /{" "}
        {referenceRange.min}–{referenceRange.max}
      </p>
    </div>
  );
}

/**
 * States the lift the way it was trained — weight x reps — instead of as a
 * volume-load total or an estimated 1RM. "60kg × 8 → 60kg × 10" is readable
 * standing at the machine; "1600kg" and "76,1kg de 1RM estimado" are not.
 */
function formatLift(lift: MuscleProgressLift): string {
  const previous = `${formatKg(lift.previousWeightKg, 1)} × ${formatReps(lift.previousReps)}`;
  const latest = `${formatKg(lift.latestWeightKg, 1)} × ${formatReps(lift.latestReps)}`;
  return `${previous} → ${latest}`;
}

/** Averages across a set land on fractions (three sets of 8/8/9 average 8.3).
 *  One decimal, trimmed — 8 stays 8 rather than becoming 8.0. */
function formatReps(reps: number): string {
  return `${Number(reps.toFixed(1))}`;
}

/** Half-set credit for secondary muscles means these are genuinely fractional. */
function formatSets(sets: number): string {
  return `${Number(sets.toFixed(1))}`;
}
