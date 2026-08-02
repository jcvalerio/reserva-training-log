import { requireCurrentUser } from "@/lib/auth-server";
import { getAthleteProfileContextForUser } from "@/profile/profile-repository";

import Link from "next/link";

import { AppShell } from "../app-shell";
import { FormStatusBanner } from "../form-status-banner";
import { SubmitButton } from "../submit-button";
import { saveAthleteProfileAction } from "./actions";

type ProfilePageProps = {
  searchParams?: Promise<{ saved?: string; error?: string; reset?: string; keptMeasurements?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const user = await requireCurrentUser();
  const { profile, limitations, musclePriorities } = await getAthleteProfileContextForUser(user.id);
  const painSensitiveAreasValue = limitations.map((item) => item.notes ?? item.conditionName).join("\n");
  const musclePrioritiesValue = musclePriorities.map((item) => item.notes ?? item.muscleGroup).join("\n");
  const params = searchParams ? await searchParams : {};

  return (
    <AppShell activeHref="/perfil">
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Perfil</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Contexto de atleta</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Base privada para un plan futuro. Guarda este contexto primero; luego sigue con mediciones aquí abajo.
          </p>
        </div>
      </header>

      <FormStatusBanner
        saved={params.saved === "1"}
        error={params.error === "validation"}
        savedMessage="Tu perfil quedó actualizado. Puedes seguir con mediciones aquí abajo."
        errorMessage="Hay datos fuera de rango o falta el nombre. Corrige el formulario y vuelve a guardar."
      />

      {params.reset === "1" ? (
        <section role="status" className="mt-6 rounded-3xl bg-emerald-300/10 p-4 ring-1 ring-emerald-400/30">
          <p className="text-sm font-semibold text-emerald-300">Listo</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            {params.keptMeasurements === "0"
              ? "Tus planes, sesiones y mediciones fueron eliminados. Tu perfil se mantiene."
              : "Tus planes y sesiones fueron eliminados. Tus mediciones y tu perfil se mantienen."}
          </p>
        </section>
      ) : null}

      <Link
        href="/mediciones"
        className="mt-6 block rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        aria-label="Ir a Mediciones"
      >
        <p className="text-sm font-semibold text-emerald-300">Mediciones</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Historial de peso, cintura y asimetrías muslo/pantorrilla. Cadencia recomendada: cada 2 semanas, no cada
          sesión.
        </p>
      </Link>

      <form action={saveAthleteProfileAction} className="mt-8 grid gap-8 pb-10">
        <section className="grid gap-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">Datos básicos</p>
          <Field label="Nombre">
            <input
              name="name"
              required
              minLength={2}
              defaultValue={profile?.name ?? user.name ?? ""}
              className="input"
              autoComplete="name"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Sexo">
              <select name="sex" defaultValue={profile?.sex ?? ""} className="input">
                <option value="">Prefiero omitir</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
                <option value="prefer_not_to_say">No decir</option>
              </select>
            </Field>
            <Field label="Año nacimiento">
              <input
                name="birthYear"
                type="number"
                inputMode="numeric"
                min={1900}
                max={new Date().getFullYear()}
                defaultValue={profile?.birthYear ?? ""}
                className="input"
              />
            </Field>
          </div>
        </section>

        <section className="grid gap-5 border-t border-zinc-800 pt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">Entrenamiento</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Años entrenando">
              <input
                name="trainingAgeYears"
                type="number"
                inputMode="numeric"
                min={0}
                max={70}
                defaultValue={profile?.trainingAgeYears ?? ""}
                className="input"
              />
            </Field>
            <Field label="Días recientes/sem">
              <input
                name="recentTrainingFrequencyDaysPerWeek"
                type="number"
                inputMode="numeric"
                min={0}
                max={7}
                defaultValue={profile?.recentTrainingFrequencyDaysPerWeek ?? ""}
                className="input"
              />
            </Field>
          </div>

          <div className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
            <p className="text-sm font-semibold text-emerald-300">Objetivo MVP bloqueado</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Días objetivo">
                <input
                  name="targetTrainingDaysPerWeek"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={7}
                  defaultValue={profile?.targetTrainingDaysPerWeek ?? 5}
                  className="input"
                />
              </Field>
              <Field label="Min/sesión">
                <input
                  name="targetSessionDurationMinutes"
                  type="number"
                  inputMode="numeric"
                  min={30}
                  max={150}
                  defaultValue={profile?.targetSessionDurationMinutes ?? 60}
                  className="input"
                />
              </Field>
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-400">
              Objetivo: hipertrofia + movilidad, con pérdida de grasa como objetivo secundario.
            </p>
          </div>

          <Field label="Progresión">
            <select
              name="progressionAggressiveness"
              defaultValue={profile?.progressionAggressiveness ?? "aggressive"}
              className="input"
            >
              <option value="aggressive">Agresiva, sin ignorar dolor</option>
              <option value="normal">Normal</option>
              <option value="conservative">Conservadora</option>
            </select>
          </Field>

          <Field label="Gimnasio / equipo">
            <input
              name="gymContext"
              defaultValue={profile?.gymContext ?? "a fully-equipped commercial gym, full gym"}
              className="input"
            />
          </Field>
        </section>

        <section className="grid gap-5 border-t border-zinc-800 pt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">Contexto adicional</p>
          <Field label="Limitaciones o zonas sensibles">
            <textarea
              name="painSensitiveAreas"
              rows={3}
              defaultValue={painSensitiveAreasValue}
              className="input resize-none"
              placeholder="Ej. bursitis de hombro, rodilla sensible, patrones a evitar. Una por línea."
            />
          </Field>

          <Field label="Prioridades musculares">
            <textarea
              name="musclePriorities"
              rows={3}
              defaultValue={musclePrioritiesValue}
              className="input resize-none"
              placeholder="Ej. cuádriceps/pantorrillas, asimetría derecha/izquierda. Una por línea."
            />
          </Field>

          <Field label="Notas generales">
            <textarea
              name="notes"
              rows={5}
              defaultValue={profile?.notes ?? ""}
              className="input resize-none"
              placeholder="Contexto adicional para el plan y la progresión."
            />
          </Field>
        </section>

        <input type="hidden" name="preferredLocale" value={profile?.preferredLocale ?? "es"} />
        <input type="hidden" name="timezone" value={profile?.timezone ?? "America/Costa_Rica"} />

        <SubmitButton className="rounded-2xl bg-emerald-300 px-5 py-4 text-base font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30">
          Guardar perfil
        </SubmitButton>
      </form>

      <section className="mb-10 rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Zona de peligro</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Borra tus planes, sesiones registradas y mediciones para empezar de cero. Tu perfil se mantiene.
        </p>
        <Link
          href="/perfil/reiniciar"
          className="mt-3 inline-block min-h-11 rounded-2xl px-2 py-2 text-sm font-semibold text-amber-200 underline decoration-amber-200/40 underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          Eliminar planes y sesiones
        </Link>
      </section>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-300">
      <span>{label}</span>
      {children}
    </label>
  );
}
