import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/db";
import { exerciseLog, exercisePrescription, planSessionTemplate, setLog, workoutSession } from "@/db/schema";
import type { ExercisePrescription, PlanSessionTemplate } from "@/plans/plan-repository";

import { buildSubstituteChoices, groupSubstitutes, selectVisibleExercises } from "./exercise-substitution";
import { renumberSets } from "./set-editing";

export type WorkoutSession = typeof workoutSession.$inferSelect;
export type ExerciseLog = typeof exerciseLog.$inferSelect;
export type SetLog = typeof setLog.$inferSelect;

export type StrengthSetLog = SetLog & { actualWeightKg: string; actualReps: number; rir: number };

/**
 * Narrows a SetLog to its strength-type shape (non-null weight/reps/RIR).
 * Callers must only pass sets already known to be strength-type — e.g. from
 * a query filtered to prescriptionType='strength', or a
 * PreviousExercisePerformance already narrowed to the "strength" branch —
 * this throws rather than silently defaulting nulls to 0, which would
 * quietly corrupt volume-load/progression math instead of surfacing a bug.
 */
export function toStrengthSetLog(set: SetLog): StrengthSetLog {
  if (set.actualWeightKg === null || set.actualReps === null || set.rir === null) {
    throw new Error("Expected a strength-type set (weight/reps/RIR), got a set with missing values.");
  }
  return set as StrengthSetLog;
}

export type PreviousExercisePerformance =
  | {
      sessionId: string;
      prescriptionType: "strength";
      targetRepMax: number;
      targetSets: number;
      isUnilateral: boolean;
      sets: SetLog[];
    }
  | {
      sessionId: string;
      prescriptionType: "duration";
      targetSets: number;
      isUnilateral: boolean;
      sets: SetLog[];
    };

export type ExerciseWithLoggedSets = ExercisePrescription & {
  loggedSets: SetLog[];
  previousPerformance: PreviousExercisePerformance | null;
};

export type SubstituteChoice = { exerciseNameEs: string };

export type SessionRunDetails = {
  template: PlanSessionTemplate;
  exercises: ExerciseWithLoggedSets[];
  /**
   * Alternatives already created for an exercise, keyed by that exercise's id
   * — offered as one-tap swaps so a recurring broken machine doesn't mean
   * retyping the replacement every session.
   */
  substitutesByExerciseId: Record<string, SubstituteChoice[]>;
  /** Every distinct exercise in the athlete's plan, as swap targets. */
  planSubstituteChoices: SubstituteChoice[];
};

export async function getWorkoutSessionsForProfile(athleteProfileId: string): Promise<WorkoutSession[]> {
  return db.select().from(workoutSession).where(eq(workoutSession.athleteProfileId, athleteProfileId));
}

export async function getWorkoutSessionForProfile(
  workoutSessionId: string,
  athleteProfileId: string,
): Promise<WorkoutSession | null> {
  const [row] = await db
    .select()
    .from(workoutSession)
    .where(and(eq(workoutSession.id, workoutSessionId), eq(workoutSession.athleteProfileId, athleteProfileId)));

  return row ?? null;
}

export async function startOrResumeWorkoutSession(
  athleteProfileId: string,
  workoutPlanId: string,
  planSessionTemplateId: string,
): Promise<WorkoutSession> {
  const [existingActive] = await db
    .select()
    .from(workoutSession)
    .where(
      and(
        eq(workoutSession.athleteProfileId, athleteProfileId),
        eq(workoutSession.planSessionTemplateId, planSessionTemplateId),
        eq(workoutSession.status, "active"),
      ),
    );

  if (existingActive) {
    return existingActive;
  }

  const [created] = await db
    .insert(workoutSession)
    .values({
      id: randomUUID(),
      athleteProfileId,
      workoutPlanId,
      planSessionTemplateId,
      status: "active",
      startedAt: new Date(),
    })
    .returning();

  if (!created) {
    throw new Error("No se pudo iniciar la sesión.");
  }

  return created;
}

