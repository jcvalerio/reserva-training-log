"use client";

import { useState } from "react";

import { formatKg, formatShortDateEs } from "@/lib/format";
import { buildEffortGapSeries, type ExerciseSeriesGroup } from "@/workouts/exercise-series";

import { DualLineChart, type DualLineChartPoint } from "./dual-line-chart";
import { LineChart, type LineChartPoint } from "./line-chart";

type Metric = "avgWeightKg" | "volumeLoadKg";

const METRIC_LABEL: Record<Metric, string> = {
  avgWeightKg: "Peso promedio",
  volumeLoadKg: "Volumen",
};

const LEFT_METRIC: Record<Metric, "leftAvgWeightKg" | "leftVolumeLoadKg"> = {
  avgWeightKg: "leftAvgWeightKg",
  volumeLoadKg: "leftVolumeLoadKg",
};
const RIGHT_METRIC: Record<Metric, "rightAvgWeightKg" | "rightVolumeLoadKg"> = {
  avgWeightKg: "rightAvgWeightKg",
  volumeLoadKg: "rightVolumeLoadKg",
};

function formatMetricValue(metric: Metric, value: number): string {
  return metric === "avgWeightKg" ? formatKg(value, 1) : formatKg(value, 0);
}

function formatSignedRir(value: number): string {
  const rounded = Number(value.toFixed(1));
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded} RIR`;
}

export function ExerciseProgressionChart({
  groups,
  defaultExerciseName,
}: {
  groups: ExerciseSeriesGroup[];
  defaultExerciseName: string;
}) {
  const [selectedName, setSelectedName] = useState(defaultExerciseName);
  const [metric, setMetric] = useState<Metric>("avgWeightKg");

  const selectedGroup = groups.find((group) => group.exerciseNameEs === selectedName) ?? groups[0];
  if (!selectedGroup) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <select
          value={selectedGroup.exerciseNameEs}
          onChange={(event) => setSelectedName(event.target.value)}
          className="min-w-0 flex-1 rounded-xl bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          {groups.map((group) => (
            <option key={group.exerciseNameEs} value={group.exerciseNameEs}>
              {group.exerciseNameEs}
            </option>
          ))}
        </select>
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
              {option === "avgWeightKg" ? "Peso" : "Volumen"}
            </button>
          ))}
        </div>
      </div>

      {selectedGroup.isUnilateral ? (
        <p className="mt-2 text-xs font-semibold text-violet-300">Ejercicio unilateral — izquierda y derecha por separado</p>
      ) : null}

      <div className="mt-3">
        {selectedGroup.isUnilateral ? (
          <DualLineChart
            points={buildDualPoints(selectedGroup, metric)}
            ariaLabel={`${METRIC_LABEL[metric]} de ${selectedGroup.exerciseNameEs}, izquierda vs. derecha`}
          />
        ) : (
          <LineChart points={buildSinglePoints(selectedGroup, metric)} ariaLabel={`${METRIC_LABEL[metric]} de ${selectedGroup.exerciseNameEs}`} />
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

function buildSinglePoints(group: ExerciseSeriesGroup, metric: Metric): LineChartPoint[] {
  return group.points.map((point) => ({
    timestampMs: point.completedAt.getTime(),
    value: point[metric],
    dateLabel: formatShortDateEs(point.completedAt),
    valueLabel: formatMetricValue(metric, point[metric]),
  }));
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
