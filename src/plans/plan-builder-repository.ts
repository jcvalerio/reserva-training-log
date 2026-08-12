import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { exerciseLog, exercisePrescription, planSessionTemplate, setLog, workoutPlan } from "@/db/schema";
import { findCatalogEntryByName } from "@/training/muscle-taxonomy";

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

export async function getKnownExerciseNamesForProfile(athleteProfileId: string): Promise<string[]> {
  // Sourced across every plan status (draft/active/archived), not just the
  // active one — the point is nudging name consistency across edits, and an
  // exercise from an archived or draft plan is just as real a prior name as
  // one from the currently active plan. Exact-string matching is how
  // progression history is keyed (see workout-repository.ts), so this is a
  // continuity aid, not a restriction — free text is still allowed.
  const rows = await db
    .selectDistinct({ exerciseNameEs: exercisePrescription.exerciseNameEs })
    .from(exercisePrescription)
    .innerJoin(planSessionTemplate, eq(exercisePrescription.planSessionTemplateId, planSessionTemplate.id))
    .innerJoin(workoutPlan, eq(planSessionTemplate.workoutPlanId, workoutPlan.id))
    .where(eq(workoutPlan.athleteProfileId, athleteProfileId));

  return rows.map((row) => row.exerciseNameEs).sort((a, b) => a.localeCompare(b, "es"));
}

export type ExercisePrescriptionDefaults = Pick<
  ExercisePrescription,
  | "phase"
  | "isUnilateral"
  | "prescriptionType"
  | "targetSets"
  | "targetRepMin"
  | "targetRepMax"
  | "targetRir"
  | "durationSeconds"
  | "restSeconds"
  | "loadMechanism"
  | "isCompound"
>;

// One most-recent prescription per known exercise name, so the session
// editor can prefill sets/reps/RIR/rest for a name you've already used
// elsewhere instead of always starting from hard defaults — "most recent" is
// picked by the owning plan's createdAt since exercisePrescription rows
// don't carry their own timestamp. Picked in JS rather than a SQL window
// function to match this file's existing lightweight-query style.
export async function getExercisePrescriptionDefaultsByName(
  athleteProfileId: string,
): Promise<Record<string, ExercisePrescriptionDefaults>> {
  const rows = await db
    .select({
      exerciseNameEs: exercisePrescription.exerciseNameEs,
      phase: exercisePrescription.phase,
      isUnilateral: exercisePrescription.isUnilateral,
      prescriptionType: exercisePrescription.prescriptionType,
      targetSets: exercisePrescription.targetSets,
      targetRepMin: exercisePrescription.targetRepMin,
      targetRepMax: exercisePrescription.targetRepMax,
      targetRir: exercisePrescription.targetRir,
      durationSeconds: exercisePrescription.durationSeconds,
      restSeconds: exercisePrescription.restSeconds,
      loadMechanism: exercisePrescription.loadMechanism,
      isCompound: exercisePrescription.isCompound,
      planCreatedAt: workoutPlan.createdAt,
    })
    .from(exercisePrescription)
    .innerJoin(planSessionTemplate, eq(exercisePrescription.planSessionTemplateId, planSessionTemplate.id))
    .innerJoin(workoutPlan, eq(planSessionTemplate.workoutPlanId, workoutPlan.id))
    .where(eq(workoutPlan.athleteProfileId, athleteProfileId));

  const mostRecentByName = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const existing = mostRecentByName.get(row.exerciseNameEs);
    if (!existing || row.planCreatedAt > existing.planCreatedAt) {
      mostRecentByName.set(row.exerciseNameEs, row);
    }
  }

  return Object.fromEntries(
    [...mostRecentByName.entries()].map(([name, row]) => [
      name,
      {
        phase: row.phase,
        isUnilateral: row.isUnilateral,
        prescriptionType: row.prescriptionType,
        targetSets: row.targetSets,
        targetRepMin: row.targetRepMin,
        targetRepMax: row.targetRepMax,
        targetRir: row.targetRir,
        durationSeconds: row.durationSeconds,
        restSeconds: row.restSeconds,
        loadMechanism: row.loadMechanism,
        isCompound: row.isCompound,
      },
    ]),
  );
}

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

