"use client";

import Link from "next/link";
import { useState } from "react";

import type { PlanPreviewSummary } from "@/plans/plan-preview";

import { AppShell } from "../../app-shell";
import { PlanExerciseCard } from "../plan-page-content";

export function PlanDetailContent({ summary }: { summary: PlanPreviewSummary }) {
  const sessions = summary.sessions;
  const [dayIndex, setDayIndex] = useState(0);
  const session = sessions[dayIndex]!;

  return (
    <AppShell activeHref="/plan">
      <header className="space-y-3">
        <Link
          href="/plan"
          className="text-sm font-semibold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          ← Volver a Tu plan
        </Link>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Plan</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{summary.nameEs}</h1>
        </div>
      </header>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Días del plan">
        {sessions.map((item, index) => (
          <button
            key={item.dayIndex}
            type="button"
            role="tab"
            aria-selected={index === dayIndex}
            onClick={() => setDayIndex(index)}
            className={`min-h-11 shrink-0 rounded-2xl px-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
              index === dayIndex
                ? "bg-emerald-300 text-zinc-950"
                : "bg-zinc-900 text-zinc-300 ring-1 ring-zinc-800"
            }`}
          >
            Día {item.dayIndex}
          </button>
        ))}
      </div>

      <section className="mt-4 rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Día {session.dayIndex}</p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-100">{session.nameEs}</h2>
        <p className="mt-1 text-sm leading-5 text-zinc-400">{session.focus}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-zinc-950 px-2 py-1 text-zinc-300 ring-1 ring-zinc-800">
            {session.exerciseCount} ejercicios
          </span>
          {session.unilateralExerciseCount > 0 ? (
            <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-emerald-300">unilateral</span>
          ) : null}
          {session.painSensitiveExerciseCount > 0 ? (
            <span className="rounded-full bg-amber-300/10 px-2 py-1 text-amber-200">dolor vigilado</span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3">
          {session.exercises.map((exercise) => (
            <PlanExerciseCard key={exercise.orderIndex} exercise={exercise} />
          ))}
        </div>

        {session.mobilityNotesEs ? (
          <p className="mt-3 text-xs leading-5 text-zinc-500">{session.mobilityNotesEs}</p>
        ) : null}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3 pb-10">
        <button
          type="button"
          onClick={() => setDayIndex((index) => Math.max(index - 1, 0))}
          disabled={dayIndex === 0}
          className="min-h-12 rounded-2xl bg-zinc-900 text-sm font-semibold text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => setDayIndex((index) => Math.min(index + 1, sessions.length - 1))}
          disabled={dayIndex === sessions.length - 1}
          className="min-h-12 rounded-2xl bg-emerald-300 text-sm font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100 disabled:opacity-40"
        >
          Siguiente día
        </button>
      </div>
    </AppShell>
  );
}
