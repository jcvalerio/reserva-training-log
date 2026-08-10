import { formatShortDateEs } from "@/lib/format";

import type { CompletedSessionSummary } from "./workout-repository";

const WEEKS_BACK_DEFAULT = 8;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type WeeklyConsistency = {
  /** Monday of the week, local calendar date at midnight. */
  weekStartDate: Date;
  /** Distinct calendar days with >=1 completed session that week (not session count). */
  daysTrained: number;
};

export type ConsistencySummary = {
  /** Oldest first, most recent (current, possibly partial) week last. */
  weeks: WeeklyConsistency[];
  targetDaysPerWeek: number;
  currentWeekDaysTrained: number;
};

/**
 * Monday of the given date's week, as a local calendar date at midnight.
 *
 * Exported for muscle-volume.ts rather than duplicated there: the weekly
 * volume chart and the Consistencia semanal chart render on the same screen,
 * and two independent Monday implementations drifting by a day would be a
 * visible, confusing bug.
 */
export function startOfWeek(date: Date): Date {
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = weekStart.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diffToMonday);
  return weekStart;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Buckets completed sessions into Monday-start weeks, counting distinct
 * calendar days trained per week (not session count) — a user who logs two
 * sessions the same day should still count as one day toward
 * athleteProfile.targetTrainingDaysPerWeek, not two.
 */
export function buildConsistencySummary(
  completedSessions: CompletedSessionSummary[],
  targetDaysPerWeek: number,
  weeksBack = WEEKS_BACK_DEFAULT,
  now = new Date(),
): ConsistencySummary {
  const currentWeekStart = startOfWeek(now);
  const weekStarts: Date[] = [];
  for (let i = weeksBack - 1; i >= 0; i -= 1) {
    weekStarts.push(new Date(currentWeekStart.getTime() - i * 7 * MS_PER_DAY));
  }

  const daysTrainedByWeekTime = new Map<number, Set<string>>();
  for (const weekStart of weekStarts) {
    daysTrainedByWeekTime.set(weekStart.getTime(), new Set());
  }

  for (const { session } of completedSessions) {
    if (!session.completedAt) {
      continue;
    }
    const weekStart = startOfWeek(session.completedAt);
    const bucket = daysTrainedByWeekTime.get(weekStart.getTime());
    if (!bucket) {
      continue; // outside the weeksBack window
    }
    bucket.add(dateKey(session.completedAt));
  }

  const weeks: WeeklyConsistency[] = weekStarts.map((weekStartDate) => ({
    weekStartDate,
    daysTrained: daysTrainedByWeekTime.get(weekStartDate.getTime())?.size ?? 0,
  }));

  return {
    weeks,
    targetDaysPerWeek,
    currentWeekDaysTrained: weeks[weeks.length - 1]?.daysTrained ?? 0,
  };
}

export type ConsistencyBar = {
  key: string;
  label: string;
  value: number;
  valueLabel: string;
  met: boolean;
};

/** Shapes a ConsistencySummary into BarChart's generic bar props. */
export function buildConsistencyBars(summary: ConsistencySummary): ConsistencyBar[] {
  return summary.weeks.map((week) => ({
    key: week.weekStartDate.toISOString(),
    label: formatShortDateEs(week.weekStartDate),
    value: week.daysTrained,
    valueLabel: `${week.daysTrained} ${week.daysTrained === 1 ? "día" : "días"}`,
    met: week.daysTrained >= summary.targetDaysPerWeek,
  }));
}