// Not actually draft-specific despite the name (kept for minimal diff — it
// predates the share feature) — returns the full session/exercise structure
// for any WorkoutPlan row regardless of status. Exported for
// plan-share-repository.ts, which needs the same read for both an active
// and a freshly-cloned draft plan.
export async function getDraftPlanSessions(planRow: WorkoutPlan): Promise<DraftPlanWithSessions> {
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

export async function updateDraftPlanDetails(
  athleteProfileId: string,
  draftPlanId: string,
  input: PlanBuilderSetupInput,
): Promise<void> {
  await db
    .update(workoutPlan)
    .set({ nameEs: input.nameEs, daysPerWeek: input.daysPerWeek })
    .where(
      and(
        eq(workoutPlan.id, draftPlanId),
        eq(workoutPlan.athleteProfileId, athleteProfileId),
        eq(workoutPlan.status, "draft"),
      ),
    );
}

export type BlockedExerciseRemoval = {
  id: string;
  exerciseNameEs: string;
  loggedSetCount: number;
};

/**
 * Thrown instead of a raw FK violation when saveDraftSession would need to
 * remove an exercisePrescription that already has logged history —
 * exerciseLog.exercisePrescriptionId is restrict on purpose. Carries enough
 * structure (which exercise, how many sets) for the caller to offer a real
 * confirm-and-delete action instead of just reporting failure.
 */
export class CannotRemoveLoggedExerciseError extends Error {
  blocked: BlockedExerciseRemoval[];

  constructor(blocked: BlockedExerciseRemoval[]) {
    const names = blocked.map((exercise) => exercise.exerciseNameEs).join(", ");
    super(
      `No se pudo quitar ${blocked.length > 1 ? "estos ejercicios" : "este ejercicio"} (${names}) porque ya tiene${blocked.length > 1 ? "n" : ""} series registradas.`,
    );
    this.name = "CannotRemoveLoggedExerciseError";
    this.blocked = blocked;
  }
}

/**
 * Explicit, confirmed deletion of one exercise's full logged history so it
 * can actually be removed from the plan — saveDraftSession refuses this on
 * its own (see CannotRemoveLoggedExerciseError) because it's permanent.
 * Deleting a set only ever removes its setLog row (see deleteSetForSession
 * in workout-repository.ts), never the parent exerciseLog — that shell is
 * what actually blocks the exercisePrescription delete, so no amount of
 * deleting individual sets from /entrenar can unblock this on its own.
 *
 * Scoped to the given draft plan + day (joined through planSessionTemplate)
 * so a caller can't delete history belonging to a different plan by guessing
 * an id — the action layer still owns checking the profile owns this draft.
 */
export async function forceRemoveExercisePrescriptionWithHistory(
  draftPlanId: string,
  dayIndex: number,
  exercisePrescriptionId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: exercisePrescription.id })
    .from(exercisePrescription)
    .innerJoin(planSessionTemplate, eq(planSessionTemplate.id, exercisePrescription.planSessionTemplateId))
    .where(
      and(
        eq(exercisePrescription.id, exercisePrescriptionId),
        eq(planSessionTemplate.workoutPlanId, draftPlanId),
        eq(planSessionTemplate.dayIndex, dayIndex),
      ),
    );

  if (!row) {
    return false;
  }

  // setLog cascades from exerciseLog, so deleting the log rows here also
  // clears every set logged under them before the prescription itself goes.
  await db.delete(exerciseLog).where(eq(exerciseLog.exercisePrescriptionId, exercisePrescriptionId));
  await db.delete(exercisePrescription).where(eq(exercisePrescription.id, exercisePrescriptionId));

  return true;
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

  function toExercisePrescriptionValues(exerciseInput: PlanBuilderExerciseInput) {
    return {
      exerciseNameEs: exerciseInput.exerciseNameEs,
      exerciseNameEn: null,
      // The form's explicit choice wins; otherwise resolve from the typed
      // name, so someone who never touches the select still gets a classified
      // exercise whenever the name is one the catalog knows.
      exerciseId: exerciseInput.exerciseId ?? findCatalogEntryByName(exerciseInput.exerciseNameEs)?.slug ?? null,
      phase: exerciseInput.phase,
      isUnilateral: exerciseInput.isUnilateral,
      prescriptionType: exerciseInput.prescriptionType,
      targetSets: exerciseInput.targetSets,
      targetRepMin: exerciseInput.prescriptionType === "strength" ? exerciseInput.targetRepMin : null,
      targetRepMax: exerciseInput.prescriptionType === "strength" ? exerciseInput.targetRepMax : null,
      targetRir: exerciseInput.prescriptionType === "strength" ? exerciseInput.targetRir : null,
      durationSeconds: exerciseInput.prescriptionType === "duration" ? exerciseInput.durationSeconds : null,
      restSeconds: exerciseInput.restSeconds,
      notesEs: exerciseInput.notesEs,
      notesEn: null,
      painSensitive: exerciseInput.painSensitive,
      substitutionOptionsEs: exerciseInput.substitutionOptionsEs,
      loadMechanism: exerciseInput.prescriptionType === "strength" ? (exerciseInput.loadMechanism ?? null) : null,
      isCompound: exerciseInput.prescriptionType === "strength" ? (exerciseInput.isCompound ?? null) : null,
    };
  }

  // Update existing rows in place by position instead of delete+reinsert.
  // Once a session has been activated and logged against, exerciseLog rows
  // reference exercisePrescription.id with onDelete: "restrict" — a blind
  // delete-all here throws a raw FK violation the moment any exercise in
  // this session has real set history. Updating in place never deletes a
  // referenced row, so it's safe regardless of logged history.
  const existingExercises = await db
    .select({ id: exercisePrescription.id, exerciseNameEs: exercisePrescription.exerciseNameEs })
    .from(exercisePrescription)
    .where(eq(exercisePrescription.planSessionTemplateId, templateId))
    .orderBy(asc(exercisePrescription.orderIndex));

  const updateCount = Math.min(existingExercises.length, exercises.length);

  for (let index = 0; index < updateCount; index += 1) {
    await db
      .update(exercisePrescription)
      .set({ ...toExercisePrescriptionValues(exercises[index]!), orderIndex: index + 1 })
      .where(eq(exercisePrescription.id, existingExercises[index]!.id));
  }

  if (exercises.length > updateCount) {
    await db.insert(exercisePrescription).values(
      exercises.slice(updateCount).map((exerciseInput, offset) => ({
        id: randomUUID(),
        planSessionTemplateId: templateId,
        orderIndex: updateCount + offset + 1,
        ...toExercisePrescriptionValues(exerciseInput),
      })),
    );
  }

  if (existingExercises.length > updateCount) {
    const leftoverRows = existingExercises.slice(updateCount);
    const leftoverIds = leftoverRows.map((row) => row.id);

    // Check for blocking history up front rather than letting the delete
    // below fail, so the caller gets a precise, structured list instead of a
    // raw constraint violation. count(set_log.id) can legitimately be 0 and
    // still block: deleting a set only removes its setLog row, never the
    // parent exerciseLog shell (see forceRemoveExercisePrescriptionWithHistory),
    // so an exercise can end up logged with zero remaining sets and still be
    // unremovable — the left join + group by below reflects that on purpose.
    const historyRows = await db
      .select({
        exercisePrescriptionId: exerciseLog.exercisePrescriptionId,
        loggedSetCount: sql<number>`count(${setLog.id})`,
      })
      .from(exerciseLog)
      .leftJoin(setLog, eq(setLog.exerciseLogId, exerciseLog.id))
      .where(inArray(exerciseLog.exercisePrescriptionId, leftoverIds))
      .groupBy(exerciseLog.exercisePrescriptionId);

    const loggedSetCountById = new Map(
      historyRows.map((row) => [row.exercisePrescriptionId, Number(row.loggedSetCount)]),
    );
    const blocked: BlockedExerciseRemoval[] = leftoverRows
      .filter((row) => loggedSetCountById.has(row.id))
      .map((row) => ({
        id: row.id,
        exerciseNameEs: row.exerciseNameEs,
        loggedSetCount: loggedSetCountById.get(row.id) ?? 0,
      }));

    if (blocked.length > 0) {
      throw new CannotRemoveLoggedExerciseError(blocked);
    }

    await db.delete(exercisePrescription).where(inArray(exercisePrescription.id, leftoverIds));
  }
}

