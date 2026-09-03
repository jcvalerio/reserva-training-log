import type { MuscleGroup } from "@/training/muscle-taxonomy";

import { UNCLASSIFIED_BUCKET, type MuscleVolumeSummary } from "./muscle-volume";

/**
 * Between-session load management: the thing progression was missing.
 *
 * Progression is computed per exercise, session to session, so five exercises
 * hitting the same muscle group can each independently earn a "+5%, go" in one
 * week and no code path notices the aggregate. The risk this manages is not a
 * single heavy session; it is rapid week-over-week escalation.
 *
 * **The threshold is a deliberate heuristic and is not presented as validated.**
 * The IOC consensus repeats a 10-20%-per-week rule of thumb while noting the
 * evidence for specific thresholds is limited; the acute:chronic workload
 * ratio literature treats spikes past ~1.5 as likely risky, and has itself
 * been criticised — no intervention trial has shown that applying ACWR reduces
 * injuries. 1.3 sits between the two, and the cost of being wrong is
 * deliberately asymmetric: a false positive holds load for one session, and
 * this guardrail can only ever WITHHOLD an increase. It never adds load and
 * never forces a reduction.
 */
export const WEEKLY_LOAD_SPIKE_RATIO = 1.3;

/**
 * Completed weeks required before the guardrail may fire at all.
 *
 * Three matches the chronic-load window the ACWR convention uses, and it also
 * keeps the guardrail off someone establishing a baseline: the first weeks of
 * training are all "escalation" against a near-empty history, and vetoing
 * progression there would fight the athlete rather than protect them.
 */
export const WEEKLY_LOAD_MIN_COMPLETED_WEEKS = 3;

export type WeeklyLoadStatus = {
  muscleGroup: MuscleGroup;
  /** Effective sets so far in the in-progress week. */
  currentWeekSets: number;
  /** Mean effective sets per week across completed weeks. */
  trailingAverageSets: number;
  /** currentWeekSets / trailingAverageSets. */
  ratio: number;
  flagged: boolean;
};

export type WeeklyLoadGuardrail = {
  /** Every group with a usable comparison, worst ratio first. */
  statuses: WeeklyLoadStatus[];
  flaggedGroups: MuscleGroup[];
  completedWeeksCounted: number;
  /**
   * False when there is not enough history to judge escalation. Nothing is
   * flagged in that case, and callers should say "not enough history" rather
   * than "all clear" — they are different claims.
   */
  hasEnoughHistory: boolean;
};

/**
 * Compares the in-progress week against the trailing average of completed
 * weeks, per muscle group.
 *
 * Deliberately measured on the week SO FAR rather than on a forecast of the
 * week ahead. What the coming week will contain is unknowable — which sessions
 * an athlete actually completes is a choice they have not made yet — so a
 * prediction would be a guess dressed as a safeguard. Escalation that has
 * already happened is a fact, and it is the thing worth acting on before
 * adding more load on top of it.
 *
 * A consequence worth knowing: early in a week nothing can flag, because
 * little has accumulated. That is correct. The guardrail is about an aggregate,
 * and an aggregate only becomes visible as it accumulates.
 */
export function buildWeeklyLoadGuardrail(summary: MuscleVolumeSummary): WeeklyLoadGuardrail {
  const currentWeekStart = summary.currentWeek.weekStartDate.getTime();
  const completedWeeks = summary.weeks.filter(
    (week) => week.weekStartDate.getTime() !== currentWeekStart,
  );

  const hasEnoughHistory = completedWeeks.length >= WEEKLY_LOAD_MIN_COMPLETED_WEEKS;

  const trailingTotals = new Map<MuscleGroup, number>();
  for (const week of completedWeeks) {
    for (const group of week.byMuscleGroup) {
      // The unclassified bucket is not a muscle, so it gets no guardrail: a
      // ratio over it would veto progression on exercises whose only problem
      // is that the catalog does not recognise their name.
      if (group.muscleGroup === UNCLASSIFIED_BUCKET) {
        continue;
      }
      trailingTotals.set(
        group.muscleGroup,
        (trailingTotals.get(group.muscleGroup) ?? 0) + group.effectiveSets,
      );
    }
  }

  const statuses: WeeklyLoadStatus[] = [];

  for (const group of summary.currentWeek.byMuscleGroup) {
    if (group.muscleGroup === UNCLASSIFIED_BUCKET) {
      continue;
    }

    const trailingTotal = trailingTotals.get(group.muscleGroup) ?? 0;
    const trailingAverageSets =
      completedWeeks.length > 0 ? trailingTotal / completedWeeks.length : 0;

    // No established tolerance to compare against. Deliberately NOT flagged:
    // a group trained for the first time would otherwise have every
    // progression vetoed until a full week passed, which punishes adding an
    // exercise rather than escalating one.
    if (trailingAverageSets <= 0) {
      continue;
    }

    const ratio = group.effectiveSets / trailingAverageSets;

    statuses.push({
      muscleGroup: group.muscleGroup,
      currentWeekSets: group.effectiveSets,
      trailingAverageSets: Math.round(trailingAverageSets * 10) / 10,
      ratio: Math.round(ratio * 100) / 100,
      flagged: hasEnoughHistory && ratio > WEEKLY_LOAD_SPIKE_RATIO,
    });
  }

  statuses.sort((a, b) => b.ratio - a.ratio);

  return {
    statuses,
    flaggedGroups: statuses.filter((status) => status.flagged).map((status) => status.muscleGroup),
    completedWeeksCounted: completedWeeks.length,
    hasEnoughHistory,
  };
}
