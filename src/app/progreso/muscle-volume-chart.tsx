"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  muscleGroupLabelsEs,
  muscleGroups,
  weeklySetReferenceRange,
  type MuscleGroup,
} from "@/training/muscle-taxonomy";
import { UNCLASSIFIED_BUCKET, type VolumeView, type WeeklyMuscleVolume } from "@/workouts/muscle-volume";

// Deliberately NOT built on bar-chart.tsx. That one is vertical,
// zero-baselined and week-indexed with a single shared target line; this needs
// one horizontal row per muscle group with its own reference band. Generalizing
// it would roughly double its prop surface for one caller and put the working
// Consistencia semanal chart at risk — same reasoning that gave
// dual-line-chart.tsx its own file next to line-chart.tsx.
//
// Also a deliberate deviation from "every chart is one inline <svg>": the
// labels are real HTML text so they inherit the raised type scale (text-xs is
// 14px, raised for readability at 47+). Rendering "Abductores y aductores" as
// SVG <text> in a 300-unit viewBox would mean ~8px glyphs, which is the exact
// thing that type-scale change exists to prevent. The bars themselves are
// still hand-rolled inline SVG.
//
// Zero-volume groups (mobile UX pass, 2026-08-09): rendering all 13 rows
// unconditionally cost ~570px+ of vertical space even on a partial week where
// most groups are legitimately not-yet-trained. But a muscle sitting at 0 is
// the single most actionable line this report can show a coach, so it cannot
// simply be dropped. Resolution: groups with effectiveSets > 0 keep their full
// bar row; groups at 0 collapse into one always-visible plain-text line
// ("Sin series esta semana: X, Y, Z") so the signal survives without an extra
// tap, with per-group reference ranges available behind a <details> for
// anyone who wants them. Cost: a 0-volume group loses its bar/band comparison
// and its own tap-to-expand — an acceptable loss, since 0 vs. any positive
// range is definitionally "below," so the visual comparison has nothing to
// add at exactly zero.

const BAR_VIEW_WIDTH = 200;
const BAR_VIEW_HEIGHT = 10;
const BAR_RADIUS = 2;

type MuscleVolumeRow = {
  key: string;
  labelEs: string;
  effectiveSets: number;
  referenceRange: { min: number; max: number } | null;
};

/**
 * Change against the previous calendar week, or null when there is no honest
 * comparison to make.
 *
 * Returns null when the previous week has NO volume at all, which is the case
 * that matters: on your first week of training, and after any gap, every
 * muscle would otherwise render a triumphant "+N" against an empty baseline.
 * That reads as progress when it is really just "there was nothing before".
 *
 * A per-muscle weekly line chart was considered instead and rejected: with a
 * 5-day rotation, a muscle's weekly volume swings on whether you hit its day,
 * so the line would mostly plot your calendar rather than your training. A
 * single-step delta makes the same comparison without dressing frequency noise
 * up as a trend.
 */
export function weekOverWeekDelta(
  comparison: VolumeView["comparison"],
  key: string,
  currentSets: number,
): number | null {
  if (!comparison) {
    return null;
  }
  const previousSets = comparison.byMuscleGroup.find((row) => row.muscleGroup === key)?.effectiveSets ?? 0;
  const delta = Math.round((currentSets - previousSets) * 100) / 100;
  return delta === 0 ? 0 : delta;
}

function formatDelta(delta: number): string {
  if (delta === 0) return "—";
  const magnitude = Number.isInteger(delta) ? String(Math.abs(delta)) : Math.abs(delta).toFixed(1);
  return `${delta > 0 ? "▲ +" : "▼ −"}${magnitude}`;
}

function emptyMessageEs(view: VolumeView): string {
  if (view.isAverage) return "Todavía no hay semanas completas que promediar.";
  if (view.key === "previous_week") return "No registraste series la semana pasada.";
  return "Todavía no hay series registradas esta semana.";
}

