import Link from "next/link";

import type { EntrenarSessionItem } from "@/workouts/session-progress";

import { AppShell } from "../app-shell";
import { FormStatusBanner } from "../form-status-banner";
import { SubmitButton } from "../submit-button";

export function EntrenarPageContent({
  hasActivePlan,
  sessions,
  justCompleted,
  startOrResumeSessionAction,
}: {
  hasActivePlan: boolean;
  sessions: EntrenarSessionItem[];
  justCompleted: boolean;
  startOrResumeSessionAction: (formData: FormData) => Promise<void>;
}) {
  if (!hasActivePlan) {
    return (
      <AppShell activeHref="/entrenar" backTo={null}>
        <header className="space-y-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Entrenar</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Todavía no hay plan activo</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Activa tu plan en la sección Plan antes de registrar entrenamientos.
            </p>
          </div>
        </header>

        <Link
          href="/plan"
          className="mt-7 block rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100"
        >
          Ir a Plan
        </Link>
      </AppShell>
    );
  }

  const suggested = sessions.find((session) => session.isSuggested);

  return (
    <AppShell activeHref="/entrenar" backTo={null}>
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Entrenar</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tus sesiones</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Elige la sesión sugerida o cualquier otra de tu plan activo.
          </p>
        </div>
      </header>

      <FormStatusBanner
        saved={justCompleted}
        error={false}
        savedMessage="Sesión completada. Buen trabajo registrando cada serie."
      />

      {suggested ? (
        <section className="mt-7 rounded-3xl bg-zinc-900 p-4 ring-1 ring-emerald-300/30" aria-labelledby="suggested-session-title">
          <p id="suggested-session-title" className="text-sm font-semibold text-emerald-200">
            Sugerido para hoy
          </p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-100">Día {suggested.dayIndex}</h2>
          <p className="mt-1 font-semibold text-zinc-100">{suggested.nameEs}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{suggested.focus}</p>
          <p className="mt-1 text-xs text-zinc-400">{suggested.exerciseCount} ejercicios</p>
          <SessionAction session={suggested} action={startOrResumeSessionAction} emphasize />
        </section>
      ) : null}

      <section className="mt-6 grid gap-2 pb-10">
        {sessions.map((session) => (
          <article
            key={session.templateId}
            className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Día {session.dayIndex}
              </p>
              <p className="truncate font-semibold text-zinc-100">{session.nameEs}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusPillClass(session.status)}`}>
                  {statusLabelEs(session.status)}
                </span>
                <span className="text-xs text-zinc-400">{session.exerciseCount} ejercicios</span>
              </div>
            </div>
            <SessionAction session={session} action={startOrResumeSessionAction} />
          </article>
        ))}
      </section>
    </AppShell>
  );
}

function SessionAction({
  session,
  action,
  emphasize = false,
}: {
  session: EntrenarSessionItem;
  action: (formData: FormData) => Promise<void>;
  emphasize?: boolean;
}) {
  const linkClassName = emphasize
    ? "mt-4 block rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100"
    : "shrink-0 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-emerald-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300";

  if (session.status === "completed") {
    return (
      <div className={emphasize ? "mt-4 grid gap-2" : "flex shrink-0 flex-col items-end gap-2"}>
        <form action={action}>
          <input type="hidden" name="planSessionTemplateId" value={session.templateId} />
          <SubmitButton className={linkClassName}>Empezar de nuevo</SubmitButton>
        </form>
        <Link
          href={`/entrenar/${session.sessionId}`}
          className="text-center text-xs font-semibold text-zinc-400 underline-offset-2 hover:underline"
        >
          Ver resumen
        </Link>
      </div>
    );
  }

  if (session.status === "in_progress") {
    return (
      <Link href={`/entrenar/${session.sessionId}`} className={linkClassName}>
        Continuar
      </Link>
    );
  }

  return (
    <form action={action} className={emphasize ? "mt-4" : "shrink-0"}>
      <input type="hidden" name="planSessionTemplateId" value={session.templateId} />
      <SubmitButton
        className={
          emphasize
            ? "block w-full rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100"
            : "rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-emerald-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        }
      >
        Empezar
      </SubmitButton>
    </form>
  );
}

function statusLabelEs(status: EntrenarSessionItem["status"]) {
  return { not_started: "No iniciada", in_progress: "En progreso", completed: "Completada" }[status];
}

function statusPillClass(status: EntrenarSessionItem["status"]) {
  return {
    not_started: "bg-zinc-800 text-zinc-400",
    in_progress: "bg-sky-300/10 text-sky-200",
    completed: "bg-emerald-300/10 text-emerald-300",
  }[status];
}