export async function getSessionRunDetails(session: WorkoutSession): Promise<SessionRunDetails> {
  const [template] = await db
    .select()
    .from(planSessionTemplate)
    .where(eq(planSessionTemplate.id, session.planSessionTemplateId));

  if (!template) {
    throw new Error("No se encontró la sesión planificada.");
  }

  const exercises = await db
    .select()
    .from(exercisePrescription)
    .where(eq(exercisePrescription.planSessionTemplateId, template.id))
    .orderBy(asc(exercisePrescription.orderIndex));

  const logs = await db.select().from(exerciseLog).where(eq(exerciseLog.workoutSessionId, session.id));
  const logIdByPrescriptionId = new Map(logs.map((log) => [log.exercisePrescriptionId, log.id]));

  const logIds = logs.map((log) => log.id);
  const sets = logIds.length
    ? await db.select().from(setLog).where(inArray(setLog.exerciseLogId, logIds)).orderBy(asc(setLog.setNumber))
    : [];

  const setsByLogId = new Map<string, SetLog[]>();
  for (const set of sets) {
    const bucket = setsByLogId.get(set.exerciseLogId);
    if (bucket) {
      bucket.push(set);
    } else {
      setsByLogId.set(set.exerciseLogId, [set]);
    }
  }

  // A substitute is a real prescription in this template, so without filtering
  // the day would visibly grow by one exercise for every swap ever made.
  // Alternatives join the running order only once chosen in *this* session,
  // which the exerciseLog row records — choosing one has to put it on screen
  // before any set exists to log against it.
  const visibleExercises = selectVisibleExercises(exercises, (exercise) =>
    logIdByPrescriptionId.has(exercise.id),
  );

  const exercisesWithLoggedSets = await Promise.all(
    visibleExercises.map(async (exercise) => {
      const logId = logIdByPrescriptionId.get(exercise.id);
      const previousPerformance = await getPreviousExercisePerformance(
        session.athleteProfileId,
        exercise.exerciseNameEs,
        session.id,
      );
      return {
        ...exercise,
        loggedSets: logId ? (setsByLogId.get(logId) ?? []) : [],
        previousPerformance,
      };
    }),
  );

  const substituteGroups = groupSubstitutes(exercises);
  const substitutesByExerciseId: Record<string, SubstituteChoice[]> = {};
  for (const [originalId, substitutes] of substituteGroups) {
    substitutesByExerciseId[originalId] = substitutes.map((row) => ({ exerciseNameEs: row.exerciseNameEs }));
  }

  const planExercises = await db
    .select({ exerciseNameEs: exercisePrescription.exerciseNameEs })
    .from(exercisePrescription)
    .innerJoin(planSessionTemplate, eq(planSessionTemplate.id, exercisePrescription.planSessionTemplateId))
    .where(eq(planSessionTemplate.workoutPlanId, session.workoutPlanId));

  return {
    template,
    exercises: exercisesWithLoggedSets,
    substitutesByExerciseId,
    planSubstituteChoices: buildSubstituteChoices(planExercises, []),
  };
}

