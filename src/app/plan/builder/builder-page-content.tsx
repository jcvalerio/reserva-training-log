import Link from "next/link";

import { MIN_SESSION_EXERCISES } from "@/plans/generated-plan-schema";

import { AppShell } from "../../app-shell";
import { FormStatusBanner } from "../../form-status-banner";
import { SubmitButton } from "../../submit-button";

export type DraftSessionSummary = {
  dayIndex: number;
  nameEs: string;
  exerciseCount: number;
};

export type DraftPlanSummary = {
  id: string;
  nameEs: string;
  daysPerWeek: number;
  sessions: DraftSessionSummary[];
};

export function BuilderPageContent({
  draft,
  justSaved,
  errorType,
  createDraftPlanAction,
  updatePlanDetailsAction,
  deleteSessionAction,
  discardDraftPlanAction,
  activateDraftPlanAction,
}: {
  draft: DraftPlanSummary | null;
  justSaved: boolean;
  errorType: "validation" | "incomplete" | "activation" | null;
  createDraftPlanAction: (formData: FormData) => Promise<void>;
  updatePlanDetailsAction: (formData: FormData) => Promise<void>;
  deleteSessionAction: (formData: FormData) => Promise<void>;
  discardDraftPlanAction: (formData: FormData) => Promise<void>;
  activateDraftPlanAction: (formData: FormData) => Promise<void>;
}) {
  if (!draft) {
    return (
      <AppShell activeHref="/plan" backTo={{ href: "/plan", label: "Plan" }}>
        <header className="space-y-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Plan</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Crea tu propia rutina</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Define tus propios días de entrenamiento y ejercicios. Puedes revisar y ajustar todo antes de
              activarla.
            </p>
          </div>
        </header>

        <FormStatusBanner
          saved={false}
          error={errorType === "validation"}
          errorMessage="Escribe un nombre y elige cuántos días entrenas por semana."
        />

        <form
          action={createDraftPlanAction}
          className="mt-6 grid gap-4 rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800"
        >
          <label className="grid gap-1 text-sm font-medium text-zinc-300">
            <span>Nombre del plan</span>
            <input name="nameEs" type="text" maxLength={120} required className="input" placeholder="Mi rutina" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-300">
            <span>Días de entrenamiento por semana</span>
            <input
              name="daysPerWeek"
              type="number"
              inputMode="numeric"
              min={1}
              max={7}
              required
              defaultValue={5}
              className="input"
            />
          </label>
          <SubmitButton className="rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100">
            Crear borrador
          </SubmitButton>
        </form>
      </AppShell>
    );
  }

  const dayIndexes = Array.from({ length: draft.daysPerWeek }, (_, index) => index + 1);
  const sessionsByDayIndex = new Map(draft.sessions.map((session) => [session.dayIndex, session]));
  const isComplete = dayIndexes.every(
    (dayIndex) => (sessionsByDayIndex.get(dayIndex)?.exerciseCount ?? 0) >= MIN_SESSION_EXERCISES,
  );

  return (
    <AppShell activeHref="/plan" backTo={{ href: "/plan", label: "Plan" }}>
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Plan</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{draft.nameEs}</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Borrador, todavía no activo. Completa cada día con al menos {MIN_SESSION_EXERCISES} ejercicios antes de
            activar.
          </p>
        </div>
      </header>

      <FormStatusBanner
        saved={justSaved}
        error={errorType === "incomplete" || errorType === "activation" || errorType === "validation"}
        savedMessage="Guardado en tu borrador."
        errorMessage={
          errorType === "incomplete"
            ? `Completa todos los días con al menos ${MIN_SESSION_EXERCISES} ejercicios antes de activar.`
            : errorType === "validation"
              ? "Escribe un nombre y elige cuántos días entrenas por semana."
              : "No se pudo activar el plan. Intenta de nuevo."
        }
      />

      <details className="mt-6 rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
          Editar nombre y días del plan
        </summary>
        <form action={updatePlanDetailsAction} className="mt-3 grid gap-3">
          <input type="hidden" name="draftPlanId" value={draft.id} />
          <label className="grid gap-1 text-sm font-medium text-zinc-300">
            <span>Nombre del plan</span>
            <input name="nameEs" type="text" maxLength={120} required defaultValue={draft.nameEs} className="input" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-300">
            <span>Días de entrenamiento por semana</span>
            <input
              name="daysPerWeek"
              type="number"
              inputMode="numeric"
              min={1}
              max={7}
              required
              defaultValue={draft.daysPerWeek}
              className="input"
            />
          </label>
          <p className="text-xs leading-5 text-zinc-400">
            Si reduces los días, las sesiones ya creadas fuera de ese rango no se eliminan, pero quedan ocultas hasta
            que vuelvas a subir el número.
          </p>
          <SubmitButton className="rounded-2xl bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-emerald-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
            Guardar cambios
          </SubmitButton>
        </form>
      </details>

      <form action={discardDraftPlanAction} className="mt-3">
        <input type="hidden" name="draftPlanId" value={draft.id} />
        <SubmitButton className="min-h-11 rounded-2xl px-2 text-sm font-semibold text-amber-200 underline decoration-amber-200/40 underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
          Descartar borrador
        </SubmitButton>
      </form>

      <section className="mt-6 grid gap-2 pb-6">
        {dayIndexes.map((dayIndex) => {
          const session = sessionsByDayIndex.get(dayIndex);

          return (
            <article
              key={dayIndex}
              className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Día {dayIndex}</p>
                {session ? (
                  <>
                    <p className="truncate font-semibold text-zinc-100">{session.nameEs}</p>
                    <p
                      className={`text-xs ${session.exerciseCount < MIN_SESSION_EXERCISES ? "text-amber-200" : "text-zinc-400"}`}
                    >
                      {session.exerciseCount} {session.exerciseCount === 1 ? "ejercicio" : "ejercicios"}
                      {session.exerciseCount < MIN_SESSION_EXERCISES ? ` (mínimo ${MIN_SESSION_EXERCISES})` : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-amber-200">Sin definir</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/plan/builder/session/${dayIndex}`}
                  className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-emerald-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  {session ? "Editar" : "+ Agregar"}
                </Link>
                {session ? (
                  <form action={deleteSessionAction}>
                    <input type="hidden" name="draftPlanId" value={draft.id} />
                    <input type="hidden" name="dayIndex" value={dayIndex} />
                    <SubmitButton className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-amber-200 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
                      Eliminar
                    </SubmitButton>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      {isComplete ? (
        <form action={activateDraftPlanAction} className="pb-10">
          <input type="hidden" name="draftPlanId" value={draft.id} />
          <SubmitButton className="w-full rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100">
            Activar este plan
          </SubmitButton>
        </form>
      ) : (
        <p className="pb-10 text-sm leading-6 text-zinc-400">
          Completa cada día con al menos {MIN_SESSION_EXERCISES} ejercicios para poder activar este plan.
        </p>
      )}
    </AppShell>
  );
}
