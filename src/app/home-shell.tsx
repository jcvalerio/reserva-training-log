import Link from "next/link";

import type { M1ReadinessStep, M1ReadinessStatus, M1Readiness } from "@/onboarding/readiness";

import { GoogleSignInButton, SignOutButton } from "./auth-buttons";

const navItems: Array<{ label: string; href: string } | { label: string; href?: never }> = [
  { label: "Inicio", href: "/" },
  { label: "Perfil", href: "/perfil" },
  { label: "Base", href: "/baseline" },
  { label: "Mediciones", href: "/mediciones" },
  { label: "Plan" },
  { label: "Entrenar" },
  { label: "Progreso" },
];
const loggingFields = ["kg", "reps", "RIR", "dolor", "notas"];

type HomeShellProps = {
  user: {
    name?: string | null;
    email?: string | null;
  } | null;
  googleSignInEnabled: boolean;
  readiness: M1Readiness | null;
};

export function HomeShell({ user, googleSignInEnabled, readiness }: HomeShellProps) {
  const isSignedIn = Boolean(user);
  const displayName = user?.name || user?.email || "atleta";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-zinc-950 px-5 py-6 text-zinc-50">
      <header className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-emerald-300">MVP personal · iPhone Web</p>
          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">ES / EN</span>
        </div>
        <nav aria-label="Principal" className="flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className="shrink-0 rounded-full bg-zinc-900 px-3 py-2 text-sm text-zinc-300 ring-1 ring-zinc-800"
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                className="shrink-0 rounded-full bg-zinc-900 px-3 py-2 text-sm text-zinc-300 ring-1 ring-zinc-800"
              >
                {item.label}
              </span>
            ),
          )}
        </nav>
        <div className="rounded-2xl bg-zinc-900 px-4 py-3 ring-1 ring-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {isSignedIn ? "Sesión activa" : "Sesión requerida"}
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            {isSignedIn
              ? `Conectado como ${displayName}. Tus perfiles futuros se consultarán por propietario.`
              : "Inicia sesión para aislar perfil, plan, sesiones y progreso por tester."}
          </p>
        </div>
      </header>

      <section className="flex flex-1 flex-col justify-center gap-8 py-10">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
            Entrenador Personal AI
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            Registra cada serie y progresa sin ignorar el dolor.
          </h1>
          <p className="text-lg leading-8 text-zinc-300">
            App web móvil para planes de hipertrofia de 5 días, sesiones de 60 minutos,
            historial por ejercicio y progresión agresiva pero segura.
          </p>
        </div>

        <div className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <p className="mb-3 text-sm font-medium text-zinc-400">Logging obligatorio por serie</p>
          <div className="grid grid-cols-5 gap-2">
            {loggingFields.map((field) => (
              <div key={field} className="rounded-2xl bg-zinc-950 px-2 py-4 text-center ring-1 ring-zinc-800">
                <span className="text-sm font-semibold uppercase text-zinc-100">{field}</span>
              </div>
            ))}
          </div>
        </div>

        {isSignedIn ? (
          <div className="grid gap-4 rounded-3xl bg-zinc-900 p-4 ring-1 ring-emerald-400/30">
            {readiness ? (
              <section aria-labelledby="m1-readiness-title" className="grid gap-4">
                <div>
                  <p className="text-sm font-semibold text-emerald-300" id="m1-readiness-title">
                    Preparación M1
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-300">
                    {readiness.completedFoundationSteps}/{readiness.totalFoundationSteps} bases listas. Próximo: {" "}
                    <span className="font-semibold text-zinc-100">{readiness.nextStep.labelEs}</span>.
                  </p>
                </div>

                <div className="grid gap-3">
                  {readiness.steps.map((step) => (
                    <ReadinessStepCard key={step.id} step={step} />
                  ))}
                </div>

                <p className="rounded-2xl bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-400 ring-1 ring-zinc-800">
                  {readiness.foundationReady
                    ? "Perfil, pesos base y mediciones están listos para la siguiente iteración. El plan sigue pendiente."
                    : "Completa perfil, pesos base y mediciones antes de iniciar cualquier plan."}
                </p>
              </section>
            ) : null}
            <SignOutButton />
          </div>
        ) : (
          <div className="grid gap-3">
            <GoogleSignInButton disabled={!googleSignInEnabled} />
            <p className="text-center text-sm text-zinc-500">
              Primero perfil, pesos base y mediciones. Después generación del plan.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function ReadinessStepCard({ step }: { step: M1ReadinessStep }) {
  const content = (
    <div className="flex items-start gap-3 rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
      <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${statusDotClass(step.status)}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="font-semibold text-zinc-100">{step.labelEs}</span>
          <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${statusPillClass(step.status)}`}>
            {step.statusLabelEs}
          </span>
        </span>
        <span className="mt-1 block text-sm leading-5 text-zinc-400">{step.descriptionEs}</span>
      </span>
    </div>
  );

  if (!step.href) {
    return content;
  }

  return (
    <Link href={step.href} aria-label={`Ir a ${step.labelEs}`}>
      {content}
    </Link>
  );
}

function statusDotClass(status: M1ReadinessStatus) {
  return {
    complete: "bg-emerald-300",
    incomplete: "bg-amber-300",
    blocked: "bg-zinc-600",
    pending: "bg-sky-300",
  }[status];
}

function statusPillClass(status: M1ReadinessStatus) {
  return {
    complete: "bg-emerald-300/10 text-emerald-300",
    incomplete: "bg-amber-300/10 text-amber-200",
    blocked: "bg-zinc-800 text-zinc-400",
    pending: "bg-sky-300/10 text-sky-200",
  }[status];
}
