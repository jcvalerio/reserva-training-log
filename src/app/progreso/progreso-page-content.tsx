import { ArrowRight, History, Ruler } from "lucide-react";
import Link from "next/link";

import { buildConsistencyBars, type ConsistencySummary } from "@/workouts/consistency";
import type { ExerciseSeriesGroup } from "@/workouts/exercise-series";
import type { ExerciseImprovementRow } from "@/workouts/improvement";
import type { MuscleVolumeSummary } from "@/workouts/muscle-volume";
import { averageRecentTrainingLoad } from "@/workouts/session-load";
import type { CompletedSessionSummary } from "@/workouts/workout-repository";

import { AppShell } from "../app-shell";
import { BarChart } from "./bar-chart";
import { MuscleVolumeSection } from "./muscle-volume-section";

export function ProgresoPageContent({
  hasProfile, improvements, completedSessions, exerciseSeriesGroups, consistencySummary, muscleVolumeSummary,
}: {
  hasProfile: boolean;
  improvements: ExerciseImprovementRow[];
  completedSessions: CompletedSessionSummary[];
  exerciseSeriesGroups: ExerciseSeriesGroup[];
  consistencySummary: ConsistencySummary | null;
  muscleVolumeSummary: MuscleVolumeSummary | null;
}) {
  if (!hasProfile || completedSessions.length === 0) {
    return (
      <AppShell activeHref="/progreso" backTo={null}>
        <h1 className="text-3xl font-semibold">Todavía no hay historial</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Completa al menos una sesión en Entrenar para empezar a ver tu progreso aquí.
        </p>
        <Link href="/entrenar" className="mt-7 rounded-lg bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 focus-visible:outline-2 focus-visible:outline-emerald-100">
          Ir a Entrenar
        </Link>
      </AppShell>
    );
  }

  const recentAverageLoad = averageRecentTrainingLoad(completedSessions);
  const improvedExerciseCount = improvements.filter((row) => row.improvement.improved).length;

  return (
    <AppShell activeHref="/progreso" backTo={null}>
      <header>
        <h1 className="text-3xl font-semibold">Progreso</h1>
        <Link href="/progreso/historial" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-300 focus-visible:outline-2 focus-visible:outline-emerald-300">
          <History className="h-5 w-5 shrink-0" aria-hidden="true" />
          Historial de sesiones
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
      </header>

      <section className="mt-5 grid grid-cols-3 gap-2" aria-label="Resumen">
        <KpiTile label="Esta semana" value={consistencySummary ? `${consistencySummary.currentWeekDaysTrained}/${consistencySummary.targetDaysPerWeek}` : "—"} sublabel="días" />
        <KpiTile label="Mejorando" value={improvements.length > 0 ? `${improvedExerciseCount}/${improvements.length}` : "—"} sublabel="ejercicios" />
        <KpiTile label="Carga" value={recentAverageLoad !== null ? `${recentAverageLoad}` : "—"} sublabel="UA reciente" />
      </section>

      {muscleVolumeSummary ? (
        <section className="mt-7 border-t border-zinc-800 pt-5" aria-labelledby="muscle-volume-title">
          <h2 id="muscle-volume-title" className="text-lg font-semibold">Series por grupo muscular</h2>
          <div className="mt-3">
            <MuscleVolumeSection summary={muscleVolumeSummary} exerciseGroups={exerciseSeriesGroups} />
          </div>
          <Link href="/guia?open=volumen" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-300 focus-visible:outline-2 focus-visible:outline-emerald-300">
            Cómo se cuentan estas series
          </Link>
        </section>
      ) : null}

      {consistencySummary ? (
        <section className="mt-7 border-t border-zinc-800 pt-5" aria-labelledby="consistency-title">
          <h2 id="consistency-title" className="text-lg font-semibold">Consistencia semanal</h2>
          <div className="mt-3">
            <BarChart bars={buildConsistencyBars(consistencySummary)} targetValue={consistencySummary.targetDaysPerWeek} targetLabel={`${consistencySummary.targetDaysPerWeek} días/semana`} ariaLabel="Días entrenados por semana" />
          </div>
        </section>
      ) : null}

      <Link href="/mediciones" className="mt-6 inline-flex min-h-11 items-center gap-2 self-start text-sm text-zinc-300 focus-visible:outline-2 focus-visible:outline-emerald-300">
        <Ruler className="h-5 w-5" aria-hidden="true" />
        Mediciones y pruebas
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </AppShell>
  );
}

function KpiTile({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-zinc-900 px-2 py-3">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-1 break-words text-2xl font-semibold tabular-nums text-zinc-100">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-400">{sublabel}</p>
    </div>
  );
}
