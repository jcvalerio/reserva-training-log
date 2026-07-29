import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/db";
import { exerciseLog, exercisePrescription, planSessionTemplate, setLog, workoutSession } from "@/db/schema";
import type { ExercisePrescription, PlanSessionTemplate } from "@/plans/plan-repository";

export type WorkoutSession = typeof workoutSession.$inferSelect;
export type ExerciseLog = typeof exerciseLog.$inferSelect;
export type SetLog = typeof setLog.$inferSelect;

export type PreviousExercisePerformance = {
  sessionId: string;
  targetRepMax: number;
  targetSets: number;
  sets: SetLog[];
};

export type ExerciseWithLoggedSets = ExercisePrescription & {
  loggedSets: SetLog[];
  previousPerformance: PreviousExercisePerformance | null;
};

export type SessionRunDetails = {
  template: PlanSessionTemplate;
  exercises: ExerciseWithLoggedSets[];
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

  const exercisesWithLoggedSets = await Promise.all(
    exercises.map(async (exercise) => {
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

  return { template, exercises: exercisesWithLoggedSets };
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
      targetRepMax: exercisePrescription.targetRepMax,
      targetSets: exercisePrescription.targetSets,
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

  return {
    sessionId: mostRecent.workoutSessionId,
    targetRepMax: mostRecent.targetRepMax,
    targetSets: mostRecent.targetSets,
    sets,
  };
}

export async function saveSetForSession(input: {
  workoutSessionId: string;
  exercisePrescriptionId: string;
  side: "bilateral" | "left" | "right";
  actualWeightKg: string;
  actualReps: number;
  rir: number;
  painScore: number;
  notes: string | null;
}): Promise<{ setNumber: number }> {
  const exerciseLogId = await ensureExerciseLog(input.workoutSessionId, input.exercisePrescriptionId);

  const existingSets = await db.select().from(setLog).where(eq(setLog.exerciseLogId, exerciseLogId));
  const setNumber = existingSets.length + 1;

  await db.insert(setLog).values({
    id: randomUUID(),
    exerciseLogId,
    setNumber,
    side: input.side,
    actualWeightKg: input.actualWeightKg,
    actualReps: input.actualReps,
    rir: input.rir,
    painScore: input.painScore,
    notes: input.notes,
  });

  return { setNumber };
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

export async function completeWorkoutSession(workoutSessionId: string): Promise<void> {
  await db
    .update(workoutSession)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(workoutSession.id, workoutSessionId));
}
