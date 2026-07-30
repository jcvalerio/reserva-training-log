import type { ActivePlanWithSessions } from "@/plans/plan-repository";

import type { WorkoutSession } from "./workout-repository";

export type SessionStatus = "not_started" | "in_progress" | "completed";

export function getLatestSessionByTemplateId(sessions: WorkoutSession[]): Map<string, WorkoutSession> {
  const latestByTemplateId = new Map<string, WorkoutSession>();

  for (const session of sessions) {
    const current = latestByTemplateId.get(session.planSessionTemplateId);
    if (!current || isMoreRelevant(session, current)) {
      latestByTemplateId.set(session.planSessionTemplateId, session);
    }
  }

  return latestByTemplateId;
}

function isMoreRelevant(candidate: WorkoutSession, current: WorkoutSession): boolean {
  if (candidate.status === "active" && current.status !== "active") {
    return true;
  }
  if (candidate.status !== "active" && current.status === "active") {
    return false;
  }
  return candidate.createdAt.getTime() > current.createdAt.getTime();
}

export function getSessionStatus(latest: WorkoutSession | undefined): SessionStatus {
  if (!latest) {
    return "not_started";
  }
  if (latest.status === "completed") {
    return "completed";
  }
  if (latest.status === "active") {
    return "in_progress";
  }
  return "not_started";
}

/**
 * A plan repeats indefinitely, so "what's next" is never "nothing, you're
 * done" — it's a rotation. Priority: (1) an unfinished (active) session
 * always wins, so the rotation never skips past abandoned-mid-session work;
 * (2) otherwise, whichever template was trained longest ago (or never)
 * comes up next, which naturally cycles forever with no explicit "cycle"
 * bookkeeping. Ties (including "brand new plan, nothing done yet," where
 * every template ties at "never") break by template order (lowest dayIndex)
 * for determinism.
 */
export function getSuggestedTemplateId(
  templateIdsInOrder: string[],
  latestByTemplateId: Map<string, WorkoutSession>,
): string | null {
  if (templateIdsInOrder.length === 0) {
    return null;
  }

  const inProgress = templateIdsInOrder.find((templateId) => latestByTemplateId.get(templateId)?.status === "active");
  if (inProgress) {
    return inProgress;
  }

  return templateIdsInOrder.reduce((oldestTemplateId, templateId) =>
    recencyKey(latestByTemplateId.get(templateId)) < recencyKey(latestByTemplateId.get(oldestTemplateId))
      ? templateId
      : oldestTemplateId,
  );
}

function recencyKey(session: WorkoutSession | undefined): number {
  if (!session) {
    return -Infinity;
  }
  const timestamp = session.completedAt ?? session.startedAt;
  return timestamp ? timestamp.getTime() : -Infinity;
}

type EntrenarSessionItemBase = {
  templateId: string;
  dayIndex: number;
  nameEs: string;
  focus: string;
  exerciseCount: number;
  isSuggested: boolean;
};

export type EntrenarSessionItem =
  | (EntrenarSessionItemBase & { status: "not_started" })
  | (EntrenarSessionItemBase & { status: "in_progress" | "completed"; sessionId: string });

/**
 * Flat, ordered list of a plan's training days for the /entrenar picker.
 * There's no week grouping — a plan is one routine that repeats
 * indefinitely (weekNumber is a vestigial DB column, always 1 for plans
 * activated under this model). Plans activated under the old 4-week model
 * still work here — the underlying data just has more (duplicate-looking)
 * template rows until the profile activates a plan under the new model.
 */
export function buildEntrenarSessions(
  activePlan: ActivePlanWithSessions,
  workoutSessions: WorkoutSession[],
): EntrenarSessionItem[] {
  const latestByTemplateId = getLatestSessionByTemplateId(workoutSessions);
  const orderedSessions = [...activePlan.sessions].sort((a, b) => a.template.dayIndex - b.template.dayIndex);
  const templateIdsInOrder = orderedSessions.map((session) => session.template.id);
  const suggestedTemplateId = getSuggestedTemplateId(templateIdsInOrder, latestByTemplateId);

  return orderedSessions.map((session): EntrenarSessionItem => {
    const templateId = session.template.id;
    const status = getSessionStatus(latestByTemplateId.get(templateId));
    const shared: EntrenarSessionItemBase = {
      templateId,
      dayIndex: session.template.dayIndex,
      nameEs: session.template.nameEs,
      focus: session.template.focus,
      exerciseCount: session.exercises.length,
      isSuggested: templateId === suggestedTemplateId,
    };

    const latest = latestByTemplateId.get(templateId);
    if (status !== "not_started" && latest) {
      return { ...shared, status, sessionId: latest.id };
    }
    return { ...shared, status: "not_started" };
  });
}
