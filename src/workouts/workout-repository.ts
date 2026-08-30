import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, gte, inArray, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { exercise, exerciseLog, exercisePrescription, planSessionTemplate, setLog, workoutSession } from "@/db/schema";
import {
  findCatalogEntryByName,
  type JointLoad,
  type MuscleGroup,
  type PainLocation,
} from "@/training/muscle-taxonomy";
import type { ExercisePrescription, PlanSessionTemplate } from "@/plans/plan-repository";

import { buildSubstituteChoices, groupSubstitutes, selectVisibleExercises } from "./exercise-substitution";
import { renumberSets } from "./set-editing";

// Self-join so a substitute can show the exercise it stands in for. A
// substitute keeps its own entry and its own muscle group on /progreso — the
// real data has a calf raise replacing an incline press, so rolling it up
// under the original would file calf work under pecho.
const originalPrescription = alias(exercisePrescription, "original_prescription");

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
export function isStrengthSetLog(set: SetLog): set is StrengthSetLog {
  return set.actualWeightKg !== null && set.actualReps !== null && set.rir !== null;
}

export function toStrengthSetLog(set: SetLog): StrengthSetLog {
  if (!isStrengthSetLog(set)) {
    throw new Error("Expected a strength-type set (weight/reps/RIR), got a set with missing values.");
  }
  return set;
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

  if (!sets.every(isStrengthSetLog)) {
    // The prescription says "strength", but at least one logged set has no
    // weight/reps/RIR. `saveSet` writes those columns null for duration-type
    // sets, so this is a set logged under a duration prescription that later
    // read as strength — a mid-session substitution, or a prescription whose
    // type changed after the fact.
    //
    // Claiming the "strength" branch here is what took down a whole workout
    // in production: `buildProgressionSuggestion` maps `toStrengthSetLog`
    // over these sets, `session-runner.tsx` is a client component, so the
    // throw happened during React render and blanked the page rather than
    // failing one card.
    //
    // Returning null means "no usable previous performance", a state the UI
    // already renders normally — the exercise simply shows no suggestion.
    // Deliberately not filtering the bad sets out instead: `targetSets`
    // completion in `buildProgressionSuggestion` counts `sets.length`, so a
    // filtered list would silently report an incomplete session as complete
    // and suggest a load increase off it. Partial data is worse than none
    // when the output is how much weight someone puts on a bar.
    //
    // `toStrengthSetLog` keeps throwing on purpose. It is the assertion that
    // catches genuine programming errors; this guard just stops us handing
    // it data we already know it will reject.
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
 * Every strength-type set from every completed instance of the given
 * exercise names, across the athlete's whole history except the given
 * session — the raw material for a personal-record check (see
 * session-recap.ts's findPersonalRecords). Unlike
 * getRecentExerciseInstancesByName, this is not capped per exercise: a
 * record has to beat every prior instance, not just the last one or two.
 */
export async function getPriorStrengthInstancesForNames(
  athleteProfileId: string,
  exerciseNamesEs: string[],
  excludeSessionId: string,
): Promise<Map<string, SetLog[][]>> {
  if (exerciseNamesEs.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({ exerciseLogId: exerciseLog.id, exerciseNameEs: exercisePrescription.exerciseNameEs })
    .from(exerciseLog)
    .innerJoin(exercisePrescription, eq(exerciseLog.exercisePrescriptionId, exercisePrescription.id))
    .innerJoin(workoutSession, eq(exerciseLog.workoutSessionId, workoutSession.id))
    .where(
      and(
        eq(workoutSession.athleteProfileId, athleteProfileId),
        eq(workoutSession.status, "completed"),
        eq(exercisePrescription.prescriptionType, "strength"),
        inArray(exercisePrescription.exerciseNameEs, exerciseNamesEs),
        ne(workoutSession.id, excludeSessionId),
      ),
    );

  const exerciseLogIds = rows.map((row) => row.exerciseLogId);
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

  const instancesByName = new Map<string, SetLog[][]>();
  for (const row of rows) {
    const instanceSets = setsByLogId.get(row.exerciseLogId);
    if (!instanceSets || instanceSets.length === 0) {
      continue;
    }
    const bucket = instancesByName.get(row.exerciseNameEs);
    if (bucket) {
      bucket.push(instanceSets);
    } else {
      instancesByName.set(row.exerciseNameEs, [instanceSets]);
    }
  }

  return instancesByName;
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
  painLocation: PainLocation | null;
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
    painLocation: input.painScore > 0 ? input.painLocation : null,
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
      // Cleared when a correction drops the pain back to 0 — a pain-free set
      // must not keep a stale location that the report would still count.
      painLocation: input.painScore > 0 ? input.painLocation : null,
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

/**
 * Un-completes a session so logging can continue in it.
 *
 * Exists because completion was, until now, a one-way door: completeWorkoutSession
 * flips status to "completed", and startOrResumeWorkoutSession only ever resumes a
 * session whose status is "active" — so an accidental completion stranded the sets
 * already logged and forced a second, empty session for the same workout. That is
 * not merely annoying: both rows count as completed sessions, so one workout reads
 * as two in every /progreso verdict.
 *
 * completedAt MUST be nulled, not just left behind. It is load-bearing — the weekly
 * consistency buckets, the per-exercise series and the improvement/PR comparisons
 * all key off it — so a reopen that keeps it produces a session that is
 * simultaneously in progress and counted in the reports. Both readers already skip
 * a null completedAt, so nulling it removes the session from the reports cleanly.
 */
export async function reopenWorkoutSession(workoutSessionId: string): Promise<void> {
  await db
    .update(workoutSession)
    .set({ status: "active", completedAt: null })
    .where(eq(workoutSession.id, workoutSessionId));
}

/**
 * Guards the reopen above. There is no unique constraint keeping one session
 * active per template (workout_session carries only plain indexes), and
 * startOrResumeWorkoutSession destructures the first row of its lookup with no
 * ORDER BY — so two active rows for one template mean subsequent sets land on
 * whichever one the planner happens to return. Reachable in practice: complete by
 * accident, tap "Empezar de nuevo", then reopen the original.
 *
 * Refusing is deliberate rather than adding the partial unique index here. The
 * index is the right long-term fix, but it is a migration that would fail on any
 * production data that already has duplicates, so it needs a check against real
 * data first.
 */
export async function hasOtherActiveSessionForTemplate(
  athleteProfileId: string,
  planSessionTemplateId: string,
  excludeSessionId: string,
): Promise<boolean> {
  const [other] = await db
    .select({ id: workoutSession.id })
    .from(workoutSession)
    .where(
      and(
        eq(workoutSession.athleteProfileId, athleteProfileId),
        eq(workoutSession.planSessionTemplateId, planSessionTemplateId),
        eq(workoutSession.status, "active"),
        ne(workoutSession.id, excludeSessionId),
      ),
    );

  return other !== undefined;
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

export type LoggedVolumeInstance = {
  exerciseNameEs: string;
  completedAt: Date | null;
  phase: "warmup" | "main" | "accessory" | "mobility";
  prescriptionType: "strength" | "duration";
  isUnilateral: boolean;
  primaryMuscleGroup: MuscleGroup | null;
  secondaryMuscleGroups: MuscleGroup[];
  jointLoads: JointLoad[];
  isClassified: boolean;
  sets: SetLog[];
};

/**
 * Every logged instance in a time window, classified, for the weekly
 * muscle-volume report.
 *
 * A sibling of getRecentExerciseInstancesByName rather than an extension of
 * it: that one caps at N instances per exercise name (which would truncate a
 * week's volume) and has no time window, and adding one would change the
 * per-name-cap semantics buildExerciseImprovements depends on.
 *
 * Deliberately does NOT filter prescriptionType or phase in SQL — those rules
 * live in muscle-volume.ts where they are testable, and one of them is
 * subtle enough to warrant it (mobility-phase strength work counts; see
 * countsTowardVolume).
 *
 * Classification resolves the catalog link first and falls back to matching
 * the free-text name, which is what makes this work for plans that were never
 * touched by the backfill migrations.
 */
export async function getLoggedVolumeInstancesSince(
  athleteProfileId: string,
  since: Date,
): Promise<LoggedVolumeInstance[]> {
  const rows = await db
    .select({
      exerciseLogId: exerciseLog.id,
      exerciseNameEs: exercisePrescription.exerciseNameEs,
      completedAt: workoutSession.completedAt,
      phase: exercisePrescription.phase,
      prescriptionType: exercisePrescription.prescriptionType,
      isUnilateral: exercisePrescription.isUnilateral,
      exerciseId: exercisePrescription.exerciseId,
      primaryMuscleGroup: exercise.primaryMuscleGroup,
      secondaryMuscleGroups: exercise.secondaryMuscleGroups,
      jointStressTags: exercise.jointStressTags,
    })
    .from(exerciseLog)
    .innerJoin(exercisePrescription, eq(exerciseLog.exercisePrescriptionId, exercisePrescription.id))
    .innerJoin(workoutSession, eq(exerciseLog.workoutSessionId, workoutSession.id))
    .leftJoin(exercise, eq(exercisePrescription.exerciseId, exercise.id))
    .where(
      and(
        eq(workoutSession.athleteProfileId, athleteProfileId),
        eq(workoutSession.status, "completed"),
        gte(workoutSession.completedAt, since),
      ),
    )
    .orderBy(desc(workoutSession.completedAt));

  const exerciseLogIds = rows.map((row) => row.exerciseLogId);
  const sets = exerciseLogIds.length
    ? await db
        .select()
        .from(setLog)
        .where(inArray(setLog.exerciseLogId, exerciseLogIds))
        .orderBy(asc(setLog.setNumber))
    : [];

  const setsByExerciseLogId = new Map<string, SetLog[]>();
  for (const set of sets) {
    const bucket = setsByExerciseLogId.get(set.exerciseLogId);
    if (bucket) {
      bucket.push(set);
    } else {
      setsByExerciseLogId.set(set.exerciseLogId, [set]);
    }
  }

  return rows.map((row) => {
    const fallback = row.exerciseId ? null : findCatalogEntryByName(row.exerciseNameEs);
    const isClassified = Boolean(row.exerciseId) || fallback !== null;
    return {
      exerciseNameEs: row.exerciseNameEs,
      completedAt: row.completedAt,
      phase: row.phase,
      prescriptionType: row.prescriptionType,
      isUnilateral: row.isUnilateral,
      primaryMuscleGroup: row.primaryMuscleGroup ?? fallback?.primaryMuscleGroup ?? null,
      secondaryMuscleGroups: row.secondaryMuscleGroups ?? fallback?.secondaryMuscleGroups ?? [],
      jointLoads: row.jointStressTags ?? fallback?.jointLoads ?? [],
      isClassified,
      sets: setsByExerciseLogId.get(row.exerciseLogId) ?? [],
    };
  });
}

export type ExerciseInstance = {
  exerciseNameEs: string;
  sessionId: string;
  completedAt: Date | null;
  isUnilateral: boolean;
  /** Resolved via the catalog link, falling back to the free-text name. */
  primaryMuscleGroup: MuscleGroup | null;
  isClassified: boolean;
  /** Non-null only when this exercise was logged as a substitute. */
  substitutedForNameEs: string | null;
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
      exerciseId: exercisePrescription.exerciseId,
      primaryMuscleGroup: exercise.primaryMuscleGroup,
      substitutedForNameEs: originalPrescription.exerciseNameEs,
    })
    .from(exerciseLog)
    .innerJoin(exercisePrescription, eq(exerciseLog.exercisePrescriptionId, exercisePrescription.id))
    .innerJoin(workoutSession, eq(exerciseLog.workoutSessionId, workoutSession.id))
    .leftJoin(exercise, eq(exercisePrescription.exerciseId, exercise.id))
    .leftJoin(
      originalPrescription,
      eq(exercisePrescription.substitutedForPrescriptionId, originalPrescription.id),
    )
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
      group.slice(0, instancesPerExercise).map((row) => {
        const fallback = row.exerciseId ? null : findCatalogEntryByName(row.exerciseNameEs);
        return {
          exerciseNameEs,
          sessionId: row.sessionId,
          completedAt: row.completedAt,
          isUnilateral: row.isUnilateral,
          primaryMuscleGroup: row.primaryMuscleGroup ?? fallback?.primaryMuscleGroup ?? null,
          isClassified: Boolean(row.exerciseId) || fallback !== null,
          substitutedForNameEs: row.substitutedForNameEs,
          sets: setsByLogId.get(row.exerciseLogId) ?? [],
        };
      }),
    );
  }

  return instancesByExerciseName;
}
