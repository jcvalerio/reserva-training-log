import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth-server";
import { getDraftPlanForProfile } from "@/plans/plan-builder-repository";
import { getPlanShareInvitePreview } from "@/plans/plan-share-repository";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { AppShell } from "../../../app-shell";
import { SubmitButton } from "../../../submit-button";
import { redeemPlanShareAction } from "../actions";

type PlanCompartirCodePageProps = {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{ error?: string }>;
};

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  invalid: {
    title: "Este enlace no es válido",
    body: "Pídele a la persona que te lo compartió que genere uno nuevo desde su plan.",
  },
  expired: {
    title: "Este enlace venció",
    body: "Los enlaces para compartir un plan duran 14 días. Pide uno nuevo.",
  },
  already_redeemed: {
    title: "Este enlace ya se usó",
    body: "Cada enlace solo se puede usar una vez. Pide uno nuevo si necesitas otra copia.",
  },
  wrong_account: {
    title: "Este enlace es para otra cuenta",
    body: "Inicia sesión con la cuenta de Google a la que se envió este enlace.",
  },
  draft_conflict: {
    title: "Ya tienes un borrador en progreso",
    body: "Termina o elimina tu borrador actual (en Plan) antes de recibir este plan compartido.",
  },
};

export default async function PlanCompartirCodePage({ params, searchParams }: PlanCompartirCodePageProps) {
  const { code } = await params;
  const search = searchParams ? await searchParams : {};

  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    return (
      <AppShell activeHref="/plan" backTo={{ href: "/plan", label: "Plan" }}>
        <StatusCard title="Primero crea tu perfil de atleta." body="Necesitas un perfil antes de recibir un plan compartido." href="/perfil" ctaLabel="Crear perfil primero" />
      </AppShell>
    );
  }

  const preview = await getPlanShareInvitePreview(code);

  const status = (() => {
    if (search.error) {
      return search.error;
    }
    if (!preview) {
      return "invalid";
    }
    if (preview.invite.status === "redeemed") {
      return "already_redeemed";
    }
    if (preview.isExpired) {
      return "expired";
    }
    if (preview.invite.recipientEmail !== user.email.trim().toLowerCase()) {
      return "wrong_account";
    }
    return "ready";
  })();

  if (status !== "ready") {
    const message = STATUS_MESSAGES[status] ?? STATUS_MESSAGES.invalid!;
    return (
      <AppShell activeHref="/plan" backTo={{ href: "/plan", label: "Plan" }}>
        <StatusCard title={message.title} body={message.body} href="/plan" ctaLabel="Ir a Plan" />
      </AppShell>
    );
  }

  // Re-checked here (not just inside redeemPlanShareAction) so the confirm
  // button below isn't shown at all when it would just fail on click.
  const existingDraft = await getDraftPlanForProfile(profile.id);
  if (existingDraft) {
    const message = STATUS_MESSAGES.draft_conflict!;
    return (
      <AppShell activeHref="/plan" backTo={{ href: "/plan", label: "Plan" }}>
        <StatusCard title={message.title} body={message.body} href="/plan" ctaLabel="Ir a Plan" />
      </AppShell>
    );
  }

  return (
    <AppShell activeHref="/plan" backTo={{ href: "/plan", label: "Plan" }}>
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Plan compartido</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Vas a recibir un plan</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {preview!.ownerNameEs} te compartió &ldquo;{preview!.sourcePlanNameEs}&rdquo;. Vas a recibir tu propia
            copia independiente como borrador — puedes revisarla y activarla cuando quieras. Tus números y los suyos
            se registran por separado.
          </p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-2 text-center">
        <StatTile label="Días/sem" value={String(preview!.dayCount)} />
        <StatTile label="Ejercicios" value={String(preview!.exerciseCount)} />
      </section>

      <form action={redeemPlanShareAction} className="mt-6">
        <input type="hidden" name="code" value={code} />
        <SubmitButton className="w-full rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100">
          Recibir esta copia
        </SubmitButton>
      </form>
    </AppShell>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-900 px-2 py-3 ring-1 ring-zinc-800">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function StatusCard({ title, body, href, ctaLabel }: { title: string; body: string; href: string; ctaLabel: string }) {
  return (
    <div className="mt-20 rounded-3xl bg-zinc-900 p-5 ring-1 ring-zinc-800">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{body}</p>
      <Link href={href} className="mt-5 block rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950">
        {ctaLabel}
      </Link>
    </div>
  );
}