function formatSets(value: number): string {
  // Half-set credit for secondary muscles means totals legitimately land on
  // .5; anything else reads as false precision.
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function buildMuscleVolumeRows(view: { byMuscleGroup: WeeklyMuscleVolume["byMuscleGroup"] }): MuscleVolumeRow[] {
  const setsByGroup = new Map(view.byMuscleGroup.map((row) => [row.muscleGroup, row.effectiveSets]));

  const rows: MuscleVolumeRow[] = muscleGroups.map((muscleGroup: MuscleGroup) => ({
    key: muscleGroup,
    labelEs: muscleGroupLabelsEs[muscleGroup],
    effectiveSets: setsByGroup.get(muscleGroup) ?? 0,
    referenceRange: weeklySetReferenceRange[muscleGroup],
  }));

  const unclassified = setsByGroup.get(UNCLASSIFIED_BUCKET) ?? 0;
  if (unclassified > 0) {
    rows.push({
      key: UNCLASSIFIED_BUCKET,
      labelEs: "Sin clasificar",
      effectiveSets: unclassified,
      referenceRange: null,
    });
  }

  return rows;
}

// No sr-only summary paragraph: every label, number and delta below is real
// HTML text, so a screen reader already reads the whole table. Duplicating it
// into an sr-only sentence made assistive tech announce everything twice. Only
// the bars are SVG, and they carry no information the text doesn't.
export function MuscleVolumeChart({ view }: { view: VolumeView }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const rows = buildMuscleVolumeRows(view);

  // Groups with real volume this week get the full bar row; groups sitting at
  // 0 collapse into a compact, always-visible name list below (see the
  // "Zero-volume groups" note above) instead of a 44px row each.
  const trainedRows = rows.filter((row) => row.effectiveSets > 0);
  const untrainedRows = rows.filter((row) => row.effectiveSets === 0);

  // One shared x-domain so bars are comparable across rows. Only scans
  // trainedRows now: a 0-volume group's reference band no longer needs to fit
  // on the axis once that group isn't rendered as a bar at all.
  const maxValue = Math.max(
    1,
    ...trainedRows.map((row) => row.effectiveSets),
    ...trainedRows.map((row) => row.referenceRange?.max ?? 0),
  );
  const toX = (value: number) => (value / maxValue) * BAR_VIEW_WIDTH;


  return (
    <div>
      {trainedRows.length === 0 ? (
        <p className="text-xs leading-5 text-zinc-400">{emptyMessageEs(view)}</p>
      ) : (
        <ul className="grid gap-0.5">
          {trainedRows.map((row) => {
            const isActive = activeKey === row.key;
            const belowRange = row.referenceRange ? row.effectiveSets < row.referenceRange.min : false;
            return (
              <li key={row.key}>
                <button
                  type="button"
                  onPointerDown={() => setActiveKey(isActive ? null : row.key)}
                  aria-expanded={isActive}
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg px-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 active:bg-zinc-800/40"
                >
                  <span className="w-28 shrink-0 text-xs leading-5 text-zinc-300">{row.labelEs}</span>
                  <svg
                    viewBox={`0 0 ${BAR_VIEW_WIDTH} ${BAR_VIEW_HEIGHT}`}
                    className="h-2.5 w-full touch-none"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    {row.referenceRange ? (
                      <rect
                        x={toX(row.referenceRange.min)}
                        y={0}
                        width={Math.max(0, toX(row.referenceRange.max) - toX(row.referenceRange.min))}
                        height={BAR_VIEW_HEIGHT}
                        className="fill-zinc-700/40"
                      />
                    ) : null}
                    <rect
                      x={0}
                      y={1}
                      width={Math.max(1, toX(row.effectiveSets))}
                      height={BAR_VIEW_HEIGHT - 2}
                      rx={BAR_RADIUS}
                      // No warning colour for a below-range row. A five-day
                      // rotation with two-set accessories genuinely lands under
                      // most bands, and painting that red would both demotivate
                      // and nudge toward junk volume. Colour is reserved for pain.
                      className={belowRange ? "fill-zinc-500" : "fill-emerald-300"}
                    />
                  </svg>
                  <span className="w-8 shrink-0 text-right text-xs tabular-nums text-zinc-300">
                    {formatSets(row.effectiveSets)}
                  </span>
                  {(() => {
                    const delta = weekOverWeekDelta(view.comparison, row.key, row.effectiveSets);
                    // zinc, never green/red: colour here is reserved for pain,
                    // and "fewer sets" is not a warning.
                    return delta === null ? (
                      <span className="w-14 shrink-0" />
                    ) : (
                      <span className="w-14 shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-zinc-400">
                        {formatDelta(delta)}
                      </span>
                    );
                  })()}
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
                      isActive ? "rotate-180 text-zinc-300" : "text-zinc-500"
                    }`}
                  />
                </button>
                {isActive ? (
                  <p className="px-1 pb-2 text-xs leading-5 text-zinc-400">
                    {row.referenceRange
                      ? `${formatSets(row.effectiveSets)} series efectivas · rango de referencia ${row.referenceRange.min}–${row.referenceRange.max}`
                      : `${formatSets(row.effectiveSets)} series de ejercicios sin clasificar`}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {trainedRows.length > 0 && untrainedRows.length > 0 ? (
        <details className="group mt-1">
          <summary className="flex min-h-11 w-full cursor-pointer list-none items-start gap-2 rounded-lg px-1 py-2 text-left [&::-webkit-details-marker]:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 active:bg-zinc-800/40">
            <ChevronDown
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-150 group-open:rotate-180 group-open:text-zinc-300"
            />
            <span className="text-xs leading-5 text-zinc-400">
              <span className="font-semibold text-zinc-300">Sin series esta semana ({untrainedRows.length}): </span>
              {untrainedRows.map((row) => row.labelEs).join(", ")}
            </span>
          </summary>
          <ul className="mt-1 grid gap-0.5 pl-6">
            {untrainedRows.map((row) => (
              <li key={row.key} className="text-xs leading-5 text-zinc-500">
                {row.labelEs}
                {row.referenceRange ? ` — rango de referencia ${row.referenceRange.min}–${row.referenceRange.max}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <p className="mt-2 text-xs leading-5 text-zinc-400">
        {view.comparison ? `▲▼ compara con ${view.comparison.labelEs}. ` : ""}
        La banda gris es el rango de referencia semanal, no una meta. Un ejercicio cuenta 1 serie para su grupo
        principal y media para cada grupo secundario; en unilaterales, izquierda y derecha cuentan como una sola serie.
      </p>
    </div>
  );
}
