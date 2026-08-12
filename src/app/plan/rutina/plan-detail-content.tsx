import type { PlanPreviewSummary } from "@/plans/plan-preview";
import type { MuscleGroup } from "@/training/muscle-taxonomy";

import { AppShell } from "../../app-shell";
import { PlanDayPager } from "../plan-day-pager";

export function PlanDetailContent({
  summary,
  muscleGroupsByDayIndex,
}: {
  summary: PlanPreviewSummary;
  /** Omitted (rather than defaulted to an empty map) for callers that haven't
   *  wired real classification yet — PlanDayPager only renders the thumbnail
   *  slot when this is actually passed. */
  muscleGroupsByDayIndex?: ReadonlyMap<number, MuscleGroup[]>;
}) {
  return (
    <AppShell activeHref="/plan" backTo={{ href: "/plan", label: "Tu plan" }}>
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Plan</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{summary.nameEs}</h1>
        </div>
      </header>

      <div className="mt-5 pb-10">
        <PlanDayPager sessions={summary.sessions} muscleGroupsByDayIndex={muscleGroupsByDayIndex} />
      </div>
    </AppShell>
  );
}