export async function getPreviousExercisePerformance(
  athleteProfileId: string,
  exerciseNameEs: string,
  excludeWorkoutSessionId: string,
): Promise<PreviousExercisePerformance | null> {
  const [mostRecent] = await db
    .select({
      exerciseLogId: exerciseLog.id,
      workoutSessionId: exerciseLog.workoutSessionId,
      prescriptionType: exercisePrescription.prescriptionType,
      targetRepMax: exercisePrescription.targetRepMax,
      targetSets: exercisePrescription.targetSets,
      isUnilateral: exercisePrescription.isUnilateral,
    })
    .from(exerciseLog)
    .innerJoin(exercisePrescription, eq(exerciseLog.exercisePrescriptionId, exercisePrescription.id))
    .innerJoin(workoutSession, eq(exerciseLog.workoutSessionId, workoutSession.id))
    .where(
      and(
        eq(workoutSession.athleteProfileId, athleteProfileId),
        eq(exercisePrescription.exerciseNameEs, exerciseNameEs),
        ne(exerciseLog.workoutSessionId, excludeWorkoutSessionId),
      ),
    )
    .orderBy(desc(workoutSession.startedAt))
    .limit(1);

  if (!mostRecent) {
    return null;
  }

  const sets = await db
    .select()
    .from(setLog)
    .where(eq(setLog.exerciseLogId, mostRecent.exerciseLogId))
    .orderBy(asc(setLog.setNumber));

  if (sets.length === 0) {
    return null;
  }

  if (mostRecent.prescriptionType === "duration") {
    return {
      sessionId: mostRecent.workoutSessionId,
      prescriptionType: "duration",
      targetSets: mostRecent.targetSets,
      isUnilateral: mostRecent.isUnilateral,
      sets,
    };
  }

  if (mostRecent.targetRepMax === null) {
    // Shouldn't happen — a strength-type prescription always has a rep
    // range — but the DB column is nullable, so guard rather than assert.
    return null;
  }

  return {
    sessionId: mostRecent.workoutSessionId,
    prescriptionType: "strength",
    targetRepMax: mostRecent.targetRepMax,
    targetSets: mostRecent.targetSets,
    isUnilateral: mostRecent.isUnilateral,
    sets,
  };
}

/**
 * The per-set values themselves, without any pointer to where the set lives.
 * Shared by the create and the correct-in-place paths so both accept exactly
 * the same shape — an edit is never allowed to set a value a fresh log
 * couldn't. Kept as the base type rather than an Omit<SaveSetInput, ...>,
 * which would collapse the strength/duration discriminated union.
 */
export type UpdateSetInput = {
  side: "bilateral" | "left" | "right";
  painScore: number;
  notes: string | null;
} & (
  | { prescriptionType: "strength"; actualWeightKg: string; actualReps: number; rir: number }
  | { prescriptionType: "duration"; actualDurationSeconds: number }
);

export type SaveSetInput = {
  workoutSessionId: string;
  exercisePrescriptionId: string;
} & UpdateSetInput;

export async function saveSetForSession(input: SaveSetInput): Promise<{ setNumber: number }> {
  const exerciseLogId = await ensureExerciseLog(input.workoutSessionId, input.exercisePrescriptionId);

  const existingSets = await db.select().from(setLog).where(eq(setLog.exerciseLogId, exerciseLogId));
  const setNumber = existingSets.length + 1;

  await db.insert(setLog).values({
    id: randomUUID(),
    exerciseLogId,
    setNumber,
    side: input.side,
    actualWeightKg: input.prescriptionType === "strength" ? input.actualWeightKg : null,
    actualReps: input.prescriptionType === "strength" ? input.actualReps : null,
    rir: input.prescriptionType === "strength" ? input.rir : null,
    actualDurationSeconds: input.prescriptionType === "duration" ? input.actualDurationSeconds : null,
    painScore: input.painScore,
    notes: input.notes,
  });

  return { setNumber };
}

/**
 * Resolves a set to its owning exercise log, but only if the whole chain
 * (setLog -> exerciseLog -> workoutSession) belongs to this athlete — the
 * same ownership-scoping shape updateExercisePrescriptionTargetSets uses,
 * so a set id from another account can't be edited or deleted by guessing.
 */
async function findOwnedSet(
  athleteProfileId: string,
  setLogId: string,
): Promise<{ exerciseLogId: string } | null> {
  const [owned] = await db
    .select({ exerciseLogId: setLog.exerciseLogId })
    .from(setLog)
    .innerJoin(exerciseLog, eq(exerciseLog.id, setLog.exerciseLogId))
    .innerJoin(workoutSession, eq(workoutSession.id, exerciseLog.workoutSessionId))
    .where(and(eq(setLog.id, setLogId), eq(workoutSession.athleteProfileId, athleteProfileId)));

  return owned ?? null;
}

