import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth-server";
import { getAthleteProfileContextForUser } from "@/profile/profile-repository";

import { saveAthleteProfileAction } from "./actions";

export default async function ProfilePage() {
  const user = await requireCurrentUser();
  const { profile, limitations, musclePriorities } = await getAthleteProfileContextForUser(user.id);
  const painSensitiveAreasValue = limitations.map((item) => item.notes ?? item.conditionName).join("\n");
  const musclePrioritiesValue = musclePriorities.map((item) => item.notes ?? item.muscleGroup).join("\n");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-zinc-950 px-5 py-6 text-zinc-50">
      <header className="space-y-3">
        <Link href="/" className="text-sm font-medium text-emerald-300">
          ← Inicio
        </Link>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Perfil</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Contexto de atleta</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Base privada para un plan futuro. Guarda este contexto primero; luego vuelve a Inicio para seguir con pesos base y mediciones.
          </p>
        </div>
      </header>

      <form action={saveAthleteProfileAction} className="mt-8 grid gap-5 pb-10">
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
            Plan inicial futuro: hipertrofia + movilidad, con pérdida de grasa como objetivo secundario. Esta pantalla no genera IA.
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

        <input type="hidden" name="preferredLocale" value={profile?.preferredLocale ?? "es"} />
        <input type="hidden" name="timezone" value={profile?.timezone ?? "America/Costa_Rica"} />

        <button
          type="submit"
          className="sticky bottom-4 rounded-2xl bg-emerald-300 px-5 py-4 text-base font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30"
        >
          Guardar perfil
        </button>
      </form>
    </main>
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
