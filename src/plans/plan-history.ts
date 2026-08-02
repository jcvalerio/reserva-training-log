import type { WorkoutPlan } from "./plan-repository";

export type PlanHistoryRow = {
  plan: WorkoutPlan;
  sessionCount: number;
};

export const PLAN_STATUS_LABEL_ES: Record<WorkoutPlan["status"], string> = {
  active: "Activo",
  draft: "Borrador",
  completed: "Completado",
  archived: "Archivado",
};

export const PLAN_STATUS_PILL_CLASS: Record<WorkoutPlan["status"], string> = {
  active: "bg-emerald-300/10 text-emerald-300",
  draft: "bg-sky-300/10 text-sky-200",
  completed: "bg-zinc-800 text-zinc-400",
  archived: "bg-zinc-800 text-zinc-400",
};

const STATUS_PRIORITY: Record<WorkoutPlan["status"], number> = {
  active: 0,
  draft: 1,
  completed: 2,
  archived: 3,
};

/**
 * Orders "Tus planes" so what's live/actionable reads first (there's at
 * most one active and one draft at a time), then archived/completed plans
 * newest-first — a plain chronological list would bury the active plan
 * under however many old ones exist.
 */
export function sortPlanHistoryRows(rows: PlanHistoryRow[]): PlanHistoryRow[] {
  return [...rows].sort((a, b) => {
    const statusDiff = STATUS_PRIORITY[a.plan.status] - STATUS_PRIORITY[b.plan.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return b.plan.createdAt.getTime() - a.plan.createdAt.getTime();
  });
}
