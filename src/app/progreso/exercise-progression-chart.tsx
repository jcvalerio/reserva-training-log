"use client";

import { useState } from "react";

import { formatKg, formatShortDateEs } from "@/lib/format";
import { buildEffortGapSeries, type ExerciseSeriesGroup } from "@/workouts/exercise-series";
import { ONE_RM_MAX_REPS } from "@/workouts/improvement";

import { DualLineChart, type DualLineChartPoint } from "./dual-line-chart";
import { LineChart, type LineChartPoint } from "./line-chart";

type Metric = "avgWeightKg" | "volumeLoadKg" | "best1RmKg";

// Long form, for the chart's own aria-label summary.
const METRIC_LABEL: Record<Metric, string> = {
  avgWeightKg: "Peso promedio",
  volumeLoadKg: "Volumen",
  best1RmKg: "1RM estimado",
};

// Short form, for the toggle button itself — three of these side by side
// need to stay compact.
const METRIC_SHORT_LABEL: Record<Metric, string> = {
  avgWeightKg: "Peso",
  volumeLoadKg: "Volumen",
  best1RmKg: "1RM",
};

const LEFT_METRIC: Record<Metric, "leftAvgWeightKg" | "leftVolumeLoadKg" | "leftBest1RmKg"> = {
  avgWeightKg: "leftAvgWeightKg",
  volumeLoadKg: "leftVolumeLoadKg",
  best1RmKg: "leftBest1RmKg",
};
const RIGHT_METRIC: Record<Metric, "rightAvgWeightKg" | "rightVolumeLoadKg" | "rightBest1RmKg"> = {
  avgWeightKg: "rightAvgWeightKg",
  volumeLoadKg: "rightVolumeLoadKg",
  best1RmKg: "rightBest1RmKg",
};

function formatMetricValue(metric: Metric, value: number): string {
  return metric === "volumeLoadKg" ? formatKg(value, 0) : formatKg(value, 1);
}

function formatSignedRir(value: number): string {
  const rounded = Number(value.toFixed(1));
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded} RIR`;
}

// Renders ONE exercise. The <select> that used to live here is gone —
// picking an exercise is ExerciseGroupList's job now, since "I have to tap the
// dropdown to change the exercise" was the actual complaint. Everything below
// it (the metric toggle, the unilateral dual-line branch, the effort gap) was
// never the problem and is unchanged.
export function ExerciseProgressionChart({ group: selectedGroup }: { group: ExerciseSeriesGroup }) {
  const [metric, setMetric] = useState<Metric>("avgWeightKg");

  const dualPoints = selectedGroup.isUnilateral ? buildDualPoints(selectedGroup, metric) : [];
  const singlePoints = selectedGroup.isUnilateral ? [] : buildSinglePoints(selectedGroup, metric);
  const hasAnyPlottedPoint = selectedGroup.isUnilateral
    ? dualPoints.some((point) => point.left !== null || point.right !== null)
    : singlePoints.length > 0;
  // For weight/volume this is always false — every logged instance has both.
  // Only 1RM can leave real data on the page with nothing to plot: every set
  // in every instance falling outside the rep range Epley is trustworthy for
  // (ONE_RM_MAX_REPS) is a genuine gap, not the "only one instance ever"
  // case the message below already covers.
  const metricHasNoUsablePoints = selectedGroup.points.length > 0 && !hasAnyPlottedPoint;

  return (
    <div>
      <div className="flex items-center justify-end gap-2">
        <div className="flex shrink-0 gap-1 text-xs">
          {(Object.keys(METRIC_LABEL) as Metric[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMetric(option)}
              className={`min-h-11 rounded-full px-3 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
                metric === option ? "bg-emerald-300 text-zinc-950" : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {METRIC_SHORT_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      {selectedGroup.isUnilateral ? (
        <p className="mt-2 text-xs font-semibold text-violet-300">Ejercicio unilateral — izquierda y derecha por separado</p>
      ) : null}

      <div className="mt-3">
        {metricHasNoUsablePoints ? (
          <p className="text-xs leading-5 text-zinc-400">
            Ninguna serie registrada tiene {ONE_RM_MAX_REPS} repeticiones o menos, el rango donde el estimado de 1RM
            es confiable.
          </p>
        ) : selectedGroup.isUnilateral ? (
          <DualLineChart
            points={dualPoints}
            ariaLabel={`${METRIC_LABEL[metric]} de ${selectedGroup.exerciseNameEs}, izquierda vs. derecha`}
          />
        ) : (
          <LineChart points={singlePoints} ariaLabel={`${METRIC_LABEL[metric]} de ${selectedGroup.exerciseNameEs}`} />
        )}
      </div>

      {selectedGroup.points.length === 1 ? (
        <p className="mt-2 text-xs text-zinc-400">Registra otra sesión de este ejercicio para ver una tendencia.</p>
      ) : null}

      {selectedGroup.isUnilateral ? <EffortGapSection group={selectedGroup} /> : null}
    </div>
  );
}

