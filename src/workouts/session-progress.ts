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

export function getSuggestedTemplateId(
  templateIdsInOrder: string[],
  statusByTemplateId: Map<string, SessionStatus>,
): string | null {
  for (const templateId of templateIdsInOrder) {
    if (statusByTemplateId.get(templateId) !== "completed") {
      return templateId;
    }
  }
  return null;
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

export type EntrenarWeek = {
  weekNumber: number;
  sessions: EntrenarSessionItem[];
};

export function buildEntrenarWeeks(
  activePlan: ActivePlanWithSessions,
  workoutSessions: WorkoutSession[],
): EntrenarWeek[] {
  const latestByTemplateId = getLatestSessionByTemplateId(workoutSessions);
  const templateIdsInOrder = activePlan.sessions.map((session) => session.template.id);
  const statusByTemplateId = new Map(
    templateIdsInOrder.map(
      (templateId) => [templateId, getSessionStatus(latestByTemplateId.get(templateId))] as const,
    ),
  );
  const suggestedTemplateId = getSuggestedTemplateId(templateIdsInOrder, statusByTemplateId);
  const weekNumbers = [...new Set(activePlan.sessions.map((session) => session.template.weekNumber))].sort(
    (a, b) => a - b,
  );

  return weekNumbers.map((weekNumber) => ({
    weekNumber,
    sessions: activePlan.sessions
      .filter((session) => session.template.weekNumber === weekNumber)
      .sort((a, b) => a.template.dayIndex - b.template.dayIndex)
      .map((session): EntrenarSessionItem => {
        const templateId = session.template.id;
        const status = statusByTemplateId.get(templateId) ?? "not_started";
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
      }),
  }));
}
