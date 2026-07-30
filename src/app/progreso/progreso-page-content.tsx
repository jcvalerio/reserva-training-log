import Link from "next/link";

import type { ExerciseImprovementRow, ImprovementSignal } from "@/workouts/improvement";
import type { CompletedSessionSummary } from "@/workouts/workout-repository";

import { AppShell } from "../app-shell";

export function ProgresoPageContent({
  hasProfile,
  improvements,
  completedSessions,
}: {
  hasProfile: boolean;
  improvements: ExerciseImprovementRow[];
  completedSessions: CompletedSessionSummary[];
}) {
  if (!hasProfile || completedSessions.length === 0) {
    return (
      <AppShell activeHref="/progreso">
        <header className="space-y-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Progreso</p>
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

  return (
    <AppShell activeHref="/progreso">
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Progreso</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tu historial</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Comparaciones de volumen y dolor entre tus dos sesiones más recientes por ejercicio, más tu historial de
            entrenamientos completados.
          </p>
        </div>
      </header>

      <section className="mt-7" aria-labelledby="improvements-title">
        <p id="improvements-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">
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

      <section className="mt-6 grid gap-3 pb-10" aria-labelledby="history-title">
        <p id="history-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Historial de sesiones
        </p>
        <div className="grid gap-2">
          {completedSessions.map(({ session, template }) => (
            <Link
              key={session.id}
              href={`/entrenar/${session.id}`}
              className="block rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Semana {template.weekNumber} · Día {template.dayIndex} · {formatDate(session.completedAt)}
              </p>
              <p className="mt-1 font-semibold text-zinc-100">{template.nameEs}</p>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
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
        Volumen: {improvement.previousVolumeLoadKg.toFixed(0)}kg → {improvement.latestVolumeLoadKg.toFixed(0)}kg
        · Dolor máx: {improvement.previousMaxPain} → {improvement.latestMaxPain}
      </p>
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
  }[signal];
}

function formatDate(date: Date | null) {
  if (!date) {
    return "";
  }
  return new Intl.DateTimeFormat("es-CR", { day: "2-digit", month: "short" }).format(date);
}
