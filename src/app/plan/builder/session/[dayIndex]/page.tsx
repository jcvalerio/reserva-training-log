import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import {
  getDraftPlanForProfile,
  getExercisePrescriptionDefaultsByName,
  getKnownExerciseNamesForProfile,
} from "@/plans/plan-builder-repository";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { AppShell } from "../../../../app-shell";
import { FormStatusBanner } from "../../../../form-status-banner";
import { SubmitButton } from "../../../../submit-button";
import { forceRemoveExerciseAction, saveSessionAction } from "../../actions";
import { SessionEditorForm, type SessionEditorInitialExercise } from "./session-editor-form";

type SessionEditorPageProps = {
  params: Promise<{ dayIndex: string }>;
  searchParams?: Promise<{ error?: string; blocked?: string }>;
};

type BlockedExercise = { id: string; exerciseNameEs: string; loggedSetCount: number };

function parseBlockedExercises(raw: string | undefined): BlockedExercise[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is BlockedExercise =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as BlockedExercise).id === "string" &&
        typeof (item as BlockedExercise).exerciseNameEs === "string" &&
        typeof (item as BlockedExercise).loggedSetCount === "number",
    );
  } catch {
    // Only ever drives display text below — the delete action itself
    // re-verifies ownership server-side, so a malformed/tampered value here
    // just falls back to showing nothing rather than being trusted for
    // anything.
    return [];
  }
}

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

  const knownExerciseNames = await getKnownExerciseNamesForProfile(profile.id);
  const exerciseDefaultsByName = await getExercisePrescriptionDefaultsByName(profile.id);

  const blockedExercises = search.error === "cannot_remove" ? parseBlockedExercises(search.blocked) : [];

  const existingSession = draft.sessions.find((session) => session.template.dayIndex === dayIndex);
  const initialExercises: SessionEditorInitialExercise[] = (existingSession?.exercises ?? []).map((exercise) => ({
    id: exercise.id,
    exerciseNameEs: exercise.exerciseNameEs,
    exerciseId: exercise.exerciseId,
    phase: exercise.phase,
    isUnilateral: exercise.isUnilateral,
    prescriptionType: exercise.prescriptionType,
    targetSets: exercise.targetSets,
    targetRepMin: exercise.targetRepMin,
    targetRepMax: exercise.targetRepMax,
    targetRir: exercise.targetRir,
    durationSeconds: exercise.durationSeconds,
    restSeconds: exercise.restSeconds,
    notesEs: exercise.notesEs,
    painSensitive: exercise.painSensitive,
    substitutionOptionsEs: exercise.substitutionOptionsEs,
    loadMechanism: exercise.loadMechanism,
    isCompound: exercise.isCompound,
  }));

  return (
    <AppShell activeHref="/plan" backTo={{ href: "/plan/builder", label: "tu borrador" }}>
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Plan · Día {dayIndex}</p>
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
        error={search.error === "validation" || search.error === "cannot_remove"}
        errorMessage={
          search.error === "cannot_remove"
            ? "Se guardaron los demás cambios, pero un ejercicio con series registradas no se pudo quitar — revisa abajo."
            : "Revisa cada ejercicio: nombre, series, rango de reps y RIR son obligatorios."
        }
        floating
      />

      {blockedExercises.length > 0 ? (
        <div className="mt-6 grid gap-3 rounded-3xl bg-zinc-900 p-4 ring-1 ring-amber-300/30">
          <p className="text-sm font-semibold text-amber-200">
            {blockedExercises.length > 1 ? "Estos ejercicios ya tienen" : "Este ejercicio ya tiene"} entrenamientos
            registrados
          </p>
          {blockedExercises.map((exercise) => (
            <div key={exercise.id} className="rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
              <p className="text-sm font-semibold text-zinc-100">{exercise.exerciseNameEs}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                {exercise.loggedSetCount > 0
                  ? `Tiene ${exercise.loggedSetCount} ${exercise.loggedSetCount === 1 ? "serie registrada" : "series registradas"}.`
                  : "Quedó registrado en una sesión de entrenamiento, aunque ya no tiene series guardadas."}{" "}
                Si lo quitas de todas formas, esa historia se pierde para siempre — no se puede deshacer.
              </p>
              <form action={forceRemoveExerciseAction} className="mt-2">
                <input type="hidden" name="draftPlanId" value={draft.plan.id} />
                <input type="hidden" name="dayIndex" value={dayIndex} />
                <input type="hidden" name="exercisePrescriptionId" value={exercise.id} />
                <SubmitButton className="min-h-11 rounded-xl bg-amber-200 px-3 text-xs font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100">
                  Eliminar de todas formas, con su historial
                </SubmitButton>
              </form>
            </div>
          ))}
        </div>
      ) : null}

      <SessionEditorForm
        action={saveSessionAction}
        draftPlanId={draft.plan.id}
        dayIndex={dayIndex}
        initialNameEs={existingSession?.template.nameEs ?? ""}
        initialFocus={existingSession?.template.focus ?? ""}
        initialExercises={initialExercises}
        knownExerciseNames={knownExerciseNames}
        exerciseDefaultsByName={exerciseDefaultsByName}
      />
    </AppShell>
  );
}
