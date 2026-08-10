import Link from "next/link";

import { formatKg, formatShortDateEs } from "@/lib/format";
import type { MeasurementSeriesPoint } from "@/measurements/measurement-series";
import type { BodyMeasurementTrend } from "@/measurements/measurement-trend";
import { buildConsistencyBars, type ConsistencySummary } from "@/workouts/consistency";
import type { ExerciseSeriesGroup } from "@/workouts/exercise-series";
import type { ExerciseImprovementRow, ImprovementSignal } from "@/workouts/improvement";
import { jointLoadLabelsEs } from "@/training/muscle-taxonomy";
import type { MuscleVolumeSummary } from "@/workouts/muscle-volume";
import { averageRecentTrainingLoad, computeSessionTrainingLoad } from "@/workouts/session-load";
import type { CompletedSessionSummary } from "@/workouts/workout-repository";

import { AppShell } from "../app-shell";
import { BarChart } from "./bar-chart";
import { BodyMap } from "./body-map";
import { ExerciseGroupList } from "./exercise-group-list";
import { MeasurementSeriesChart } from "./measurement-series-chart";
import { MuscleVolumeChart } from "./muscle-volume-chart";

export function ProgresoPageContent({
  hasProfile,
  improvements,
  completedSessions,
  bodyMeasurementTrend,
  measurementSeries,
  exerciseSeriesGroups,
  defaultExerciseName,
  consistencySummary,
  muscleVolumeSummary,
}: {
  hasProfile: boolean;
  improvements: ExerciseImprovementRow[];
  completedSessions: CompletedSessionSummary[];
  bodyMeasurementTrend: BodyMeasurementTrend | null;
  measurementSeries: MeasurementSeriesPoint[];
  exerciseSeriesGroups: ExerciseSeriesGroup[];
  defaultExerciseName: string | null;
  consistencySummary: ConsistencySummary | null;
  muscleVolumeSummary: MuscleVolumeSummary | null;
}) {
  if (!hasProfile || completedSessions.length === 0) {
    return (
      <AppShell activeHref="/progreso" backTo={null}>
        <header className="space-y-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Progreso</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Todavía no hay historial</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Completa al menos una sesión en Entrenar para empezar a ver tu progreso aquí.
            </p>
          </div>
        </header>

        <Link
          href="/entrenar"
          className="mt-7 block rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100"
        >
          Ir a Entrenar
        </Link>
      </AppShell>
    );
  }

  const recentAverageLoad = averageRecentTrainingLoad(completedSessions);
  const improvedExerciseCount = improvements.filter((row) => row.improvement.improved).length;

  return (
    <AppShell activeHref="/progreso" backTo={null}>
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Progreso</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tu historial</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Tendencias, comparaciones por ejercicio y tu historial de entrenamientos completados.
          </p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-3 gap-2" aria-label="Resumen">
        <KpiTile
          label="Esta semana"
          value={consistencySummary ? `${consistencySummary.currentWeekDaysTrained}/${consistencySummary.targetDaysPerWeek}` : "—"}
          sublabel="días"
        />
        <KpiTile
          label="Mejorando"
          value={improvements.length > 0 ? `${improvedExerciseCount}/${improvements.length}` : "—"}
          sublabel="ejercicios"
        />
        <KpiTile label="Carga" value={recentAverageLoad !== null ? `${recentAverageLoad}` : "—"} sublabel="UA reciente" />
      </section>

      {muscleVolumeSummary ? (
        <section className="mt-7 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800" aria-labelledby="muscle-volume-title">
          <p id="muscle-volume-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Series por grupo muscular
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">Semana en curso</p>
          <div className="mt-3">
            <BodyMap week={muscleVolumeSummary.currentWeek} />
          </div>
          <div className="mt-3 border-t border-zinc-800 pt-3">
            <MuscleVolumeChart
              week={muscleVolumeSummary.currentWeek}
              previousWeek={muscleVolumeSummary.previousWeek}
            />
          </div>

          {muscleVolumeSummary.pushPullRatio !== null || muscleVolumeSummary.quadHamstringRatio !== null ? (
            <div className="mt-3 border-t border-zinc-800 pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Equilibrio</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {muscleVolumeSummary.pushPullRatio !== null
                  ? `Empuje : Tirón — ${formatRatio(muscleVolumeSummary.pushPullRatio)}`
                  : null}
                {muscleVolumeSummary.pushPullRatio !== null && muscleVolumeSummary.quadHamstringRatio !== null
                  ? " · "
                  : null}
                {muscleVolumeSummary.quadHamstringRatio !== null
                  ? `Cuádriceps : Femorales — ${formatRatio(muscleVolumeSummary.quadHamstringRatio)}`
                  : null}
              </p>
            </div>
          ) : null}

          {muscleVolumeSummary.painByJoint.length > 0 ? (
            <div className="mt-3 border-t border-zinc-800 pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Articulaciones cargadas cuando reportaste dolor
              </p>
              {/* Deliberately not titled "dolor de hombro": setLog records a
                  pain score but no location, so this attributes a set's pain to
                  every joint its exercise loads. That is an inference, and the
                  wording has to say so. */}
              <ul className="mt-2 grid gap-1">
                {muscleVolumeSummary.painByJoint.map((row) => (
                  <li key={row.jointLoad} className="text-sm leading-6 text-zinc-300">
                    {jointLoadLabelsEs[row.jointLoad]} — dolor máx. {row.maxPainScore}
                    {row.setsAboveThreshold > 0 ? (
                      <span className="text-zinc-400">
                        {" "}
                        · {row.setsAboveThreshold} {row.setsAboveThreshold === 1 ? "serie" : "series"} sobre 2 (
                        {row.exerciseNamesEs.join(", ")})
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Es el dolor que registraste en ejercicios que cargan esa articulación, no un diagnóstico. Con dolor
                sobre 2 no conviene progresar; sobre 3, reduce o modifica el ejercicio.
              </p>
            </div>
          ) : null}

          <Link
            href="/guia?open=volumen"
            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Cómo se cuentan estas series
          </Link>

          {muscleVolumeSummary.unclassifiedExerciseNames.length > 0 ? (
            <details className="mt-3 border-t border-zinc-800 pt-3">
              <summary className="min-h-11 text-sm leading-6 text-zinc-300">
                Sin clasificar ({muscleVolumeSummary.unclassifiedExerciseNames.length})
              </summary>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                Estas series no se cuentan en ningún grupo muscular. Asigna su grupo al editar el plan.
              </p>
              <ul className="mt-2 grid gap-1">
                {muscleVolumeSummary.unclassifiedExerciseNames.map((name) => (
                  <li key={name} className="text-sm leading-6 text-zinc-300">
                    {name}
                  </li>
                ))}
              </ul>
              <Link
                href="/plan/builder"
                className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Editar plan
              </Link>
            </details>
          ) : null}
        </section>
      ) : null}

      {exerciseSeriesGroups.length > 0 ? (
        <section className="mt-7 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800" aria-labelledby="progression-title">
          <p id="progression-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Ejercicios por grupo muscular
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">Toca un ejercicio para ver su progresión.</p>
          <div className="mt-3">
            <ExerciseGroupList groups={exerciseSeriesGroups} defaultExerciseName={defaultExerciseName} />
          </div>
        </section>
      ) : null}

      <section className="mt-7" aria-labelledby="improvements-title">
        <p id="improvements-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Mejoras recientes
        </p>
        {improvements.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Registra el mismo ejercicio en dos sesiones completadas para ver comparaciones aquí.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {improvements.map((row) => (
              <ImprovementCard key={row.exerciseNameEs} row={row} />
            ))}
          </div>
        )}
      </section>

      {consistencySummary ? (
        <section className="mt-7 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800" aria-labelledby="consistency-title">
          <p id="consistency-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Consistencia semanal
          </p>
          <div className="mt-3">
            <BarChart
              bars={buildConsistencyBars(consistencySummary)}
              targetValue={consistencySummary.targetDaysPerWeek}
              targetLabel={`${consistencySummary.targetDaysPerWeek} días/semana`}
              ariaLabel="Días entrenados por semana"
            />
          </div>
        </section>
      ) : null}

      {bodyMeasurementTrend ? (
        <BodyMeasurementTrendCard trend={bodyMeasurementTrend} measurementSeries={measurementSeries} />
      ) : null}

      <section className="mt-6 grid gap-3 pb-10" aria-labelledby="history-title">
        <p id="history-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Historial de sesiones
        </p>
        <div className="grid gap-2">
          {completedSessions.map(({ session, template }) => (
            <Link
              key={session.id}
              href={`/entrenar/${session.id}`}
              className="block rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Día {template.dayIndex} · {formatDate(session.completedAt)}
                {formatSessionDuration(session.startedAt, session.completedAt)}
                {formatTrainingLoad(computeSessionTrainingLoad(session))}
              </p>
              <p className="mt-1 font-semibold text-zinc-100">{template.nameEs}</p>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function KpiTile({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800">
      <p className="text-[0.65rem] font-semibold tracking-wide text-zinc-400 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-400">{sublabel}</p>
    </div>
  );
}

function BodyMeasurementTrendCard({
  trend,
  measurementSeries,
}: {
  trend: BodyMeasurementTrend;
  measurementSeries: MeasurementSeriesPoint[];
}) {
  return (
    <section className="mt-7 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800" aria-labelledby="body-trend-title">
      <div className="flex items-center justify-between gap-3">
        <p id="body-trend-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Tendencia corporal
        </p>
        <Link href="/mediciones" className="inline-flex min-h-11 items-center text-xs font-semibold text-emerald-300">
          Ver mediciones
        </Link>
      </div>

      {trend.measurementCount === 1 ? (
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          1 medición registrada el {formatDate(trend.latestMeasuredAt)}. Guarda otra para ver una tendencia.
        </p>
      ) : (
        <>
          <div className="mt-3">
            <MeasurementSeriesChart points={measurementSeries} />
          </div>
          <div className="mt-3 grid gap-1 text-sm leading-6 text-zinc-300">
            {trend.bodyWeightKg ? (
              <p>
                Peso: {trend.bodyWeightKg.firstValue.toFixed(1)}kg → {trend.bodyWeightKg.latestValue.toFixed(1)}kg (
                {formatSignedDelta(trend.bodyWeightKg.deltaValue)}kg)
              </p>
            ) : null}
            {trend.waistCm ? (
              <p>
                Cintura: {trend.waistCm.firstValue.toFixed(1)}cm → {trend.waistCm.latestValue.toFixed(1)}cm (
                {formatSignedDelta(trend.waistCm.deltaValue)}cm)
              </p>
            ) : null}
            {trend.chestCm ? (
              <p>
                Pecho: {trend.chestCm.firstValue.toFixed(1)}cm → {trend.chestCm.latestValue.toFixed(1)}cm (
                {formatSignedDelta(trend.chestCm.deltaValue)}cm)
              </p>
            ) : null}
            {trend.hipsCm ? (
              <p>
                Caderas: {trend.hipsCm.firstValue.toFixed(1)}cm → {trend.hipsCm.latestValue.toFixed(1)}cm (
                {formatSignedDelta(trend.hipsCm.deltaValue)}cm)
              </p>
            ) : null}
            {trend.latestThighGapCm !== null || trend.latestCalfGapCm !== null ? (
              <p className="text-xs text-zinc-400">
                Última asimetría — Muslo: {formatGap(trend.latestThighGapCm)}
                {trend.thighGapImproved ? " (mejoró vs. la anterior)" : ""} · Pantorrilla:{" "}
                {formatGap(trend.latestCalfGapCm)}
                {trend.calfGapImproved ? " (mejoró vs. la anterior)" : ""}
              </p>
            ) : null}
            <p className="text-xs text-zinc-400">
              {trend.measurementCount} mediciones desde {formatDate(trend.firstMeasuredAt)}
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function formatSignedDelta(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

function formatGap(value: number | null) {
  if (value === null) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}cm`;
}

function ImprovementCard({ row }: { row: ExerciseImprovementRow }) {
  const { improvement } = row;

  return (
    <article className="rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <h3 className="min-w-0 truncate font-semibold text-zinc-100">{row.exerciseNameEs}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
            improvement.improved ? "bg-emerald-300/10 text-emerald-300" : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {improvement.improved ? "Mejora ≥5%" : "Sin cambio de 5%"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        Volumen: {formatKg(improvement.previousVolumeLoadKg, 0)} → {formatKg(improvement.latestVolumeLoadKg, 0)}{" "}
        · Dolor máx: {improvement.previousMaxPain} → {improvement.latestMaxPain}
      </p>
      <p className="mt-1 text-xs leading-5 text-zinc-400">
        Peso prom: {formatKg(improvement.previousAvgWeightKg, 1)} → {formatKg(improvement.latestAvgWeightKg, 1)} · Reps
        prom: {improvement.previousAvgReps.toFixed(1)} → {improvement.latestAvgReps.toFixed(1)}
      </p>
      {improvement.latestEstimated1RmKg !== null && improvement.previousEstimated1RmKg !== null ? (
        <p className="mt-1 text-xs leading-5 text-zinc-400">
          1RM estimado: {formatKg(improvement.previousEstimated1RmKg, 1)} → {formatKg(improvement.latestEstimated1RmKg, 1)}
        </p>
      ) : null}
      {improvement.latestAsymmetryGapKg !== null && improvement.previousAsymmetryGapKg !== null ? (
        <p className="mt-1 text-xs leading-5 text-zinc-400">
          Asimetría izq/der: {formatKg(improvement.previousAsymmetryGapKg, 1)} →{" "}
          {formatKg(improvement.latestAsymmetryGapKg, 1)}
        </p>
      ) : null}
      {improvement.signals.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {improvement.signals.map((signal) => (
            <span
              key={signal}
              className="rounded-full bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-300"
            >
              {signalLabelEs(signal)}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function signalLabelEs(signal: ImprovementSignal) {
  return {
    volume_load: "Volumen +5%",
    pain: "Dolor -2",
    reps_at_load: "Reps +5% (mismo peso)",
    load_at_reps: "Peso +5% (mismas reps)",
    estimated_1rm: "1RM estimado +5%",
    asymmetry_performance: "Asimetría -5%",
  }[signal];
}

/**
 * Renders a ratio the way a coach says it, with the smaller side normalised to 1.
 *
 * `value` is always left÷right for the label it accompanies — e.g.
 * quadHamstringRatio is cuádriceps÷femorales, so 4 and 6 give 0.667 and must
 * read "1 : 1.5" (there is MORE femoral work), not "1.5 : 1".
 *
 * Both branches were inverted when this shipped, which made the real dashboard
 * claim the opposite of the data. Exported solely so the test can pin it.
 */
export function formatRatio(value: number): string {
  return value >= 1 ? `${value.toFixed(1)} : 1` : `1 : ${(1 / value).toFixed(1)}`;
}

function formatDate(date: Date | null) {
  if (!date) {
    return "";
  }
  return formatShortDateEs(date);
}

function formatSessionDuration(startedAt: Date | null, completedAt: Date | null) {
  if (!startedAt || !completedAt) {
    return "";
  }
  const minutes = Math.round((completedAt.getTime() - startedAt.getTime()) / 60000);
  if (minutes <= 0) {
    return "";
  }
  return ` · ${minutes} min`;
}

function formatTrainingLoad(trainingLoad: number | null) {
  if (trainingLoad === null) {
    return "";
  }
  return ` · ${trainingLoad} UA`;
}
