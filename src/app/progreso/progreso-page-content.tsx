import { ChevronDown } from "lucide-react";
import Link from "next/link";

import { formatShortDateEs } from "@/lib/format";
import type { MeasurementSeriesPoint } from "@/measurements/measurement-series";
import type { BodyMeasurementTrend } from "@/measurements/measurement-trend";
import type { FunctionalCapacitySummary } from "@/workouts/functional-capacity";
import { LSI_FLAG_THRESHOLD, type LimbSymmetrySummary } from "@/workouts/limb-symmetry";
import { buildConsistencyBars, type ConsistencySummary } from "@/workouts/consistency";
import type { ExerciseSeriesGroup } from "@/workouts/exercise-series";
import type { ExerciseImprovementRow } from "@/workouts/improvement";
import { painLocationLabelsEs } from "@/training/muscle-taxonomy";
import { buildMuscleProgressRows, pickProgressView } from "@/workouts/muscle-progress";
import type { MuscleVolumeSummary } from "@/workouts/muscle-volume";
import { averageRecentTrainingLoad, computeSessionTrainingLoad } from "@/workouts/session-load";
import type { CompletedSessionSummary } from "@/workouts/workout-repository";

import { AppShell } from "../app-shell";
import { BarChart } from "./bar-chart";
import { ExerciseGroupList } from "./exercise-group-list";
import { MeasurementSeriesChart } from "./measurement-series-chart";
import { MuscleProgressTable } from "./muscle-progress-table";
import { MuscleVolumeSection } from "./muscle-volume-section";
import { buildTopExerciseRows, TopExercisesList } from "./top-exercises-list";