/**
 * Corrects an already-logged set in place. Deliberately keeps setNumber and
 * exerciseLogId untouched — this fixes wrong *values*, never which exercise a
 * set belongs to (that's a delete-and-relog, see deleteSetForSession).
 *
 * Stamps updatedAt so the UI can mark the set as corrected; every other write
 * path leaves it null. See the schema comment on setLog.updatedAt for why
 * that visibility matters for painScore specifically.
 *
 * Returns false when the set isn't this athlete's.
 */
export async function updateSetForSession(
  athleteProfileId: string,
  setLogId: string,
  input: UpdateSetInput,
): Promise<boolean> {
  const owned = await findOwnedSet(athleteProfileId, setLogId);
  if (!owned) {
    return false;
  }

  await db
    .update(setLog)
    .set({
      side: input.side,
      actualWeightKg: input.prescriptionType === "strength" ? input.actualWeightKg : null,
      actualReps: input.prescriptionType === "strength" ? input.actualReps : null,
      rir: input.prescriptionType === "strength" ? input.rir : null,
      actualDurationSeconds: input.prescriptionType === "duration" ? input.actualDurationSeconds : null,
      painScore: input.painScore,
      notes: input.notes,
      updatedAt: new Date(),
    })
    .where(eq(setLog.id, setLogId));

  return true;
}

/**
 * Deletes a logged set, then closes the numbering gap it leaves behind.
 *
 * The renumbering isn't cosmetic: saveSetForSession derives the next set
 * number from `existingSets.length + 1`, so leaving a gap would make the next
 * saved set collide with an existing one (nothing constrains
 * (exerciseLogId, setNumber)). See renumberSets for the full reasoning.
 *
 * Returns false when the set isn't this athlete's.
 */
export async function deleteSetForSession(athleteProfileId: string, setLogId: string): Promise<boolean> {
  const owned = await findOwnedSet(athleteProfileId, setLogId);
  if (!owned) {
    return false;
  }

  await db.delete(setLog).where(eq(setLog.id, setLogId));

  const remaining = await db
    .select({ id: setLog.id, setNumber: setLog.setNumber })
    .from(setLog)
    .where(eq(setLog.exerciseLogId, owned.exerciseLogId))
    .orderBy(asc(setLog.setNumber));

  for (const change of renumberSets(remaining)) {
    await db.update(setLog).set({ setNumber: change.setNumber }).where(eq(setLog.id, change.id));
  }

  return true;
}

/**
 * Records that an exercise is part of this session without logging a set yet
 * — used when swapping to a substitute, which has to appear in the running
 * order before you can log the first set against it (see
 * selectVisibleExercises).
 */
export async function markExerciseChosenForSession(
  workoutSessionId: string,
  exercisePrescriptionId: string,
): Promise<void> {
  await ensureExerciseLog(workoutSessionId, exercisePrescriptionId);
}

async function ensureExerciseLog(workoutSessionId: string, exercisePrescriptionId: string): Promise<string> {
  const [existing] = await db
    .select()
    .from(exerciseLog)
    .where(
      and(
        eq(exerciseLog.workoutSessionId, workoutSessionId),
        eq(exerciseLog.exercisePrescriptionId, exercisePrescriptionId),
      ),
    );

  if (existing) {
    return existing.id;
  }

  const [inserted] = await db
    .insert(exerciseLog)
    .values({ id: randomUUID(), workoutSessionId, exercisePrescriptionId })
    .onConflictDoNothing({ target: [exerciseLog.workoutSessionId, exerciseLog.exercisePrescriptionId] })
    .returning();

  if (inserted) {
    return inserted.id;
  }

  // Lost the create race to a concurrent request; the row now exists.
  const [raceWinner] = await db
    .select()
    .from(exerciseLog)
    .where(
      and(
        eq(exerciseLog.workoutSessionId, workoutSessionId),
        eq(exerciseLog.exercisePrescriptionId, exercisePrescriptionId),
      ),
    );

  if (!raceWinner) {
    throw new Error("No se pudo registrar el ejercicio de la sesión.");
  }

  return raceWinner.id;
}