export async function cloneWorkoutPlanToDraft(
  athleteProfileId: string,
  sourcePlanId: string,
): Promise<DraftPlanWithSessions> {
  const existingDraft = await getDraftPlanForProfile(athleteProfileId);
  if (existingDraft) {
    throw new Error("Ya existe un borrador en progreso. Termínalo o elimínalo antes de duplicar un plan.");
  }

  const [sourcePlan] = await db
    .select()
    .from(workoutPlan)
    .where(and(eq(workoutPlan.id, sourcePlanId), eq(workoutPlan.athleteProfileId, athleteProfileId)));

  if (!sourcePlan) {
    throw new Error("No se encontró el plan a duplicar.");
  }

  const source = await getDraftPlanSessions(sourcePlan);

  const [insertedPlan] = await db
    .insert(workoutPlan)
    .values({
      id: randomUUID(),
      athleteProfileId,
      nameEs: `${sourcePlan.nameEs} (copia)`,
      nameEn: sourcePlan.nameEn,
      goal: sourcePlan.goal,
      durationWeeks: 1,
      daysPerWeek: sourcePlan.daysPerWeek,
      sessionDurationMinutes: sourcePlan.sessionDurationMinutes,
      locale: sourcePlan.locale,
      safetySummaryEs: sourcePlan.safetySummaryEs,
      status: "draft",
      activatedAt: null,
    })
    .returning();

  if (!insertedPlan) {
    throw new Error("Draft plan creation failed unexpectedly");
  }

  // Filter to week 1, matching toGeneratedWorkoutPlan's same backward-compat
  // handling — a source plan still carrying old 4-week legacy data should
  // clone as one flat routine, not duplicate every week's templates.
  const sourceSessions = source.sessions.filter((session) => session.template.weekNumber === 1);
  await insertClonedPlanSessions(insertedPlan.id, sourceSessions);

  const cloned = await getDraftPlanForProfile(athleteProfileId);
  if (!cloned) {
    throw new Error("Plan duplication failed unexpectedly");
  }
  return cloned;
}

