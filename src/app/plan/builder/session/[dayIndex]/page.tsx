import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getDraftPlanForProfile } from "@/plans/plan-builder-repository";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { AppShell } from "../../../../app-shell";
import { FormStatusBanner } from "../../../../form-status-banner";
import { saveSessionAction } from "../../actions";
import { SessionEditorForm, type SessionEditorInitialExercise } from "./session-editor-form";

type SessionEditorPageProps = {
  params: Promise<{ dayIndex: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function SessionEditorPage({ params, searchParams }: SessionEditorPageProps) {
  const { dayIndex: dayIndexParam } = await params;
  const search = searchParams ? await searchParams : {};
  const dayIndex = Number(dayIndexParam);

  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const draft = await getDraftPlanForProfile(profile.id);

  if (!draft || !Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > draft.plan.daysPerWeek) {
    redirect("/plan/builder");
  }

  const existingSession = draft.sessions.find((session) => session.template.dayIndex === dayIndex);
  const initialExercises: SessionEditorInitialExercise[] = (existingSession?.exercises ?? []).map((exercise) => ({
    exerciseNameEs: exercise.exerciseNameEs,
    phase: exercise.phase,
    isUnilateral: exercise.isUnilateral,
    targetSets: exercise.targetSets,
    targetRepMin: exercise.targetRepMin,
    targetRepMax: exercise.targetRepMax,
    targetRir: exercise.targetRir,
    restSeconds: exercise.restSeconds,
    notesEs: exercise.notesEs,
    painSensitive: exercise.painSensitive,
    substitutionOptionsEs: exercise.substitutionOptionsEs,
    incrementCategory: exercise.incrementCategory,
  }));

  return (
    <AppShell activeHref="/plan">
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Plan · Día {dayIndex}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {existingSession ? "Editar sesión" : "Nueva sesión"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Agrega los ejercicios de este día. Guardar reemplaza por completo la lista de ejercicios de esta sesión.
          </p>
        </div>
      </header>

      <FormStatusBanner
        saved={false}
        error={search.error === "validation"}
        errorMessage="Revisa cada ejercicio: nombre, series, rango de reps y RIR son obligatorios."
      />

      <SessionEditorForm
        action={saveSessionAction}
        draftPlanId={draft.plan.id}
        dayIndex={dayIndex}
        initialNameEs={existingSession?.template.nameEs ?? ""}
        initialFocus={existingSession?.template.focus ?? ""}
        initialExercises={initialExercises}
      />
    </AppShell>
  );
}
