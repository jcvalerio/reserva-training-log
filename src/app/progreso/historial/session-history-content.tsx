"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";

import { computeSessionTrainingLoad } from "@/workouts/session-load";
import type { CompletedSessionSummary } from "@/workouts/workout-repository";

import { AppShell } from "../../app-shell";

const PAGE_SIZE = 12;
const historyDate = new Intl.DateTimeFormat("es-CR", {
  day: "2-digit", month: "short", year: "numeric", timeZone: "America/Costa_Rica",
});

export function SessionHistoryContent({ sessions }: { sessions: CompletedSessionSummary[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  return (
    <AppShell activeHref="/progreso" backTo={{ href: "/progreso", label: "Progreso" }}>
      <h1 className="text-2xl font-semibold">Historial de sesiones</h1>
      <p className="mt-2 text-sm text-zinc-400">{sessions.length} {sessions.length === 1 ? "sesión completada" : "sesiones completadas"}</p>

      {sessions.length === 0 ? (
        <Link href="/entrenar" className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-emerald-300">
          Ir a Entrenar <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-800 border-y border-zinc-800">
          {sessions.slice(0, visibleCount).map(({ session, template }) => {
            const duration = session.startedAt && session.completedAt
              ? Math.max(0, Math.round((session.completedAt.getTime() - session.startedAt.getTime()) / 60000))
              : null;
            const load = computeSessionTrainingLoad(session);
            return (
              <li key={session.id}>
                <Link href={`/entrenar/${session.id}`} className="flex min-h-11 items-center gap-3 py-4 focus-visible:outline-2 focus-visible:outline-emerald-300">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-400">{session.completedAt ? historyDate.format(session.completedAt) : "Sin fecha"} · Día {template.dayIndex}</p>
                    <p className="mt-1 break-words font-semibold">{template.nameEs}</p>
                    {duration !== null || load !== null ? (
                      <p className="mt-1 text-xs text-zinc-400">{[duration !== null ? `${duration} min` : null, load !== null ? `${load} UA` : null].filter(Boolean).join(" · ")}</p>
                    ) : null}
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {visibleCount < sessions.length ? (
        <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-emerald-300 focus-visible:outline-2 focus-visible:outline-emerald-300">
          <ChevronDown className="h-5 w-5" aria-hidden="true" />
          Ver más sesiones
        </button>
      ) : null}
    </AppShell>
  );
}
