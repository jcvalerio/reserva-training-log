import Link from "next/link";

import type { PlanTemplateMeta } from "@/plans/plan-templates";

import { AppShell } from "../../app-shell";

export function TemplatesPageContent({ templates }: { templates: PlanTemplateMeta[] }) {
  return (
    <AppShell activeHref="/plan">
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Plan</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Elige una plantilla</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Cada plantilla es solo lectura hasta que la actives. Puedes revisarla completa antes de decidir.
          </p>
        </div>
      </header>

      <section className="mt-7 grid gap-3 pb-10">
        {templates.map((template) => (
          <Link
            key={template.id}
            href={`/plan/templates/${template.id}`}
            className="block rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <span className="inline-block rounded-full bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-300/20">
              {template.objectiveEs}
            </span>
            <h2 className="mt-3 text-xl font-semibold text-zinc-100">{template.nameEs}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{template.shortDescriptionEs}</p>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