export function ProgresoPageContent({
  hasProfile,
  improvements,
  completedSessions,
  bodyMeasurementTrend,
  measurementSeries,
  exerciseSeriesGroups,
  defaultExerciseName,
  consistencySummary,
  muscleVolumeSummary,
  limbSymmetry,
  functionalCapacity,
}: {
  hasProfile: boolean;
  improvements: ExerciseImprovementRow[];
  completedSessions: CompletedSessionSummary[];
  bodyMeasurementTrend: BodyMeasurementTrend | null;
  measurementSeries: MeasurementSeriesPoint[];
  exerciseSeriesGroups: ExerciseSeriesGroup[];
  defaultExerciseName: string | null;
  consistencySummary: ConsistencySummary | null;
  muscleVolumeSummary: MuscleVolumeSummary | null;
  limbSymmetry: LimbSymmetrySummary;
  functionalCapacity: FunctionalCapacitySummary;
}) {
  if (!hasProfile || completedSessions.length === 0) {
    return (
      <AppShell activeHref="/progreso" backTo={null}>
        <header className="space-y-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Progreso</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Todavía no hay historial</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Completa al menos una sesión en Entrenar para empezar a ver tu progreso aquí.
            </p>
          </div>
        </header>

        <Link
          href="/entrenar"
          className="mt-7 block rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100"
        >
          Ir a Entrenar
        </Link>
      </AppShell>
    );
  }

  const recentAverageLoad = averageRecentTrainingLoad(completedSessions);
  const improvedExerciseCount = improvements.filter((row) => row.improvement.improved).length;
  const topExerciseRows = buildTopExerciseRows(improvements);

  // Volume (the input) crossed with progression (the output). Both halves were
  // already on this page and neither could answer "is this muscle group
  // actually working" alone.
  const progressView = muscleVolumeSummary ? pickProgressView(muscleVolumeSummary.views) : null;
  const muscleProgressRows = progressView
    ? buildMuscleProgressRows(progressView, exerciseSeriesGroups, improvements)
    : [];

  return (
    <AppShell activeHref="/progreso" backTo={null}>
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Progreso</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tu historial</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Tendencias, comparaciones por ejercicio y tu historial de entrenamientos completados.
          </p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-3 gap-2" aria-label="Resumen">
        <KpiTile
          label="Esta semana"
          value={consistencySummary ? `${consistencySummary.currentWeekDaysTrained}/${consistencySummary.targetDaysPerWeek}` : "—"}
          sublabel="días"
        />
        <KpiTile
          label="Mejorando"
          value={improvements.length > 0 ? `${improvedExerciseCount}/${improvements.length}` : "—"}
          sublabel="ejercicios"
        />
        <KpiTile label="Carga" value={recentAverageLoad !== null ? `${recentAverageLoad}` : "—"} sublabel="UA reciente" />
      </section>

      {muscleProgressRows.length > 0 && progressView ? (
        <section className="mt-7 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800" aria-labelledby="muscle-progress-title">
          <p id="muscle-progress-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">
            ¿Está funcionando?
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Cruza cuánto entrenas cada grupo con si sus ejercicios están subiendo.{" "}
            {progressView.isAverage
              ? `Promedio por semana de ${progressView.weeksCounted} ${
                  progressView.weeksCounted === 1 ? "semana completa" : "semanas completas"
                }.`
              : "Semana en curso."}
          </p>
          <div className="mt-3">
            <MuscleProgressTable rows={muscleProgressRows} />
          </div>
        </section>
      ) : null}

      {topExerciseRows.length > 0 ? (
        <section className="mt-7 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800" aria-labelledby="top-exercises-title">
          <p id="top-exercises-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Ejercicios que más mejoraron
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            El indicador que más cambió en cada ejercicio desde tu sesión anterior.
          </p>
          <div className="mt-3">
            <TopExercisesList rows={topExerciseRows} />
          </div>
        </section>
      ) : null}

      {/* Promoted above the volume and progression sections on purpose. Sets
          are the input and lifts are a proxy; over a block, circumference and
          bodyweight are the only direct evidence that any of it turned into
          tissue. Strength can improve on technique, sleep or neural
          adaptation alone — so a page where every chart reads green and the
          tape has not moved in three months is saying something, and burying
          this at the bottom is what stopped it being heard. */}
      {/* Outside the bodyMeasurementTrend guard on purpose: symmetry comes
          from logged capacity tests, not from the tape measure, so an athlete
          who has never recorded a circumference should still see it. */}
      <LimbSymmetryCard summary={limbSymmetry} />
      <FunctionalCapacityCard summary={functionalCapacity} />

      {bodyMeasurementTrend ? (
        <BodyMeasurementTrendCard trend={bodyMeasurementTrend} measurementSeries={measurementSeries} />
      ) : null}

      {muscleVolumeSummary ? (
        <section className="mt-7 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800" aria-labelledby="muscle-volume-title">
          <p id="muscle-volume-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Series por grupo muscular
          </p>
          <div className="mt-3">
            <MuscleVolumeSection summary={muscleVolumeSummary} />
          </div>

          <Link
            href="/guia?open=volumen"
            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Cómo se cuentan estas series
          </Link>
        </section>
      ) : null}

      {/* Split out of the volume card above, which had grown to hold four
          unrelated questions at once. Each is now its own disclosure, closed
          by default — they are reference material consulted occasionally, not
          part of the per-visit read. */}
      {muscleVolumeSummary &&
      (muscleVolumeSummary.pushPullRatio !== null || muscleVolumeSummary.quadHamstringRatio !== null) ? (
        <DisclosureSection title="Equilibrio">
          <p className="text-sm leading-6 text-zinc-300">
            {muscleVolumeSummary.pushPullRatio !== null
              ? `Empuje : Tirón — ${formatRatio(muscleVolumeSummary.pushPullRatio)}`
              : null}
            {muscleVolumeSummary.pushPullRatio !== null && muscleVolumeSummary.quadHamstringRatio !== null
              ? " · "
              : null}
            {muscleVolumeSummary.quadHamstringRatio !== null
              ? `Cuádriceps : Femorales — ${formatRatio(muscleVolumeSummary.quadHamstringRatio)}`
              : null}
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            Compara cuánto trabajo recibe cada lado de un par opuesto. Un desequilibrio sostenido no es una urgencia,
            pero con el tiempo limita el lado que menos trabajas.
          </p>
        </DisclosureSection>
      ) : null}

      {muscleVolumeSummary && muscleVolumeSummary.painByLocation.length > 0 ? (
        /* Opens itself when something crossed the app's own progression gate.
           A pain section closed by default is a pain section never read — and
           unlike the two beside it, this one can be time-critical. Quiet when
           nothing crossed it, unmissable when something did. */
        <DisclosureSection
          title={
            muscleVolumeSummary.painByLocation.every((row) => !row.isInferred)
              ? "Dónde te ha dolido"
              : "Dónde te ha dolido (algunas series son estimadas)"
          }
          defaultOpen={muscleVolumeSummary.painByLocation.some((row) => row.setsAboveThreshold > 0)}
          tone={muscleVolumeSummary.painByLocation.some((row) => row.setsAboveThreshold > 0) ? "alert" : "default"}
        >
          {/* Rows the athlete actually located are stated plainly. Rows
              inferred from the joints an exercise loads keep hedging —
              that path would happily report "hombro" for a hurting wrist,
              and it still runs for sets logged before painLocation
              existed. Never present the two identically. */}
          <ul className="grid grid-cols-1 gap-1">
            {muscleVolumeSummary.painByLocation.map((row) => (
              <li key={row.location} className="text-sm leading-6 text-zinc-300">
                {painLocationLabelsEs[row.location]}
                {row.isInferred ? <span className="text-zinc-500"> (estimado)</span> : null} — dolor máx.{" "}
                {row.maxPainScore}
                {row.setsAboveThreshold > 0 ? (
                  <span className="text-zinc-400">
                    {" "}
                    · {row.setsAboveThreshold} {row.setsAboveThreshold === 1 ? "serie" : "series"} sobre 2 (
                    {row.exerciseNamesEs.join(", ")})
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            Lo marcado como <span className="italic">estimado</span> viene de series registradas antes de que la app
            preguntara dónde dolía: ahí sólo puede repartir el dolor entre las articulaciones que carga el ejercicio. El
            resto es lo que anotaste tú. En ningún caso es un diagnóstico. Con dolor sobre 2 no conviene progresar;
            sobre 3, reduce o modifica el ejercicio.
          </p>
        </DisclosureSection>
      ) : null}

      {exerciseSeriesGroups.length > 0 ? (
        <section className="mt-7 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800" aria-labelledby="progression-title">
          <p id="progression-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Ejercicios por grupo muscular
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">Toca un ejercicio para ver su progresión.</p>
          <div className="mt-3">
            <ExerciseGroupList groups={exerciseSeriesGroups} defaultExerciseName={defaultExerciseName} />
          </div>
        </section>
      ) : null}

      {/* "Mejoras recientes" used to sit here: one full card per exercise
          restating the same per-exercise deltas that "Ejercicios que más
          mejoraron" ranks above and "¿Está funcionando?" rolls up by muscle
          group — three renderings of one comparison. The ranked list keeps the
          conclusion, and the per-exercise chart below keeps the detail
          (including the left/right asymmetry these cards were the only other
          place to see), so nothing is actually lost by removing them. */}

      {consistencySummary ? (
        <section className="mt-7 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800" aria-labelledby="consistency-title">
          <p id="consistency-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Consistencia semanal
          </p>
          <div className="mt-3">
            <BarChart
              bars={buildConsistencyBars(consistencySummary)}
              targetValue={consistencySummary.targetDaysPerWeek}
              targetLabel={`${consistencySummary.targetDaysPerWeek} días/semana`}
              ariaLabel="Días entrenados por semana"
            />
          </div>
        </section>
      ) : null}

      {muscleVolumeSummary && muscleVolumeSummary.unclassifiedExerciseNames.length > 0 ? (
        /* Housekeeping, not a reading: these sets are missing a muscle group,
           which is fixed in the plan editor. It sat inside the volume card
           where it interrupted the scroll every visit; down here it's findable
           without being in the way. */
        <DisclosureSection title={`Sin clasificar (${muscleVolumeSummary.unclassifiedExerciseNames.length})`}>
          <p className="text-xs leading-5 text-zinc-400">
            Estas series no se cuentan en ningún grupo muscular. Asigna su grupo al editar el plan.
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-1">
            {muscleVolumeSummary.unclassifiedExerciseNames.map((name) => (
              <li key={name} className="text-sm leading-6 text-zinc-300">
                {name}
              </li>
            ))}
          </ul>
          <Link
            href="/plan/builder"
            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Editar plan
          </Link>
        </DisclosureSection>
      ) : null}

      <section className="mt-6 grid grid-cols-1 gap-3 pb-10" aria-labelledby="history-title">
        <p id="history-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Historial de sesiones
        </p>
        <div className="grid grid-cols-1 gap-2">
          {completedSessions.map(({ session, template }) => (
            <Link
              key={session.id}
              href={`/entrenar/${session.id}`}
              className="block rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Día {template.dayIndex} · {formatDate(session.completedAt)}
                {formatSessionDuration(session.startedAt, session.completedAt)}
                {formatTrainingLoad(computeSessionTrainingLoad(session))}
              </p>
              <p className="mt-1 font-semibold text-zinc-100">{template.nameEs}</p>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

/**
 * A top-level section that stays closed until asked for.
 *
 * The three things split out of the volume card are all reference material —
 * consulted when a question comes up, not read every visit. Closed by default
 * they cost one line of scroll each instead of a screen.
 *
 * `defaultOpen` exists for the one case that must not wait to be asked for:
 * pain that crossed the app's own progression threshold.
 */
function DisclosureSection({
  title,
  defaultOpen = false,
  tone = "default",
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  tone?: "default" | "alert";
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={`group mt-7 rounded-2xl bg-zinc-900 p-3 ring-1 ${
        tone === "alert" ? "ring-rose-400/30" : "ring-zinc-800"
      }`}
    >
      {/* Same chevron affordance MuscleVolumeChart's disclosure already uses,
          rather than a second convention: without it a closed section reads as
          an inert heading and never gets opened. */}
      <summary className="flex min-h-11 w-full cursor-pointer list-none items-center gap-2 text-left [&::-webkit-details-marker]:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-150 group-open:rotate-180 group-open:text-zinc-300"
        />
        <span
          className={`min-w-0 text-sm font-semibold uppercase tracking-[0.22em] ${
            tone === "alert" ? "text-rose-300" : "text-zinc-400"
          }`}
        >
          {title}
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function KpiTile({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800">
      <p className="text-[0.65rem] font-semibold tracking-wide text-zinc-400 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-400">{sublabel}</p>
    </div>
  );
}

/**
 * The mobility half of the goal, finally on the page that reports progress.
 *
 * States no age comparison, on purpose: published norms for both tests start
 * at 60 and the sources covering 40-59 disagree, so "you perform like someone
 * 8 years younger" would be invented clinical data. First-vs-latest on the
 * athlete's own numbers needs no such claim.
 */
function FunctionalCapacityCard({ summary }: { summary: FunctionalCapacitySummary }) {
  if (summary.latestSitToStandReps === null && summary.latestBalanceSeconds === null) {
    return null;
  }

  return (
    <section
      className="mt-7 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800"
      aria-labelledby="functional-capacity-title"
    >
      <h2 id="functional-capacity-title" className="text-lg font-semibold">
        Capacidad funcional
      </h2>
      <p className="mt-1 text-xs leading-5 text-zinc-400">
        Fuerza para levantarte y equilibrio con los ojos cerrados. Comparado con tu primera prueba, no con una
        tabla por edad.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Sentadillas 30 s</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {summary.latestSitToStandReps ?? "—"}
            <span className="ml-1 text-sm font-medium text-zinc-400">reps</span>
          </p>
          {summary.sitToStandTrend ? (
            <p
              className={`mt-1 text-xs ${
                summary.sitToStandTrend.delta > 0 ? "text-emerald-300" : "text-zinc-400"
              }`}
            >
              {summary.sitToStandTrend.delta > 0 ? "+" : ""}
              {summary.sitToStandTrend.delta} desde {summary.sitToStandTrend.first}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Equilibrio</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {summary.latestBalanceSeconds ?? "—"}
            <span className="ml-1 text-sm font-medium text-zinc-400">s</span>
          </p>
          {summary.balanceTrend ? (
            <p
              className={`mt-1 text-xs ${
                summary.balanceTrend.delta > 0 ? "text-emerald-300" : "text-zinc-400"
              }`}
            >
              {summary.balanceTrend.delta > 0 ? "+" : ""}
              {summary.balanceTrend.delta} desde {summary.balanceTrend.first}
            </p>
          ) : null}
        </div>
      </div>

      {summary.balanceSymmetry?.belowThreshold ? (
        <p className="mt-3 text-sm leading-6 text-amber-200">
          Equilibrio desigual: {summary.balanceSymmetry.leftSeconds}s izq vs{" "}
          {summary.balanceSymmetry.rightSeconds}s der ({summary.balanceSymmetry.indexPercent}%).
        </p>
      ) : null}

      {summary.retestDue ? (
        <p className="mt-3 text-xs leading-5 text-zinc-400">Toca repetir las pruebas desde Mediciones.</p>
      ) : null}
    </section>
  );
}

/**
 * Performance-based limb symmetry, placed immediately above the tape-measure
 * trend because it answers the same question with a number that can actually
 * move. The girth gap stays on /mediciones as context; it is not repeated here
 * as a goal.
 *
 * Renders nothing until a test exists. An empty state on /progreso would be a
 * fifth thing telling the athlete what they have not done; the prompt to run
 * the test lives on /mediciones, where the form is.
 */
function LimbSymmetryCard({ summary }: { summary: LimbSymmetrySummary }) {
  if (summary.worst === null) {
    return null;
  }

  const { worst } = summary;

  return (
    <section
      className="mt-7 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800"
      aria-labelledby="limb-symmetry-title"
    >
      <h2 id="limb-symmetry-title" className="text-lg font-semibold">
        Simetría entre piernas
      </h2>
      <p className="mt-1 text-xs leading-5 text-zinc-400">
        Repeticiones del lado débil frente al fuerte, con el mismo peso y sin tope. Por debajo de{" "}
        {LSI_FLAG_THRESHOLD}% se considera una diferencia a trabajar.
      </p>

      <p className={`mt-3 text-3xl font-semibold ${worst.belowThreshold ? "text-amber-200" : "text-zinc-100"}`}>
        {worst.indexPercent}%
      </p>
      <p className="mt-1 text-sm leading-6 text-zinc-300">
        {worst.exerciseNameEs} — {worst.leftReps} izq vs {worst.rightReps} der con {worst.testWeightKg}kg
      </p>

      {summary.latestByExercise.length > 1 ? (
        <ul className="mt-3 grid gap-1 text-sm leading-6 text-zinc-300">
          {summary.latestByExercise
            .filter((result) => result.id !== worst.id)
            .map((result) => (
              <li key={result.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span>{result.exerciseNameEs}</span>
                <span className={result.belowThreshold ? "font-semibold text-amber-200" : "font-semibold"}>
                  {result.indexPercent}%
                </span>
              </li>
            ))}
        </ul>
      ) : null}

      {summary.retestDue ? (
        <p className="mt-3 text-xs leading-5 text-zinc-400">
          Toca repetir la prueba desde Mediciones.
        </p>
      ) : null}
    </section>
  );
}

function BodyMeasurementTrendCard({
  trend,
  measurementSeries,
}: {
  trend: BodyMeasurementTrend;
  measurementSeries: MeasurementSeriesPoint[];
}) {
  return (
    <section className="mt-7 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800" aria-labelledby="body-trend-title">
      <div className="flex items-center justify-between gap-3">
        <p id="body-trend-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Tendencia corporal
        </p>
        <Link href="/mediciones" className="inline-flex min-h-11 items-center text-xs font-semibold text-emerald-300">
          Ver mediciones
        </Link>
      </div>

      {/* States its own timescale, because the honest answer to "did this
          week work?" from a tape measure is that it cannot tell you. Without
          this line the card invites being read week to week, where the only
          thing it can show is noise. */}
      <p className="mt-1 text-xs leading-5 text-zinc-400">
        La prueba de que el entrenamiento se convirtió en músculo. Se lee en bloques de 8 a 12 semanas, no de una
        semana a otra.
      </p>

      {trend.measurementCount === 1 ? (
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          1 medición registrada el {formatDate(trend.latestMeasuredAt)}. Guarda otra para ver una tendencia.
        </p>
      ) : (
        <>
          <div className="mt-3">
            <MeasurementSeriesChart points={measurementSeries} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-1 text-sm leading-6 text-zinc-300">
            {trend.bodyWeightKg ? (
              <p>
                Peso: {trend.bodyWeightKg.firstValue.toFixed(1)}kg → {trend.bodyWeightKg.latestValue.toFixed(1)}kg (
                {formatSignedDelta(trend.bodyWeightKg.deltaValue)}kg)
              </p>
            ) : null}
            {trend.waistCm ? (
              <p>
                Cintura: {trend.waistCm.firstValue.toFixed(1)}cm → {trend.waistCm.latestValue.toFixed(1)}cm (
                {formatSignedDelta(trend.waistCm.deltaValue)}cm)
              </p>
            ) : null}
            {trend.chestCm ? (
              <p>
                Pecho: {trend.chestCm.firstValue.toFixed(1)}cm → {trend.chestCm.latestValue.toFixed(1)}cm (
                {formatSignedDelta(trend.chestCm.deltaValue)}cm)
              </p>
            ) : null}
            {trend.hipsCm ? (
              <p>
                Caderas: {trend.hipsCm.firstValue.toFixed(1)}cm → {trend.hipsCm.latestValue.toFixed(1)}cm (
                {formatSignedDelta(trend.hipsCm.deltaValue)}cm)
              </p>
            ) : null}
            {trend.latestThighGapCm !== null || trend.latestCalfGapCm !== null ? (
              <p className="text-xs text-zinc-400">
                Última asimetría — Muslo: {formatGap(trend.latestThighGapCm)}
                {trend.thighGapImproved ? " (mejoró vs. la anterior)" : ""} · Pantorrilla:{" "}
                {formatGap(trend.latestCalfGapCm)}
                {trend.calfGapImproved ? " (mejoró vs. la anterior)" : ""}
              </p>
            ) : null}
            <p className="text-xs text-zinc-400">
              {trend.measurementCount} mediciones desde {formatDate(trend.firstMeasuredAt)}
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function formatSignedDelta(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

function formatGap(value: number | null) {
  if (value === null) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}cm`;
}

/**
 * Renders a ratio the way a coach says it, with the smaller side normalised to 1.
 *
 * `value` is always left÷right for the label it accompanies — e.g.
 * quadHamstringRatio is cuádriceps÷femorales, so 4 and 6 give 0.667 and must
 * read "1 : 1.5" (there is MORE femoral work), not "1.5 : 1".
 *
 * Both branches were inverted when this shipped, which made the real dashboard
 * claim the opposite of the data. Exported solely so the test can pin it.
 */
export function formatRatio(value: number): string {
  return value >= 1 ? `${value.toFixed(1)} : 1` : `1 : ${(1 / value).toFixed(1)}`;
}

function formatDate(date: Date | null) {
  if (!date) {
    return "";
  }
  return formatShortDateEs(date);
}

function formatSessionDuration(startedAt: Date | null, completedAt: Date | null) {
  if (!startedAt || !completedAt) {
    return "";
  }
  const minutes = Math.round((completedAt.getTime() - startedAt.getTime()) / 60000);
  if (minutes <= 0) {
    return "";
  }
  return ` · ${minutes} min`;
}

function formatTrainingLoad(trainingLoad: number | null) {
  if (trainingLoad === null) {
    return "";
  }
  return ` · ${trainingLoad} UA`;
}