// Weight/volume matched by design means the dual chart above can't tell
// "asymmetry closed" from "asymmetry masked by matching load" — RIR is the
// signal that reveals which one it actually is (see buildEffortGapSeries).
function EffortGapSection({ group }: { group: ExerciseSeriesGroup }) {
  const gapPoints = buildEffortGapSeries(group.points);

  return (
    <div className="mt-5 border-t border-zinc-800 pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Brecha de esfuerzo (RIR izq − der)</p>
      {gapPoints.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-400">
          Registra RIR en ambos lados en la misma sesión para ver si la brecha de esfuerzo se está cerrando.
        </p>
      ) : (
        <>
          <div className="mt-2">
            <LineChart
              points={gapPoints.map((point) => ({
                timestampMs: point.completedAt.getTime(),
                value: point.gapRir,
                dateLabel: formatShortDateEs(point.completedAt),
                valueLabel: formatSignedRir(point.gapRir),
              }))}
              ariaLabel={`Brecha de esfuerzo en RIR de ${group.exerciseNameEs}, izquierda menos derecha`}
              referenceLine={{ value: 0, label: "0 = mismo esfuerzo" }}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            Positivo: la izquierda tuvo más reserva (la derecha trabajó más cerca del fallo). Negativo: al revés. Cerca de
            0 = ambos lados igual de exigidos con la misma carga.
          </p>
        </>
      )}
    </div>
  );
}

// avgWeightKg/volumeLoadKg are always a real number for a point that made it
// into ExerciseSeriesPoint at all (buildExerciseSeries already skips
// instances with zero sets) — only best1RmKg can be null on an otherwise
// real point, so this drops just those points rather than plotting a gap.
function buildSinglePoints(group: ExerciseSeriesGroup, metric: Metric): LineChartPoint[] {
  const points: LineChartPoint[] = [];
  for (const point of group.points) {
    const value = point[metric];
    if (value === null) {
      continue;
    }
    points.push({
      timestampMs: point.completedAt.getTime(),
      value,
      dateLabel: formatShortDateEs(point.completedAt),
      valueLabel: formatMetricValue(metric, value),
    });
  }
  return points;
}

function buildDualPoints(group: ExerciseSeriesGroup, metric: Metric): DualLineChartPoint[] {
  const leftKey = LEFT_METRIC[metric];
  const rightKey = RIGHT_METRIC[metric];

  return group.points.map((point) => {
    const leftValue = point[leftKey];
    const rightValue = point[rightKey];
    return {
      timestampMs: point.completedAt.getTime(),
      dateLabel: formatShortDateEs(point.completedAt),
      left: leftValue === null ? null : { value: leftValue, valueLabel: formatMetricValue(metric, leftValue) },
      right: rightValue === null ? null : { value: rightValue, valueLabel: formatMetricValue(metric, rightValue) },
    };
  });
}
