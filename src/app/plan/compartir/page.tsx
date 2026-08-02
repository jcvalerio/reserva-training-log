import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth-server";
import { env } from "@/env";
import { getActivePlanForProfile } from "@/plans/plan-repository";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { AppShell } from "../../app-shell";
import { CopyLinkButton } from "../../copy-link-button";
import { FormStatusBanner } from "../../form-status-banner";
import { SubmitButton } from "../../submit-button";
import { createPlanShareAction } from "./actions";

type PlanCompartirPageProps = {
  searchParams?: Promise<{ created?: string; error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Escribe un correo válido.",
  not_found: "No se encontró tu plan activo para compartir.",
  self_share: "No puedes compartir un plan contigo mismo.",
  no_account: "Ese correo no tiene una cuenta en la app todavía. Pídele que inicie sesión una vez primero.",
  unknown: "No se pudo crear el enlace. Intenta de nuevo.",
};

export default async function PlanCompartirPage({ searchParams }: PlanCompartirPageProps) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);
  const params = searchParams ? await searchParams : {};

  if (!profile) {
    return (
      <AppShell activeHref="/plan" backTo={{ href: "/plan", label: "Plan" }}>
        <NoticeCard title="Primero crea tu perfil de atleta." href="/perfil" ctaLabel="Crear perfil primero">
          Compartir un plan requiere un perfil de atleta.
        </NoticeCard>
      </AppShell>
    );
  }

  const active = await getActivePlanForProfile(profile.id);
  if (!active) {
    return (
      <AppShell activeHref="/plan" backTo={{ href: "/plan", label: "Plan" }}>
        <NoticeCard title="No tienes un plan activo todavía." href="/plan" ctaLabel="Ir a Plan">
          Solo puedes compartir un plan una vez que lo hayas activado.
        </NoticeCard>
      </AppShell>
    );
  }

  const baseUrl = env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const shareLink = params.created ? `${baseUrl}/plan/compartir/${params.created}` : null;

  return (
    <AppShell activeHref="/plan" backTo={{ href: "/plan", label: "Plan" }}>
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Plan</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Compartir tu plan</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Envía una copia independiente de &ldquo;{active.plan.nameEs}&rdquo; a otra cuenta. Cada quien entrena y
            registra sus propios números — editar tu plan después no cambia la copia que ya recibió.
          </p>
        </div>
      </header>

      <FormStatusBanner
        saved={false}
        error={Boolean(params.error)}
        errorMessage={params.error ? (ERROR_MESSAGES[params.error] ?? ERROR_MESSAGES.unknown) : undefined}
      />

      {shareLink ? (
        <section className="mt-6 rounded-3xl bg-emerald-300/10 p-4 ring-1 ring-emerald-400/30" role="status">
          <p className="text-sm font-semibold text-emerald-300">Enlace listo</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            Envíaselo por el medio que ya usan (WhatsApp, mensaje de texto). Solo la cuenta con el correo que
            escribiste puede usarlo, y vence en 14 días.
          </p>
          <p className="mt-3 rounded-2xl bg-zinc-950 p-3 text-xs break-all text-zinc-300 ring-1 ring-zinc-800">
            {shareLink}
          </p>
          <CopyLinkButton
            value={shareLink}
            className="mt-3 w-full rounded-2xl bg-emerald-300 px-5 py-3 text-center font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100"
          />
        </section>
      ) : null}

      <form
        action={createPlanShareAction}
        className="mt-6 grid gap-5 rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800"
      >
        <div>
          <h2 className="text-lg font-semibold">Correo de quien va a recibirlo</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Debe ser el correo de Google con el que esa persona ya inició sesión en la app.
          </p>
        </div>
        <label className="grid gap-2 text-sm font-medium text-zinc-300">
          <span>Correo</span>
          <input name="recipientEmail" type="email" placeholder="Athlete C@example.com" className="input" required />
        </label>
        <SubmitButton className="rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100">
          Generar enlace
        </SubmitButton>
      </form>
    </AppShell>
  );
}

function NoticeCard({
  title,
  href,
  ctaLabel,
  children,
}: {
  title: string;
  href: string;
  ctaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-20 rounded-3xl bg-zinc-900 p-5 ring-1 ring-zinc-800">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{children}</p>
      <Link
        href={href}
        className="mt-5 block rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
