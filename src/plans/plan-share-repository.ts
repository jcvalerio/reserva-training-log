import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { athleteProfile, exercisePrescription, planSessionTemplate, planShareInvite, user, workoutPlan } from "@/db/schema";

import { getDraftPlanForProfile, getDraftPlanSessions, insertClonedPlanSessions } from "./plan-builder-repository";
import type { WorkoutPlan } from "./plan-repository";

export type PlanShareInvite = typeof planShareInvite.$inferSelect;

const SHARE_INVITE_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;

export class PlanShareValidationError extends Error {
  constructor(
    readonly code: "not_found" | "self_share" | "no_account",
    message: string,
  ) {
    super(message);
    this.name = "PlanShareValidationError";
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Backfills sharePlanGroupId (on the plan) and lineageKey (on each of its
 * exercises) the first time a plan is ever shared — idempotent, so
 * re-sharing the same plan (a second Athlete C, a re-sent invite) reuses the
 * same identifiers rather than minting new ones each time.
 */
async function ensureShareLineage(sourcePlan: WorkoutPlan): Promise<string> {
  let groupId = sourcePlan.sharePlanGroupId;
  if (!groupId) {
    groupId = randomUUID();
    await db.update(workoutPlan).set({ sharePlanGroupId: groupId }).where(eq(workoutPlan.id, sourcePlan.id));
  }

  const templates = await db
    .select({ id: planSessionTemplate.id })
    .from(planSessionTemplate)
    .where(eq(planSessionTemplate.workoutPlanId, sourcePlan.id));
  const templateIds = templates.map((template) => template.id);
  if (templateIds.length === 0) {
    return groupId;
  }

  const allExercises = await db
    .select({ id: exercisePrescription.id, lineageKey: exercisePrescription.lineageKey })
    .from(exercisePrescription)
    .where(inArray(exercisePrescription.planSessionTemplateId, templateIds));

  for (const exercise of allExercises) {
    if (!exercise.lineageKey) {
      await db.update(exercisePrescription).set({ lineageKey: randomUUID() }).where(eq(exercisePrescription.id, exercise.id));
    }
  }

  return groupId;
}

export async function createPlanShare(
  athleteProfileId: string,
  sourcePlanId: string,
  recipientEmail: string,
): Promise<PlanShareInvite> {
  const normalizedEmail = normalizeEmail(recipientEmail);

  const [sourcePlan] = await db
    .select()
    .from(workoutPlan)
    .where(and(eq(workoutPlan.id, sourcePlanId), eq(workoutPlan.athleteProfileId, athleteProfileId)));

  if (!sourcePlan) {
    throw new PlanShareValidationError("not_found", "No se encontró el plan a compartir.");
  }

  const [ownerProfile] = await db.select().from(athleteProfile).where(eq(athleteProfile.id, athleteProfileId));
  const [ownerUser] = ownerProfile ? await db.select().from(user).where(eq(user.id, ownerProfile.userId)) : [];
  if (ownerUser && normalizeEmail(ownerUser.email) === normalizedEmail) {
    throw new PlanShareValidationError("self_share", "No puedes compartir un plan contigo mismo.");
  }

  const [recipientUser] = await db.select().from(user).where(eq(user.email, normalizedEmail));
  if (!recipientUser) {
    throw new PlanShareValidationError("no_account", "Ese correo no tiene una cuenta en la app todavía.");
  }

  await ensureShareLineage(sourcePlan);

  const [invite] = await db
    .insert(planShareInvite)
    .values({
      id: randomUUID(),
      sourceWorkoutPlanId: sourcePlan.id,
      createdByAthleteProfileId: athleteProfileId,
      recipientEmail: normalizedEmail,
      code: randomUUID(),
      status: "pending",
      expiresAt: new Date(Date.now() + SHARE_INVITE_EXPIRY_MS),
    })
    .returning();

  if (!invite) {
    throw new Error("No se pudo crear la invitación para compartir el plan.");
  }
  return invite;
}

export type PlanShareInvitePreview = {
  invite: PlanShareInvite;
  sourcePlanNameEs: string;
  ownerNameEs: string;
  dayCount: number;
  exerciseCount: number;
  isExpired: boolean;
};

export async function getPlanShareInvitePreview(code: string): Promise<PlanShareInvitePreview | null> {
  const [invite] = await db.select().from(planShareInvite).where(eq(planShareInvite.code, code));
  if (!invite) {
    return null;
  }

  const [sourcePlan] = await db.select().from(workoutPlan).where(eq(workoutPlan.id, invite.sourceWorkoutPlanId));
  if (!sourcePlan) {
    return null;
  }

  const [ownerProfile] = await db
    .select()
    .from(athleteProfile)
    .where(eq(athleteProfile.id, invite.createdByAthleteProfileId));

  const { sessions } = await getDraftPlanSessions(sourcePlan);
  const week1Sessions = sessions.filter((session) => session.template.weekNumber === 1);

  return {
    invite,
    sourcePlanNameEs: sourcePlan.nameEs,
    ownerNameEs: ownerProfile?.name ?? "otro usuario",
    dayCount: week1Sessions.length,
    exerciseCount: week1Sessions.reduce((total, session) => total + session.exercises.length, 0),
    isExpired: invite.expiresAt.getTime() < Date.now(),
  };
}

export type RedeemPlanShareResult =
  | { status: "redeemed"; draftPlanId: string }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "already_redeemed" }
  | { status: "wrong_account" }
  | { status: "draft_conflict" };

export async function redeemPlanShare(
  code: string,
  recipientUserEmail: string,
  recipientAthleteProfileId: string,
): Promise<RedeemPlanShareResult> {
  const [invite] = await db.select().from(planShareInvite).where(eq(planShareInvite.code, code));
  if (!invite) {
    return { status: "invalid" };
  }
  if (invite.status === "redeemed") {
    return { status: "already_redeemed" };
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return { status: "expired" };
  }
  if (invite.recipientEmail !== normalizeEmail(recipientUserEmail)) {
    return { status: "wrong_account" };
  }

  const existingDraft = await getDraftPlanForProfile(recipientAthleteProfileId);
  if (existingDraft) {
    return { status: "draft_conflict" };
  }

  const [sourcePlan] = await db.select().from(workoutPlan).where(eq(workoutPlan.id, invite.sourceWorkoutPlanId));
  if (!sourcePlan) {
    return { status: "invalid" };
  }

  const { sessions } = await getDraftPlanSessions(sourcePlan);
  const week1Sessions = sessions.filter((session) => session.template.weekNumber === 1);

  const [insertedPlan] = await db
    .insert(workoutPlan)
    .values({
      id: randomUUID(),
      athleteProfileId: recipientAthleteProfileId,
      nameEs: sourcePlan.nameEs,
      nameEn: sourcePlan.nameEn,
      goal: sourcePlan.goal,
      durationWeeks: 1,
      daysPerWeek: sourcePlan.daysPerWeek,
      sessionDurationMinutes: sourcePlan.sessionDurationMinutes,
      locale: sourcePlan.locale,
      safetySummaryEs: sourcePlan.safetySummaryEs,
      status: "draft",
      activatedAt: null,
      sharePlanGroupId: sourcePlan.sharePlanGroupId,
    })
    .returning();

  if (!insertedPlan) {
    throw new Error("Plan share redemption failed unexpectedly");
  }

  await insertClonedPlanSessions(insertedPlan.id, week1Sessions);

  await db
    .update(planShareInvite)
    .set({ status: "redeemed", redeemedByAthleteProfileId: recipientAthleteProfileId, redeemedAt: new Date() })
    .where(eq(planShareInvite.id, invite.id));

  return { status: "redeemed", draftPlanId: insertedPlan.id };
}
