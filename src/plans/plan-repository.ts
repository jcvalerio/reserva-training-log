import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { exercisePrescription, planSessionTemplate, workoutPlan } from "@/db/schema";

import { generatedWorkoutPlanSchema, type GeneratedWorkoutPlan } from "./generated-plan-schema";
import { getPlanTemplateById, type PlanTemplateId } from "./plan-templates";

export type WorkoutPlan = typeof workoutPlan.$inferSelect;
export type PlanSessionTemplate = typeof planSessionTemplate.$inferSelect;
export type ExercisePrescription = typeof exercisePrescription.$inferSelect;

export type ActivePlanSession = {
  template: PlanSessionTemplate;
  exercises: ExercisePrescription[];
};

export type ActivePlanWithSessions = {
  plan: WorkoutPlan;
  sessions: ActivePlanSession[];
};

const ACTIVE_STATUS_PREDICATE = sql`${workoutPlan.status} = 'active'`;

export async function getActivePlanForProfile(athleteProfileId: string): Promise<ActivePlanWithSessions | null> {
  const [planRow] = await db
    .select()
    .from(workoutPlan)
    .where(and(eq(workoutPlan.athleteProfileId, athleteProfileId), eq(workoutPlan.status, "active")));

  if (!planRow) {
    return null;
  }

  const templates = await db
    .select()
    .from(planSessionTemplate)
    .where(eq(planSessionTemplate.workoutPlanId, planRow.id))
    .orderBy(asc(planSessionTemplate.weekNumber), asc(planSessionTemplate.dayIndex));

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

export async function activateSeededPlanForProfile(
  athleteProfileId: string,
  templateId: PlanTemplateId,
): Promise<ActivePlanWithSessions> {
  const existing = await getActivePlanForProfile(athleteProfileId);
  if (existing) {
    return existing;
  }

  const template = getPlanTemplateById(templateId);
  if (!template) {
    throw new Error(`Unknown plan template id: ${templateId}`);
  }

  const seeded = template.build();
  const planId = randomUUID();

  const [insertedPlan] = await db
    .insert(workoutPlan)
    .values({
      id: planId,
      athleteProfileId,
      nameEs: seeded.nameEs,
      nameEn: seeded.nameEn ?? null,
      goal: seeded.goal,
      // Vestigial: the plan repeats indefinitely, there's no fixed week
      // count, but the DB column is NOT NULL. Always 1 going forward.
      durationWeeks: 1,
      daysPerWeek: seeded.daysPerWeek,
      sessionDurationMinutes: seeded.sessionDurationMinutes,
      locale: seeded.locale,
      safetySummaryEs: seeded.safetySummaryEs,
      status: "active",
      activatedAt: new Date(),
    })
    .onConflictDoNothing({ target: workoutPlan.athleteProfileId, where: ACTIVE_STATUS_PREDICATE })
    .returning();

  if (!insertedPlan) {
    // Another concurrent request already activated a plan for this profile.
    const activated = await getActivePlanForProfile(athleteProfileId);
    if (!activated) {
      throw new Error("Plan activation conflicted but no active plan was found on re-fetch");
    }
    return activated;
  }

  const sessions = seeded.sessions;
  const templateIds = sessions.map(() => randomUUID());

  await db.insert(planSessionTemplate).values(
    sessions.map((session, sessionIndex) => ({
      id: templateIds[sessionIndex],
      workoutPlanId: insertedPlan.id,
      // Vestigial: always 1, the plan repeats indefinitely (see durationWeeks above).
      weekNumber: 1,
      dayIndex: session.dayIndex,
      nameEs: session.nameEs,
      nameEn: session.nameEn ?? null,
      focus: session.focus,
      estimatedDurationMinutes: session.estimatedDurationMinutes,
      mobilityNotesEs: session.mobilityNotesEs,
    })),
  );

  const prescriptionRows = sessions.flatMap((session, sessionIndex) =>
    session.exercises.map((exercise, exerciseIndex) => ({
      id: randomUUID(),
      planSessionTemplateId: templateIds[sessionIndex],
      orderIndex: exerciseIndex + 1,
      exerciseNameEs: exercise.exerciseNameEs,
      exerciseNameEn: exercise.exerciseNameEn ?? null,
      phase: exercise.phase,
      isUnilateral: exercise.isUnilateral,
      prescriptionType: exercise.prescriptionType,
      targetSets: exercise.targetSets,
      targetRepMin: exercise.prescriptionType === "strength" ? exercise.targetRepMin : null,
      targetRepMax: exercise.prescriptionType === "strength" ? exercise.targetRepMax : null,
      targetRir: exercise.prescriptionType === "strength" ? exercise.targetRir : null,
      durationSeconds: exercise.prescriptionType === "duration" ? exercise.durationSeconds : null,
      restSeconds: exercise.restSeconds,
      notesEs: exercise.notesEs,
      notesEn: exercise.notesEn ?? null,
      painSensitive: exercise.painSensitive,
      substitutionOptionsEs: exercise.substitutionOptionsEs,
      loadMechanism: exercise.prescriptionType === "strength" ? (exercise.loadMechanism ?? null) : null,
      isCompound: exercise.prescriptionType === "strength" ? (exercise.isCompound ?? null) : null,
    })),
  );

  if (prescriptionRows.length) {
    await db.insert(exercisePrescription).values(prescriptionRows);
  }

  const activated = await getActivePlanForProfile(athleteProfileId);
  if (!activated) {
    throw new Error("Plan activation succeeded but no active plan was found on re-fetch");
  }
  return activated;
}

function orUndefined<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

export function toGeneratedWorkoutPlan(active: ActivePlanWithSessions): GeneratedWorkoutPlan {
  // Plans repeat indefinitely, so only week 1's templates are meaningful.
  // Plans activated before this model existed have real weekNumber 1-4 data
  // (4 duplicated weeks) — filtering to week 1 here is a display
  // simplification, not data loss: weeks 2-4 template rows and any logged
  // history against them stay in the DB and remain visible via /progreso.
  return generatedWorkoutPlanSchema.parse({
    schemaVersion: 1,
    locale: active.plan.locale,
    nameEs: active.plan.nameEs,
    nameEn: orUndefined(active.plan.nameEn),
    goal: active.plan.goal,
    daysPerWeek: active.plan.daysPerWeek,
    sessionDurationMinutes: active.plan.sessionDurationMinutes,
    safetySummaryEs: active.plan.safetySummaryEs,
    sessions: active.sessions
      .filter((session) => session.template.weekNumber === 1)
      .sort((a, b) => a.template.dayIndex - b.template.dayIndex)
      .map((session) => ({
        dayIndex: session.template.dayIndex,
        nameEs: session.template.nameEs,
        nameEn: orUndefined(session.template.nameEn),
        focus: session.template.focus,
        estimatedDurationMinutes: session.template.estimatedDurationMinutes,
        mobilityNotesEs: session.template.mobilityNotesEs,
        exercises: [...session.exercises]
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((exercise) => ({
            // Flat pass-through: the discriminated union's Zod parse below
            // only reads the fields relevant to whichever prescriptionType
            // this row actually is, and ignores the rest (e.g. a duration
            // row's null targetRepMin) — no need to branch here, unlike the
            // write direction above where TypeScript enforces the
            // discriminant on GeneratedWorkoutPlan's own type.
            exerciseNameEs: exercise.exerciseNameEs,
            exerciseNameEn: orUndefined(exercise.exerciseNameEn),
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
            notesEn: orUndefined(exercise.notesEn),
            painSensitive: exercise.painSensitive,
            substitutionOptionsEs: exercise.substitutionOptionsEs,
            loadMechanism: orUndefined(exercise.loadMechanism),
            isCompound: orUndefined(exercise.isCompound),
          })),
      })),
  });
}
