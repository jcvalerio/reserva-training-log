import type { PlanPreviewSummary } from "@/plans/plan-preview";
import type { MuscleGroup } from "@/training/muscle-taxonomy";

import { AppShell } from "../../../app-shell";
import { PlanDayPager } from "../../plan-day-pager";
import { StatusTile } from "../../plan-page-content";
import { SubmitButton } from "../../../submit-button";

export function TemplatePreviewContent({
  templateId,
  objectiveEs,
  summary,
  muscleGroupsByDayIndex,
  activatePlanAction,
}: {
  templateId: string;
  objectiveEs: string;
  summary: PlanPreviewSummary;
  muscleGroupsByDayIndex?: ReadonlyMap<number, MuscleGroup[]>;
  activatePlanAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <AppShell activeHref="/plan" backTo={{ href: "/plan/templates", label: "plantillas" }}>
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Plan · Plantilla</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{summary.nameEs}</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{objectiveEs}</p>
        </div>
      </header>

      <section className="mt-7 rounded-3xl bg-zinc-900 p-4 ring-1 ring-sky-300/30" aria-labelledby="template-preview-title">
        <p id="template-preview-title" className="text-sm font-semibold text-sky-200">
          Vista previa
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Es solo lectura hasta que la actives: no se guarda como borrador.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {summary.previewBoundaryLabelsEs.map((label) => (
            <span
              key={label}
              className="rounded-full bg-sky-300/10 px-2 py-1 text-xs font-semibold text-sky-200 ring-1 ring-sky-300/20"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <StatusTile label="Ejercicios" value={String(summary.exerciseCount)} />
          <StatusTile label="Días/sem" value={String(summary.daysPerWeek)} />
          <StatusTile label="Min" value={String(summary.sessionDurationMinutes)} />
        </div>

        <p className="mt-4 text-sm leading-6 text-zinc-300">{summary.safetySummaryEs}</p>

        <div className="mt-4 rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Logging futuro por serie</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.requiredSetLogFieldsEs.map((field) => (
              <span
                key={field}
                className="rounded-full bg-zinc-900 px-2 py-1 text-xs font-semibold text-zinc-300 ring-1 ring-zinc-800"
              >
                {field}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <PlanDayPager sessions={summary.sessions} muscleGroupsByDayIndex={muscleGroupsByDayIndex} />
        </div>

        <form action={activatePlanAction} className="mt-4">
          <input type="hidden" name="templateId" value={templateId} />
          <SubmitButton className="w-full rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100">
            Activar este plan
          </SubmitButton>
        </form>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Al activar, este plan pasa a ser tu plan real y guardado. Puedes editarlo después desde &quot;Editar mi
          plan&quot;.
        </p>
      </section>
    </AppShell>
  );
}