export async function completeWorkoutSession(
  workoutSessionId: string,
  input: { notes: string | null; sessionRpe: number | null },
): Promise<void> {
  await db
    .update(workoutSession)
    .set({ status: "completed", completedAt: new Date(), notes: input.notes, sessionRpe: input.sessionRpe })
    .where(eq(workoutSession.id, workoutSessionId));
}

export type CompletedSessionSummary = {
  session: WorkoutSession;
  template: PlanSessionTemplate;
};

export async function getCompletedWorkoutSessionsForProfile(
  athleteProfileId: string,
): Promise<CompletedSessionSummary[]> {
  return db
    .select({ session: workoutSession, template: planSessionTemplate })
    .from(workoutSession)
    .innerJoin(planSessionTemplate, eq(workoutSession.planSessionTemplateId, planSessionTemplate.id))
    .where(and(eq(workoutSession.athleteProfileId, athleteProfileId), eq(workoutSession.status, "completed")))
    .orderBy(desc(workoutSession.completedAt));
}

export type ExerciseInstance = {
  exerciseNameEs: string;
  sessionId: string;
  completedAt: Date | null;
  isUnilateral: boolean;
  sets: SetLog[];
};

/**
 * Returns, per distinct exercise name, the N most recent completed instances
 * (most recent first) across the athlete's whole history — used to compute
 * session-over-session improvement on /progreso.
 */
export async function getRecentExerciseInstancesByName(
  athleteProfileId: string,
  instancesPerExercise = 2,
): Promise<Map<string, ExerciseInstance[]>> {
  const rows = await db
    .select({
      exerciseLogId: exerciseLog.id,
      exerciseNameEs: exercisePrescription.exerciseNameEs,
      sessionId: workoutSession.id,
      completedAt: workoutSession.completedAt,
      isUnilateral: exercisePrescription.isUnilateral,
    })
    .from(exerciseLog)
    .innerJoin(exercisePrescription, eq(exerciseLog.exercisePrescriptionId, exercisePrescription.id))
    .innerJoin(workoutSession, eq(exerciseLog.workoutSessionId, workoutSession.id))
    .where(
      and(
        eq(workoutSession.athleteProfileId, athleteProfileId),
        eq(workoutSession.status, "completed"),
        // Duration-type instances have null weight/reps, which would
        // silently corrupt the volume-load and pain-improvement signals
        // below (e.g. a maintained-workload gate becoming vacuously true at
        // 0 >= 0) — excluded at the query boundary rather than downstream.
        eq(exercisePrescription.prescriptionType, "strength"),
      ),
    )
    .orderBy(desc(workoutSession.completedAt));

  const rowsByExerciseName = new Map<string, typeof rows>();
  for (const row of rows) {
    const bucket = rowsByExerciseName.get(row.exerciseNameEs);
    if (bucket) {
      bucket.push(row);
    } else {
      rowsByExerciseName.set(row.exerciseNameEs, [row]);
    }
  }

  const recentRows = [...rowsByExerciseName.values()].flatMap((group) => group.slice(0, instancesPerExercise));
  const exerciseLogIds = recentRows.map((row) => row.exerciseLogId);

  const sets = exerciseLogIds.length
    ? await db
        .select()
        .from(setLog)
        .where(inArray(setLog.exerciseLogId, exerciseLogIds))
        .orderBy(asc(setLog.setNumber))
    : [];

  const setsByLogId = new Map<string, SetLog[]>();
  for (const set of sets) {
    const bucket = setsByLogId.get(set.exerciseLogId);
    if (bucket) {
      bucket.push(set);
    } else {
      setsByLogId.set(set.exerciseLogId, [set]);
    }
  }

  const instancesByExerciseName = new Map<string, ExerciseInstance[]>();
  for (const [exerciseNameEs, group] of rowsByExerciseName) {
    instancesByExerciseName.set(
      exerciseNameEs,
      group.slice(0, instancesPerExercise).map((row) => ({
        exerciseNameEs,
        sessionId: row.sessionId,
        completedAt: row.completedAt,
        isUnilateral: row.isUnilateral,
        sets: setsByLogId.get(row.exerciseLogId) ?? [],
      })),
    );
  }

  return instancesByExerciseName;
}
