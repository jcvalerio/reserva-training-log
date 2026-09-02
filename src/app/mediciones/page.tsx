import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth-server";
import { getFunctionalTestsForProfile } from "@/measurements/functional-test-repository";
import { getRecentLimbSymmetryTestsForProfile } from "@/measurements/limb-symmetry-repository";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { calculateMeasurementGaps } from "@/measurements/measurement-schema";
import { getActivePlanForProfile } from "@/plans/plan-repository";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import {
  buildFunctionalCapacitySummary,
  FUNCTIONAL_RETEST_WEEKS,
  type FunctionalCapacitySummary,
} from "@/workouts/functional-capacity";
import {
  buildLimbSymmetrySummary,
  LSI_RETEST_WEEKS,
  type LimbSymmetrySummary,
} from "@/workouts/limb-symmetry";

import { AppShell } from "../app-shell";
import { FormStatusBanner } from "../form-status-banner";
import { SubmitButton } from "../submit-button";
import {
  saveBodyMeasurementAction,
  saveFunctionalTestAction,
  saveLimbSymmetryTestAction,
} from "./actions";

type MeasurementsPageProps = {
  searchParams?: Promise<{ saved?: string; error?: string }>;
};

export default async function MeasurementsPage({ searchParams }: MeasurementsPageProps) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);
  const params = searchParams ? await searchParams : {};

  if (!profile) {
    return (
      <AppShell activeHref="/mediciones" backTo={{ href: "/perfil", label: "Perfil" }}>
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

  const [symmetryTests, activePlan, functionalTests] = await Promise.all([
    getRecentLimbSymmetryTestsForProfile(profile.id),
    getActivePlanForProfile(profile.id),
    getFunctionalTestsForProfile(profile.id),
  ]);
  const symmetry = buildLimbSymmetrySummary(symmetryTests, { now: new Date() });
  const functional = buildFunctionalCapacitySummary(functionalTests, { now: new Date() });
  // Offered as the test's exercise options. Unilateral only — the test is
  // meaningless on a movement that works both sides at once.
  const unilateralExerciseNames = [
    ...new Set(
      (activePlan?.sessions ?? [])
        .flatMap((session) => session.exercises)
        .filter((exercise) => exercise.isUnilateral)
        .map((exercise) => exercise.exerciseNameEs),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));

  return (
    <AppShell activeHref="/mediciones" backTo={{ href: "/perfil", label: "Perfil" }}>
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Mediciones</p>
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

      <FormStatusBanner
        saved={params.saved === "simetria"}
        error={params.error === "simetria"}
        savedMessage="Prueba de simetría guardada."
        errorMessage="Revisa la prueba: usa el mismo peso en ambos lados y repeticiones entre 0 y 200."
      />

      <FormStatusBanner
        saved={params.saved === "funcional"}
        error={params.error === "funcional"}
        savedMessage="Prueba funcional guardada."
        errorMessage="Registra al menos una de las dos pruebas, con valores dentro de rango."
      />

      <FunctionalCapacitySection summary={functional} />

      <LimbSymmetrySection
        summary={symmetry}
        exerciseNames={unilateralExerciseNames}
      />

      {latestGaps ? (
        <section className="mt-6 rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Diferencia de contorno
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <GapCard label="Muslo" value={latestGaps.thighGapCm} />
            <GapCard label="Pantorrilla" value={latestGaps.calfGapCm} />
          </div>
          {/* Demoted from a goal to context, deliberately. A 2-3 cm girth
              difference is ordinary dominance variance, and calf girth is
              largely set by insertion and Achilles length — structural, not
              trainable. Setting a target against it reports failure forever
              against something the athlete cannot move. */}
          <p className="mt-3 text-xs leading-5 text-zinc-400">
            Descriptivo, no un objetivo. Una diferencia de 2-3 cm es variación normal entre lado dominante y no
            dominante, y el contorno de pantorrilla depende sobre todo de la inserción y del tendón — no se
            entrena. Para saber si hay una diferencia real de fuerza, usa la prueba de simetría de arriba.
          </p>
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
          <MeasurementInput name="chestCm" label="Pecho cm" placeholder="100.0" />
          <MeasurementInput name="hipsCm" label="Caderas cm" placeholder="95.0" />
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

        <SubmitButton className="rounded-2xl bg-emerald-300 px-5 py-4 text-base font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30">
          Guardar nueva medición
        </SubmitButton>
      </form>

      <section className="mt-8 pb-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Historial</p>
            <h2 className="mt-1 text-2xl font-semibold">Mediciones recientes</h2>
          </div>
          <span className="text-xs text-zinc-400">{measurements.length}/10</span>
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
                      <p className="mt-1 text-xs text-zinc-400">Nueva fila histórica preservada</p>
                    </div>
                    <div className="text-right text-xs text-zinc-400">
                      <p>Muslo: {formatGap(gaps.thighGapCm)}</p>
                      <p>Pant.: {formatGap(gaps.calfGapCm)}</p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <MeasurementValue label="Peso" value={measurement.bodyWeightKg} unit="kg" />
                    <MeasurementValue label="Cintura" value={measurement.waistCm} unit="cm" />
                    <MeasurementValue label="Pecho" value={measurement.chestCm} unit="cm" />
                    <MeasurementValue label="Caderas" value={measurement.hipsCm} unit="cm" />
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

// Neutral now, not emerald-ringed: the accent belonged to a number the app
// was treating as a goal, and it is context.
function GapCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-zinc-100">{formatGap(value)}</p>
      <p className="mt-1 text-xs text-zinc-400">izq - der</p>
    </div>
  );
}

/**
 * The mobility / healthy-aging half of the stated goal, which had no measure
 * at all while every number on /progreso was a hypertrophy metric.
 *
 * Deliberately shows no age-norm comparison. Published norms for both tests
 * start at 60 (Rikli & Jones for the chair stand, Bohannon for stance), and
 * the sources covering 40-59 disagree — a "you perform like someone 8 years
 * younger" line would be invented clinical data. The athlete's own first test
 * is the comparator instead, which is also the number that tracks whether the
 * training is working.
 */
function FunctionalCapacitySection({ summary }: { summary: FunctionalCapacitySummary }) {
  return (
    <section className="mt-6 rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
      <h2 className="text-lg font-semibold">Pruebas funcionales</h2>
      <p className="mt-1 text-sm leading-6 text-zinc-400">
        Dos minutos, cada 8 semanas. Miden la otra mitad del objetivo — moverte bien y mantener el equilibrio —
        que el resto de la app no mide.
      </p>

      <div className="mt-4 grid gap-2 rounded-2xl bg-zinc-950 p-3 text-sm leading-6 text-zinc-300 ring-1 ring-zinc-800">
        <p>
          <strong className="text-zinc-100">Sentarse y levantarse (30 s).</strong> Silla firme, brazos cruzados
          al pecho. Cuenta cuántas veces te levantas por completo en 30 segundos.
        </p>
        <p>
          <strong className="text-zinc-100">Equilibrio a una pierna, ojos cerrados.</strong> Junto a una pared o
          algo donde apoyarte. Cronometra cada pierna por separado y para a los 60 segundos.
        </p>
        {/* Says why eyes closed, because doing it eyes open is the intuitive
            choice and would make the number useless: at this age it saturates
            the test and reads perfect forever. */}
        <p className="text-xs leading-5 text-zinc-400">
          Con los ojos cerrados a propósito: con los ojos abiertos casi cualquier persona sana aguanta el máximo
          de la prueba, así que no distingue nada.
        </p>
      </div>

      {summary.latestSitToStandReps !== null || summary.latestBalanceSeconds !== null ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <FunctionalTile
            label="Sentadillas 30 s"
            value={summary.latestSitToStandReps === null ? "—" : `${summary.latestSitToStandReps}`}
            unit="reps"
            delta={summary.sitToStandTrend?.delta ?? null}
          />
          <FunctionalTile
            label="Equilibrio"
            value={summary.latestBalanceSeconds === null ? "—" : `${summary.latestBalanceSeconds}`}
            unit="s"
            delta={summary.balanceTrend?.delta ?? null}
          />
        </div>
      ) : null}

      {summary.balanceSymmetry ? (
        <p
          className={`mt-3 text-sm leading-6 ${
            summary.balanceSymmetry.belowThreshold ? "text-amber-200" : "text-zinc-300"
          }`}
        >
          Equilibrio izq {summary.balanceSymmetry.leftSeconds}s vs der {summary.balanceSymmetry.rightSeconds}s —{" "}
          {summary.balanceSymmetry.indexPercent}%
          {summary.balanceSymmetry.belowThreshold ? " (diferencia a trabajar)" : ""}
        </p>
      ) : null}

      {summary.retestDue ? (
        <p className="mt-3 text-sm leading-6 text-emerald-300">
          {summary.lastTestedAt === null
            ? "Todavía no has hecho estas pruebas."
            : `Toca repetirlas: la última fue hace más de ${FUNCTIONAL_RETEST_WEEKS} semanas.`}
        </p>
      ) : null}

      <form action={saveFunctionalTestAction} className="mt-4 grid gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Reps 30 s">
            <input name="sitToStandReps" type="number" inputMode="numeric" min={0} max={100} className="input" />
          </Field>
          <Field label="Equil. izq s">
            <input
              name="balanceLeftSeconds"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              max={120}
              className="input"
            />
          </Field>
          <Field label="Equil. der s">
            <input
              name="balanceRightSeconds"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              max={120}
              className="input"
            />
          </Field>
        </div>

        <Field label="Notas">
          <textarea
            name="notes"
            rows={2}
            className="input resize-none"
            placeholder="Opcional. Ej. cansado, silla más baja de lo normal."
          />
        </Field>

        <SubmitButton className="rounded-2xl bg-emerald-300 px-5 py-4 text-base font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30">
          Guardar prueba funcional
        </SubmitButton>
      </form>
    </section>
  );
}

function FunctionalTile({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: string;
  unit: string;
  delta: number | null;
}) {
  return (
    <div className="rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">
        {value}
        <span className="ml-1 text-sm font-medium text-zinc-400">{unit}</span>
      </p>
      {/* Only once there are two tests to compare. Emerald for a gain, plain
          zinc for a loss: colour is the pain channel in this app, so a decline
          is stated rather than painted red. */}
      {delta !== null ? (
        <p className={`mt-1 text-xs ${delta > 0 ? "text-emerald-300" : "text-zinc-400"}`}>
          {delta > 0 ? "+" : ""}
          {delta} desde la primera
        </p>
      ) : null}
    </div>
  );
}

/**
 * The performance-based asymmetry measure, above the tape measure because it
 * is the one that can actually change and the one a physio would read.
 *
 * The test has to be run in a specific way, and the copy says so, because
 * doing it the way the plan normally prescribes destroys the measurement: the
 * plan caps the strong side at the weak side's reps, which is good training
 * and makes both sides look identical. Here the strong side runs uncapped.
 */
function LimbSymmetrySection({
  summary,
  exerciseNames,
}: {
  summary: LimbSymmetrySummary;
  exerciseNames: string[];
}) {
  return (
    <section className="mt-6 rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
      <h2 className="text-lg font-semibold">Prueba de simetría</h2>
      <p className="mt-1 text-sm leading-6 text-zinc-400">
        Mismo peso en ambos lados, empezando por el lado débil, y el lado fuerte <strong>sin tope</strong> de
        repeticiones. Es la única forma de ver la diferencia: en tu entrenamiento normal el lado fuerte se
        iguala al débil a propósito, así que ahí siempre se ven iguales.
      </p>

      {summary.worst ? (
        <div
          className={`mt-4 rounded-2xl px-4 py-3 ring-1 ${
            summary.worst.belowThreshold ? "bg-zinc-950 ring-amber-300/40" : "bg-zinc-950 ring-zinc-800"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Índice más bajo</p>
          <p
            className={`mt-1 text-3xl font-semibold ${
              summary.worst.belowThreshold ? "text-amber-200" : "text-zinc-100"
            }`}
          >
            {summary.worst.indexPercent}%
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            {summary.worst.exerciseNameEs} — {summary.worst.leftReps} izq vs {summary.worst.rightReps} der con{" "}
            {summary.worst.testWeightKg}kg
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            {summary.worst.belowThreshold
              ? "Por debajo de 90%, que es el umbral que se usa para volver a entrenar sin restricciones. Vale consultarlo con un profesional antes de forzar el lado débil."
              : "Igual o por encima de 90%, el umbral habitual. No hay diferencia que corregir."}
          </p>
        </div>
      ) : null}

      {summary.latestByExercise.length > 1 ? (
        <ul className="mt-3 grid gap-2">
          {summary.latestByExercise
            .filter((result) => result.id !== summary.worst?.id)
            .map((result) => (
              <li
                key={result.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-2xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800"
              >
                <span className="text-sm text-zinc-300">{result.exerciseNameEs}</span>
                <span
                  className={`text-sm font-semibold ${
                    result.belowThreshold ? "text-amber-200" : "text-zinc-100"
                  }`}
                >
                  {result.indexPercent}%
                </span>
              </li>
            ))}
        </ul>
      ) : null}

      {summary.retestDue ? (
        <p className="mt-3 text-sm leading-6 text-emerald-300">
          {summary.lastTestedAt === null
            ? "Todavía no has hecho esta prueba."
            : `Toca repetirla: la última fue hace más de ${LSI_RETEST_WEEKS} semanas.`}
        </p>
      ) : null}

      <form action={saveLimbSymmetryTestAction} className="mt-4 grid gap-4">
        <Field label="Ejercicio">
          {exerciseNames.length > 0 ? (
            <select name="exerciseNameEs" className="input" defaultValue={exerciseNames[0]}>
              {exerciseNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <input
              name="exerciseNameEs"
              type="text"
              className="input"
              placeholder="Ej. Prensa unilateral"
              required
            />
          )}
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Peso kg">
            <input
              name="testWeightKg"
              type="number"
              inputMode="decimal"
              step="0.5"
              min={0}
              max={999}
              className="input"
              required
            />
          </Field>
          <Field label="Reps izq">
            <input name="leftReps" type="number" inputMode="numeric" min={0} max={200} className="input" required />
          </Field>
          <Field label="Reps der">
            <input name="rightReps" type="number" inputMode="numeric" min={0} max={200} className="input" required />
          </Field>
        </div>

        <Field label="Notas">
          <textarea
            name="notes"
            rows={2}
            className="input resize-none"
            placeholder="Opcional. Ej. molestia en un lado, técnica que cambió al final."
          />
        </Field>

        <SubmitButton className="rounded-2xl bg-emerald-300 px-5 py-4 text-base font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30">
          Guardar prueba de simetría
        </SubmitButton>
      </form>
    </section>
  );
}

function MeasurementValue({ label, value, unit }: { label: string; value: string | null; unit: string }) {
  return (
    <div className="rounded-2xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800">
      <dt className="text-xs text-zinc-400">{label}</dt>
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
