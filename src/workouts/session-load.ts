import type { CompletedSessionSummary } from "./workout-repository";

const RECENT_AVERAGE_WINDOW = 5;

/**
 * Foster's session-RPE training load: RPE (1-10) x session duration in
 * minutes. A simple, well-established autoregulation metric — null when
 * either input is missing (RPE is optional; every session has startedAt/
 * completedAt once finished, but a same-instant edge case would divide by
 * zero, hence the <= 0 guard).
 */
export function computeSessionTrainingLoad(session: CompletedSessionSummary["session"]): number | null {
  if (session.sessionRpe === null || !session.startedAt || !session.completedAt) {
    return null;
  }

  const durationMinutes = (session.completedAt.getTime() - session.startedAt.getTime()) / 60000;
  if (durationMinutes <= 0) {
    return null;
  }

  return Math.round(session.sessionRpe * durationMinutes);
}

/**
 * Average training load across the most recent sessions that have one
 * (skipping sessions with no RPE logged). Expects completedSessions ordered
 * most-recent-first, matching getCompletedWorkoutSessionsForProfile. Returns
 * null when no recent session has a computable load.
 */
export function averageRecentTrainingLoad(completedSessions: CompletedSessionSummary[]): number | null {
  const loads = completedSessions
    .slice(0, RECENT_AVERAGE_WINDOW)
    .map(({ session }) => computeSessionTrainingLoad(session))
    .filter((load): load is number => load !== null);

  if (loads.length === 0) {
    return null;
  }

  return Math.round(loads.reduce((total, load) => total + load, 0) / loads.length);
}
