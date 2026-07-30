import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { exercisePrescription, planSessionTemplate, workoutPlan } from "@/db/schema";

import type {
  PlanBuilderExerciseInput,
  PlanBuilderSessionInfoInput,
  PlanBuilderSetupInput,
} from "./plan-builder-schema";
import { getActivePlanForProfile, type ExercisePrescription, type PlanSessionTemplate, type WorkoutPlan } from "./plan-repository";

export type DraftPlanSession = {
  template: PlanSessionTemplate;
  exercises: ExercisePrescription[];
};

export type DraftPlanWithSessions = {
  plan: WorkoutPlan;
  sessions: DraftPlanSession[];
};

const DEFAULT_SAFETY_SUMMARY_ES =
  "Registra dolor en cada serie, evita progresar con dolor sobre 2 y modifica ejercicios con dolor sobre 3.";

export async function getDraftPlanForProfile(athleteProfileId: string): Promise<DraftPlanWithSessions | null> {
  const [planRow] = await db
    .select()
    .from(workoutPlan)
    .where(and(eq(workoutPlan.athleteProfileId, athleteProfileId), eq(workoutPlan.status, "draft")));

  if (!planRow) {
    return null;
  }

  return getDraftPlanSessions(planRow);
}

async function getDraftPlanSessions(planRow: WorkoutPlan): Promise<DraftPlanWithSessions> {
  const templates = await db
    .select()
    .from(planSessionTemplate)
    .where(eq(planSessionTemplate.workoutPlanId, planRow.id))
    .orderBy(asc(planSessionTemplate.dayIndex));

  const templateIds = templates.map((template) => template.id);
  const exercises = templateIds.length
    ? await db
        .select()
        .from(exercisePrescription)
        .where(inArray(exercisePrescription.planSessionTemplateId, templateIds))
        .orderBy(asc(exercisePrescription.orderIndex))
    : [];

  const exercisesByTemplateId = new Map<string, ExercisePrescription[]>();
  for (const exerciseRow of exercises) {
    const bucket = exercisesByTemplateId.get(exerciseRow.planSessionTemplateId);
    if (bucket) {
      bucket.push(exerciseRow);
    } else {
      exercisesByTemplateId.set(exerciseRow.planSessionTemplateId, [exerciseRow]);
    }
  }

  return {
    plan: planRow,
    sessions: templates.map((template) => ({
      template,
      exercises: exercisesByTemplateId.get(template.id) ?? [],
    })),
  };
}

export async function createDraftPlan(
  athleteProfileId: string,
  input: PlanBuilderSetupInput,
): Promise<DraftPlanWithSessions> {
  const existingDraft = await getDraftPlanForProfile(athleteProfileId);
  if (existingDraft) {
    // One draft at a time, enforced at the app level only — not worth a
    // second partial unique index for a 3-user family app.
    return existingDraft;
  }

  const [insertedPlan] = await db
    .insert(workoutPlan)
    .values({
      id: randomUUID(),
      athleteProfileId,
      nameEs: input.nameEs,
      nameEn: null,
      goal: "hypertrophy",
      // Vestigial: the plan repeats indefinitely, there's no fixed week
      // count, but the DB column is NOT NULL. Always 1 going forward.
      durationWeeks: 1,
      daysPerWeek: input.daysPerWeek,
      sessionDurationMinutes: 60,
      locale: "es",
      safetySummaryEs: DEFAULT_SAFETY_SUMMARY_ES,
      status: "draft",
      activatedAt: null,
    })
    .returning();

  if (!insertedPlan) {
    throw new Error("Draft plan creation failed unexpectedly");
  }

  return { plan: insertedPlan, sessions: [] };
}

export async function saveDraftSession(
  draftPlanId: string,
  dayIndex: number,
  sessionInfo: PlanBuilderSessionInfoInput,
  exercises: PlanBuilderExerciseInput[],
) {
  const [existingTemplate] = await db
    .select()
    .from(planSessionTemplate)
    .where(and(eq(planSessionTemplate.workoutPlanId, draftPlanId), eq(planSessionTemplate.dayIndex, dayIndex)));

  const templateId = existingTemplate?.id ?? randomUUID();

  if (existingTemplate) {
    await db
      .update(planSessionTemplate)
      .set({
        nameEs: sessionInfo.nameEs,
        focus: sessionInfo.focus,
        estimatedDurationMinutes: sessionInfo.estimatedDurationMinutes,
        mobilityNotesEs: sessionInfo.mobilityNotesEs,
      })
      .where(eq(planSessionTemplate.id, templateId));
  } else {
    await db.insert(planSessionTemplate).values({
      id: templateId,
      workoutPlanId: draftPlanId,
      // Vestigial: always 1, the plan repeats indefinitely (see durationWeeks
      // in createDraftPlan).
      weekNumber: 1,
      dayIndex,
      nameEs: sessionInfo.nameEs,
      nameEn: null,
      focus: sessionInfo.focus,
      estimatedDurationMinutes: sessionInfo.estimatedDurationMinutes,
      mobilityNotesEs: sessionInfo.mobilityNotesEs,
    });
  }

  // Replace-all, mirroring saveBaselineLiftsForProfile's exact pattern.
  await db.delete(exercisePrescription).where(eq(exercisePrescription.planSessionTemplateId, templateId));

  if (exercises.length > 0) {
    await db.insert(exercisePrescription).values(
      exercises.map((exerciseInput, index) => ({
        id: randomUUID(),
        planSessionTemplateId: templateId,
        orderIndex: index + 1,
        exerciseNameEs: exerciseInput.exerciseNameEs,
        exerciseNameEn: null,
        phase: exerciseInput.phase,
        sideMode: exerciseInput.sideMode,
        targetSets: exerciseInput.targetSets,
        targetRepMin: exerciseInput.targetRepMin,
        targetRepMax: exerciseInput.targetRepMax,
        targetRir: exerciseInput.targetRir,
        restSeconds: exerciseInput.restSeconds,
        notesEs: exerciseInput.notesEs,
        notesEn: null,
        painSensitive: exerciseInput.painSensitive,
        substitutionOptionsEs: exerciseInput.substitutionOptionsEs,
        incrementCategory: exerciseInput.incrementCategory ?? null,
      })),
    );
  }
}

export async function deleteDraftSession(draftPlanId: string, dayIndex: number) {
  // Exercises cascade-delete via the existing FK on exercisePrescription.
  await db
    .delete(planSessionTemplate)
    .where(and(eq(planSessionTemplate.workoutPlanId, draftPlanId), eq(planSessionTemplate.dayIndex, dayIndex)));
}

export async function activateDraftPlan(athleteProfileId: string, draftPlanId: string): Promise<void> {
  const currentActive = await getActivePlanForProfile(athleteProfileId);

  if (currentActive) {
    // This ordering isn't just a preference — the partial unique index on
    // status='active' makes it the only order that can succeed.
    await db.update(workoutPlan).set({ status: "archived" }).where(eq(workoutPlan.id, currentActive.plan.id));
  }

  try {
    await db
      .update(workoutPlan)
      .set({ status: "active", activatedAt: new Date() })
      .where(and(eq(workoutPlan.id, draftPlanId), eq(workoutPlan.athleteProfileId, athleteProfileId)));
  } catch (error) {
    // The draft row is untouched either way (never deleted), so a
    // mid-sequence failure just means the user can retry with zero data loss.
    throw new Error("Plan activation failed", { cause: error });
  }
}