/**
 * Inserts a copy of each given day (with its exercises) under targetPlanId.
 * Shared by the self-duplicate flow above and plan-share-repository.ts's
 * cross-account redemption clone — the row-shaping is identical, only the
 * ownership/authorization around it differs. lineageKey is always copied
 * through: null stays null for an ordinary (never-shared) duplicate, and a
 * real value flows through unchanged for a share-redemption clone.
 */
export async function insertClonedPlanSessions(targetPlanId: string, sourceSessions: DraftPlanSession[]): Promise<void> {
  for (const session of sourceSessions) {
    const templateId = randomUUID();
    await db.insert(planSessionTemplate).values({
      id: templateId,
      workoutPlanId: targetPlanId,
      weekNumber: 1,
      dayIndex: session.template.dayIndex,
      nameEs: session.template.nameEs,
      nameEn: session.template.nameEn,
      focus: session.template.focus,
      estimatedDurationMinutes: session.template.estimatedDurationMinutes,
      mobilityNotesEs: session.template.mobilityNotesEs,
    });

    if (session.exercises.length > 0) {
      await db.insert(exercisePrescription).values(
        session.exercises.map((exercise) => ({
          id: randomUUID(),
          planSessionTemplateId: templateId,
          orderIndex: exercise.orderIndex,
          exerciseNameEs: exercise.exerciseNameEs,
          exerciseNameEn: exercise.exerciseNameEn,
          // Copied verbatim like lineageKey: a clone is the same exercise, so
          // it must not have to re-resolve its own classification.
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
          notesEn: exercise.notesEn,
          painSensitive: exercise.painSensitive,
          substitutionOptionsEs: exercise.substitutionOptionsEs,
          loadMechanism: exercise.loadMechanism,
          isCompound: exercise.isCompound,
          lineageKey: exercise.lineageKey,
        })),
      );
    }
  }
}

export async function deleteDraftSession(draftPlanId: string, dayIndex: number) {
  // Exercises cascade-delete via the existing FK on exercisePrescription.
  await db
    .delete(planSessionTemplate)
    .where(and(eq(planSessionTemplate.workoutPlanId, draftPlanId), eq(planSessionTemplate.dayIndex, dayIndex)));
}

export async function discardDraftPlan(athleteProfileId: string): Promise<void> {
  // Scoped to status "draft" so this can never touch an active or archived
  // plan — a draft has never been activated, so it has no logged sets to
  // orphan. Sessions/exercises cascade-delete via the existing FKs.
  await db
    .delete(workoutPlan)
    .where(and(eq(workoutPlan.athleteProfileId, athleteProfileId), eq(workoutPlan.status, "draft")));
}

export async function revertActivePlanToDraft(athleteProfileId: string): Promise<void> {
  const active = await getActivePlanForProfile(athleteProfileId);
  if (!active) {
    throw new Error("No hay un plan activo para editar.");
  }

  const existingDraft = await getDraftPlanForProfile(athleteProfileId);
  if (existingDraft) {
    throw new Error("Ya existe un borrador en progreso. Termínalo o elimínalo antes de editar el plan activo.");
  }

  await db.update(workoutPlan).set({ status: "draft", activatedAt: null }).where(eq(workoutPlan.id, active.plan.id));
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
