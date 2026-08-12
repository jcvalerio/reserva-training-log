import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { exercise, exercisePrescription, planSessionTemplate, workoutPlan, workoutSession } from "@/db/schema";
import { findCatalogEntryByName, type MuscleGroup } from "@/training/muscle-taxonomy";

import { generatedWorkoutPlanSchema, type GeneratedWorkoutPlan } from "./generated-plan-schema";
import type { PlanHistoryRow } from "./plan-history";
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
  // Substitutes are excluded from "the plan": they're real prescriptions, but
  // they stand in for an exercise rather than adding one, so counting them
  // here would inflate every day's "N ejercicios" and the /plan preview by one
  // per swap ever made. The session runner reads prescriptions directly (see
  // getSessionRunDetails) and pulls the relevant alternative back in for the
  // session it was chosen in.
  const exercises = templateIds.length
    ? await db
        .select()
        .from(exercisePrescription)
        .where(
          and(
            inArray(exercisePrescription.planSessionTemplateId, templateIds),
            isNull(exercisePrescription.substitutedForPrescriptionId),
          ),
        )
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

/**
 * The catalog-link half of classifySessionMuscleGroups' resolution order,
 * for the plan-builder and full-plan-view body-map thumbnails — batched
 * across every exercise in a plan in one query rather than N+1 per
 * prescription.
 */
export async function getPrimaryMuscleGroupsByExerciseIds(
  exerciseIds: string[],
): Promise<Map<string, MuscleGroup | null>> {
  if (exerciseIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({ id: exercise.id, primaryMuscleGroup: exercise.primaryMuscleGroup })
    .from(exercise)
    .where(inArray(exercise.id, exerciseIds));

  return new Map(rows.map((row) => [row.id, row.primaryMuscleGroup]));
}

/** Ownership-scoped lookup for the plan-history detail page — any status. */
export async function getPlanForProfile(athleteProfileId: string, planId: string): Promise<WorkoutPlan | null> {
  const [plan] = await db
    .select()
    .from(workoutPlan)
    .where(and(eq(workoutPlan.id, planId), eq(workoutPlan.athleteProfileId, athleteProfileId)));

  return plan ?? null;
}

/**
 * Ownership-scoped direct update of a single exercise's targetSets — used by
 * /entrenar's "make this the new target" offer after logging a bonus set.
 * Doesn't touch the draft/builder clone-and-reactivate flow at all: unlike
 * removing a row (blocked once exerciseLog references it, onDelete:
 * "restrict"), updating one column in place is safe regardless of logged
 * history and needs no new plan version. Returns false if the prescription
 * doesn't belong to this profile (no active-plan requirement — bumping a
 * long-idle plan's target is harmless).
 */
export async function updateExercisePrescriptionTargetSets(
  athleteProfileId: string,
  exercisePrescriptionId: string,
  targetSets: number,
): Promise<boolean> {
  const [owned] = await db
    .select({ id: exercisePrescription.id })
    .from(exercisePrescription)
    .innerJoin(planSessionTemplate, eq(planSessionTemplate.id, exercisePrescription.planSessionTemplateId))
    .innerJoin(workoutPlan, eq(workoutPlan.id, planSessionTemplate.workoutPlanId))
    .where(
      and(eq(exercisePrescription.id, exercisePrescriptionId), eq(workoutPlan.athleteProfileId, athleteProfileId)),
    );

  if (!owned) {
    return false;
  }

  await db.update(exercisePrescription).set({ targetSets }).where(eq(exercisePrescription.id, exercisePrescriptionId));
  return true;
}

export type CreateSubstituteInput = {
  originalPrescriptionId: string;
  exerciseNameEs: string;
  reasonEs: string | null;
};

/**
 * Creates (or reuses) an alternative exercise standing in for one already in
 * the plan — the broken/busy machine case, or a movement that doesn't feel
 * right that day.
 *
 * The substitute inherits the *original's* whole prescription: sets, reps,
 * RIR, rest, phase, laterality, load mechanism, compound flag and
 * pain-sensitivity. That's deliberate on two counts. Coaching-wise, swapping
 * the machine shouldn't silently change the day's intended stimulus — you
 * still owe the same work. Data-wise, it means the substitute is a fully
 * classified exercise from its very first set, so suggestProgression and
 * suggestNextWeightKg treat it exactly like anything else instead of falling
 * back to the unclassified flat increment. Only the name differs.
 *
 * Reuses an existing alternative of the same name rather than minting a
 * near-duplicate, so repeatedly swapping to the same machine builds one
 * continuous progression history.
 *
 * Returns null when the prescription isn't this athlete's.
 */
export async function createSubstituteExercise(
  athleteProfileId: string,
  input: CreateSubstituteInput,
): Promise<ExercisePrescription | null> {
  const [original] = await db
    .select({ prescription: exercisePrescription })
    .from(exercisePrescription)
    .innerJoin(planSessionTemplate, eq(planSessionTemplate.id, exercisePrescription.planSessionTemplateId))
    .innerJoin(workoutPlan, eq(workoutPlan.id, planSessionTemplate.workoutPlanId))
    .where(
      and(
        eq(exercisePrescription.id, input.originalPrescriptionId),
        eq(workoutPlan.athleteProfileId, athleteProfileId),
      ),
    );

  if (!original) {
    return null;
  }

  const source = original.prescription;

  // A substitute always hangs off a real plan exercise, never off another
  // substitute — otherwise swapping twice in one session would build a chain
  // and the day's grouping would need to walk it.
  const rootId = source.substitutedForPrescriptionId ?? source.id;

  const siblings = await db
    .select()
    .from(exercisePrescription)
    .where(eq(exercisePrescription.planSessionTemplateId, source.planSessionTemplateId));

  const existing = siblings.find(
    (row) =>
      row.substitutedForPrescriptionId === rootId &&
      row.exerciseNameEs.toLocaleLowerCase("es") === input.exerciseNameEs.toLocaleLowerCase("es"),
  );

  if (existing) {
    return existing;
  }

  const nextOrderIndex = Math.max(...siblings.map((row) => row.orderIndex), 0) + 1;

  const [created] = await db
    .insert(exercisePrescription)
    .values({
      id: randomUUID(),
      planSessionTemplateId: source.planSessionTemplateId,
      orderIndex: nextOrderIndex,
      exerciseNameEs: input.exerciseNameEs,
      // Not inherited: the English name belongs to the original movement, and
      // carrying it over would mislabel a different exercise.
      exerciseNameEn: null,
      // Resolved from the substitute's OWN name, never inherited from the
      // exercise it replaces — the one field here that deliberately breaks
      // this function's inherit-everything rule.
      //
      // Everything else copied below is DOSAGE (phase, sets, reps, RIR, rest,
      // load mechanism) and correctly carries over: you swap the machine, not
      // the prescription. exerciseId is IDENTITY, and the real data shows why
      // that matters — "Pantorrilla sentada unilateral" substituting "Press
      // inclinado en máquina" would credit calf work to pecho, silently and
      // permanently, in the weekly-volume report.
      //
      // Null when the typed name matches no catalog entry: "Sin clasificar" is
      // visible and one tap to fix, whereas a confidently wrong muscle group
      // is neither.
      exerciseId: findCatalogEntryByName(input.exerciseNameEs)?.slug ?? null,
      phase: source.phase,
      isUnilateral: source.isUnilateral,
      prescriptionType: source.prescriptionType,
      targetSets: source.targetSets,
      targetRepMin: source.targetRepMin,
      targetRepMax: source.targetRepMax,
      targetRir: source.targetRir,
      durationSeconds: source.durationSeconds,
      restSeconds: source.restSeconds,
      notesEs: source.notesEs,
      notesEn: null,
      painSensitive: source.painSensitive,
      substitutionOptionsEs: [],
      loadMechanism: source.loadMechanism,
      isCompound: source.isCompound,
      lineageKey: null,
      substitutedForPrescriptionId: rootId,
      substitutionReasonEs: input.reasonEs,
    })
    .returning();

  return created ?? null;
}

export type PlanSessionStats = {
  sessionCount: number;
  firstSessionAt: Date | null;
  lastSessionAt: Date | null;
};

export async function getPlanSessionStats(planId: string): Promise<PlanSessionStats> {
  const sessions = await db
    .select({ startedAt: workoutSession.startedAt, completedAt: workoutSession.completedAt })
    .from(workoutSession)
    .where(eq(workoutSession.workoutPlanId, planId));

  const dates = sessions
    .map((session) => session.completedAt ?? session.startedAt)
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    sessionCount: sessions.length,
    firstSessionAt: dates[0] ?? null,
    lastSessionAt: dates[dates.length - 1] ?? null,
  };
}

