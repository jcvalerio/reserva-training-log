import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth-server";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { calculateMeasurementGaps } from "@/measurements/measurement-schema";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { AppShell } from "../app-shell";
import { FormStatusBanner } from "../form-status-banner";
import { SubmitButton } from "../submit-button";
import { saveBodyMeasurementAction } from "./actions";

type MeasurementsPageProps = {
  searchParams?: Promise<{ saved?: string; error?: string }>;
};

export default async function MeasurementsPage({ searchParams }: MeasurementsPageProps) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);
  const params = searchParams ? await searchParams : {};

  if (!profile) {
    return (
      <AppShell activeHref="/mediciones">
        <div className="mt-20 rounded-3xl bg-zinc-900 p-5 ring-1 ring-zinc-800">
          <p className="text-sm font-semibold text-emerald-300">Perfil requerido</p>
          <h1 className="mt-2 text-2xl font-semibold">Primero crea tu perfil de atleta.</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Las mediciones se guardan como historial privado del perfil y nunca sobrescriben filas anteriores.
          </p>
          <Link
            href="/perfil"
            className="mt-5 block rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950"
          >
            Crear perfil primero
          </Link>
        </div>
      </AppShell>
    );
  }

  const measurements = await getRecentBodyMeasurementsForProfile(profile.id);
  const latestMeasurement = measurements[0];
  const latestGaps = latestMeasurement ? calculateMeasurementGaps(latestMeasurement) : null;

  return (
    <AppShell activeHref="/mediciones">
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Mediciones</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tendencias y asimetrías</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Guarda una nueva fila cada vez. No se sobrescribe el historial. Cadencia recomendada: cada 2 semanas, no cada sesión.
          </p>
        </div>
      </header>

      <FormStatusBanner
        saved={params.saved === "1"}
        error={params.error === "validation"}
        savedMessage="Nueva medición guardada como fila histórica."
        errorMessage="Registra al menos una medida numérica válida antes de guardar."
      />

      {latestGaps ? (
        <section className="mt-6 grid grid-cols-2 gap-3">
          <GapCard label="Gap muslo" value={latestGaps.thighGapCm} />
          <GapCard label="Gap pantorrilla" value={latestGaps.calfGapCm} />
        </section>
      ) : null}

      <form action={saveBodyMeasurementAction} className="mt-6 grid gap-5 rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
        <div>
          <h2 className="text-lg font-semibold">Nueva medición</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Puedes guardar medidas parciales, pero al menos una debe ser numérica. Si dejas la fecha vacía, se usa el momento de guardado.
          </p>
        </div>

        <Field label="Fecha/hora (opcional)">
          <input name="measuredAt" type="datetime-local" className="input" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <MeasurementInput name="bodyWeightKg" label="Peso kg" placeholder="80.0" />
          <MeasurementInput name="waistCm" label="Cintura cm" placeholder="88.0" />
        </div>

        <div className="rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
          <p className="mb-3 text-sm font-semibold text-zinc-300">Piernas</p>
          <div className="grid grid-cols-2 gap-3">
            <MeasurementInput name="rightThighCm" label="Muslo der cm" placeholder="54.0" />
            <MeasurementInput name="leftThighCm" label="Muslo izq cm" placeholder="56.0" />
            <MeasurementInput name="rightCalfCm" label="Pant. der cm" placeholder="36.0" />
            <MeasurementInput name="leftCalfCm" label="Pant. izq cm" placeholder="39.0" />
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
          <p className="mb-3 text-sm font-semibold text-zinc-300">Brazos</p>
          <div className="grid grid-cols-2 gap-3">
            <MeasurementInput name="rightArmCm" label="Brazo der cm" placeholder="34.0" />
            <MeasurementInput name="leftArmCm" label="Brazo izq cm" placeholder="34.0" />
          </div>
        </div>

        <Field label="Notas">
          <textarea
            name="notes"
            rows={3}
            className="input resize-none"
            placeholder="Opcional. Ej. hora del día, ayunas, bomba, contexto."
          />
        </Field>

        <SubmitButton className="sticky-submit rounded-2xl bg-emerald-300 px-5 py-4 text-base font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30">
          Guardar nueva medición
        </SubmitButton>
      </form>

      <section className="mt-8 pb-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Historial</p>
            <h2 className="mt-1 text-2xl font-semibold">Mediciones recientes</h2>
          </div>
          <span className="text-xs text-zinc-500">{measurements.length}/10</span>
        </div>

        {measurements.length === 0 ? (
          <div className="mt-4 rounded-3xl bg-zinc-900 p-4 text-sm leading-6 text-zinc-300 ring-1 ring-zinc-800">
            Aún no hay mediciones. Registra tu punto de partida para ver gaps de muslo y pantorrilla.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {measurements.map((measurement) => {
              const gaps = calculateMeasurementGaps(measurement);

              return (
                <article key={measurement.id} className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-300">
                        {formatDateTime(measurement.measuredAt)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">Nueva fila histórica preservada</p>
                    </div>
                    <div className="text-right text-xs text-zinc-400">
                      <p>Muslo: {formatGap(gaps.thighGapCm)}</p>
                      <p>Pant.: {formatGap(gaps.calfGapCm)}</p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <MeasurementValue label="Peso" value={measurement.bodyWeightKg} unit="kg" />
                    <MeasurementValue label="Cintura" value={measurement.waistCm} unit="cm" />
                    <MeasurementValue label="Muslo der" value={measurement.rightThighCm} unit="cm" />
                    <MeasurementValue label="Muslo izq" value={measurement.leftThighCm} unit="cm" />
                    <MeasurementValue label="Pant. der" value={measurement.rightCalfCm} unit="cm" />
                    <MeasurementValue label="Pant. izq" value={measurement.leftCalfCm} unit="cm" />
                    <MeasurementValue label="Brazo der" value={measurement.rightArmCm} unit="cm" />
                    <MeasurementValue label="Brazo izq" value={measurement.leftArmCm} unit="cm" />
                  </dl>

                  {measurement.notes ? <p className="mt-3 text-sm leading-6 text-zinc-300">{measurement.notes}</p> : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function MeasurementInput({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return (
    <Field label={label}>
      <input
        name={name}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.1"
        placeholder={placeholder}
        className="input"
      />
    </Field>
  );
}

function GapCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-emerald-400/30">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatGap(value)}</p>
      <p className="mt-1 text-xs text-zinc-400">izq - der</p>
    </div>
  );
}

function MeasurementValue({ label, value, unit }: { label: string; value: string | null; unit: string }) {
  return (
    <div className="rounded-2xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 font-semibold text-zinc-100">{formatMeasurement(value, unit)}</dd>
    </div>
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

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Costa_Rica",
  }).format(date);
}

function formatMeasurement(value: string | null, unit: string) {
  if (value === null) {
    return "—";
  }

  return `${formatNumber(Number(value))} ${unit}`;
}

function formatGap(value: number | null) {
  if (value === null) {
    return "—";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)} cm`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-CR", { maximumFractionDigits: 2 }).format(value);
}