/**
 * Every plan a profile has ever had (any status — draft, active, archived,
 * completed), newest first, with a real session count per plan. Archived
 * plans are otherwise invisible in the UI once superseded, even though
 * their logged history stays fully intact — this is the one place that
 * surfaces them again.
 */
export async function getAllPlansForProfile(athleteProfileId: string): Promise<PlanHistoryRow[]> {
  const plans = await db
    .select()
    .from(workoutPlan)
    .where(eq(workoutPlan.athleteProfileId, athleteProfileId))
    .orderBy(desc(workoutPlan.createdAt));

  if (plans.length === 0) {
    return [];
  }

  const planIds = plans.map((plan) => plan.id);
  const sessionCounts = await db
    .select({ workoutPlanId: workoutSession.workoutPlanId, count: sql<number>`count(*)::int` })
    .from(workoutSession)
    .where(inArray(workoutSession.workoutPlanId, planIds))
    .groupBy(workoutSession.workoutPlanId);

  const sessionCountByPlanId = new Map(sessionCounts.map((row) => [row.workoutPlanId, row.count]));

  return plans.map((plan) => ({ plan, sessionCount: sessionCountByPlanId.get(plan.id) ?? 0 }));
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
      // Falls back to name matching so a template that predates carrying an
      // explicit id still activates fully classified.
      exerciseId: exercise.exerciseId ?? findCatalogEntryByName(exercise.exerciseNameEs)?.slug ?? null,
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
            // A field present in the DB and the builder but missing from this
            // pass-through is dropped on read with no error anywhere — the
            // symptom would be "every activated plan shows Sin clasificar".
            // Covered by a round-trip test in plan-repository.test.ts.
            exerciseId: orUndefined(exercise.exerciseId),
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
