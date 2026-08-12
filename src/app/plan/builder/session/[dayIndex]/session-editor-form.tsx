"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Info } from "lucide-react";

import { MIN_SESSION_EXERCISES } from "@/plans/generated-plan-schema";
import type { ExercisePrescriptionDefaults } from "@/plans/plan-builder-repository";
import { convertDurationValue, durationInputToSeconds, secondsToDurationInput } from "@/training/duration";
import type { DurationUnit } from "@/training/duration";
import { exerciseCatalog, muscleGroupLabelsEs, muscleGroups } from "@/training/muscle-taxonomy";
import { rirLabelsEs, rirValues } from "@/training/rir";
import { buildYoutubeTechniqueSearchUrl } from "@/training/youtube-technique";
import type { LoadMechanism } from "@/workouts/progression-view";

import { SubmitButton } from "../../../../submit-button";
import { YoutubeTechniqueIcon } from "../../../../youtube-technique-link";

type Phase = "warmup" | "main" | "accessory" | "mobility";
type PrescriptionType = "strength" | "duration";

export type SessionEditorInitialExercise = {
  exerciseNameEs: string;
  exerciseId: string | null;
  phase: Phase;
  isUnilateral: boolean;
  prescriptionType: PrescriptionType;
  targetSets: number;
  targetRepMin: number | null;
  targetRepMax: number | null;
  targetRir: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  notesEs: string;
  painSensitive: boolean;
  substitutionOptionsEs: string[];
  loadMechanism: LoadMechanism | null;
  isCompound: boolean | null;
};

type ExerciseRowValue = SessionEditorInitialExercise & { key: string; prefilledFromHistory: boolean };

function blankRow(key: string): ExerciseRowValue {
  return {
    key,
    exerciseNameEs: "",
    exerciseId: null,
    phase: "main",
    isUnilateral: false,
    prescriptionType: "strength",
    targetSets: 3,
    targetRepMin: 8,
    targetRepMax: 12,
    targetRir: 2,
    durationSeconds: 60,
    restSeconds: 90,
    notesEs: "",
    painSensitive: false,
    substitutionOptionsEs: [],
    loadMechanism: null,
    isCompound: null,
    prefilledFromHistory: false,
  };
}

const KNOWN_EXERCISE_NAMES_DATALIST_ID = "known-exercise-names";

export function SessionEditorForm({
  action,
  draftPlanId,
  dayIndex,
  initialNameEs,
  initialFocus,
  initialExercises,
  knownExerciseNames,
  exerciseDefaultsByName,
}: {
  action: (formData: FormData) => void | Promise<void>;
  draftPlanId: string;
  dayIndex: number;
  initialNameEs: string;
  initialFocus: string;
  initialExercises: SessionEditorInitialExercise[];
  knownExerciseNames: string[];
  exerciseDefaultsByName: Record<string, ExercisePrescriptionDefaults>;
}) {
  const nextKeyRef = useRef(Math.max(initialExercises.length, 1));
  const [rows, setRows] = useState<ExerciseRowValue[]>(() =>
    initialExercises.length > 0
      ? initialExercises.map((exercise, index) => ({ ...exercise, key: `row-${index}`, prefilledFromHistory: false }))
      : [blankRow("row-0")],
  );

  function addRow() {
    const key = `row-${nextKeyRef.current}`;
    nextKeyRef.current += 1;
    setRows((current) => [...current, blankRow(key)]);
  }

  function removeRow(key: string) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));
  }

  function moveRow(key: string, direction: -1 | 1) {
    setRows((current) => {
      const index = current.findIndex((row) => row.key === key);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  // Fields are otherwise uncontrolled (read straight from the DOM on submit),
  // so prefilling requires forcing a remount: bumping the row's key makes
  // React re-read fresh defaultValues from the updated row instead of
  // leaving the already-mounted inputs untouched. Only fires when the name
  // actually changed, so tabbing through an already-filled row (editing an
  // existing session) never clobbers values the user already set on purpose.
  function applyKnownExerciseDefaults(key: string, name: string) {
    const defaults = exerciseDefaultsByName[name];
    if (!defaults) {
      return;
    }
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key || row.exerciseNameEs === name) {
          return row;
        }
        const nextKey = `row-${nextKeyRef.current}`;
        nextKeyRef.current += 1;
        return { ...row, ...defaults, exerciseNameEs: name, key: nextKey, prefilledFromHistory: true };
      }),
    );
  }

  return (
    <form action={action} className="mt-6 grid grid-cols-1 gap-4 pb-10">
      <input type="hidden" name="draftPlanId" value={draftPlanId} />
      <input type="hidden" name="dayIndex" value={dayIndex} />
      <input type="hidden" name="rowCount" value={rows.length} />

      <section className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
        <label className="grid gap-1 text-sm font-medium text-zinc-300">
          <span>Nombre de la sesión</span>
          <input
            name="nameEs"
            type="text"
            maxLength={120}
            required
            defaultValue={initialNameEs}
            className="input"
            placeholder="Pierna — cuádriceps"
          />
        </label>
        <label className="mt-3 grid gap-1 text-sm font-medium text-zinc-300">
          <span>Enfoque</span>
          <input
            name="focus"
            type="text"
            maxLength={200}
            required
            defaultValue={initialFocus}
            className="input"
            placeholder="Cuádriceps y pantorrilla"
          />
        </label>
      </section>

      <p className="text-xs leading-5 text-zinc-400">
        Necesitas al menos {MIN_SESSION_EXERCISES} ejercicios en esta sesión para poder activar el plan
        ({rows.length}/{MIN_SESSION_EXERCISES} por ahora).
      </p>

      <datalist id={KNOWN_EXERCISE_NAMES_DATALIST_ID}>
        {knownExerciseNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className="grid grid-cols-1 gap-3">
        {rows.map((row, index) => (
          <ExerciseRowFields
            key={row.key}
            index={index}
            value={row}
            onRemove={() => removeRow(row.key)}
            canRemove={rows.length > 1}
            onMoveUp={() => moveRow(row.key, -1)}
            onMoveDown={() => moveRow(row.key, 1)}
            canMoveUp={index > 0}
            canMoveDown={index < rows.length - 1}
            onPrefill={(name) => applyKnownExerciseDefaults(row.key, name)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="min-h-12 rounded-2xl bg-zinc-900 px-4 text-sm font-semibold text-emerald-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
      >
        + Agregar ejercicio
      </button>

      <SubmitButton className="rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100">
        Guardar sesión
      </SubmitButton>
    </form>
  );
}

function ExerciseRowFields({
  index,
  value,
  onRemove,
  canRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onPrefill,
}: {
  index: number;
  value: ExerciseRowValue;
  onRemove: () => void;
  canRemove: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onPrefill: (name: string) => void;
}) {
  const prefix = `exercise-${index}`;
  // Controlled locally (unlike every other field in this form) because it
  // decides which other fields render — an uncontrolled select can't drive
  // conditional JSX on change.
  const [prescriptionType, setPrescriptionType] = useState<PrescriptionType>(value.prescriptionType);
  const isDuration = prescriptionType === "duration";

  const initialDuration = secondsToDurationInput(value.durationSeconds);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(initialDuration.unit);
  const [durationValue, setDurationValue] = useState<number | "">(initialDuration.value);

  // Name and isUnilateral are uncontrolled (see the form-level comment above)
  // so the live-typed value only exists in the DOM, not in `value` — read it
  // straight off the inputs at click time rather than adding controlled state
  // just for this button.
  const nameInputRef = useRef<HTMLInputElement>(null);
  const unilateralInputRef = useRef<HTMLInputElement>(null);

  // Mirrors of a few otherwise-uncontrolled fields, tracked only to compose
  // the collapsed-row summary line below — the inputs themselves stay
  // uncontrolled (defaultValue, read via FormData on submit) exactly as
  // before; this is purely a read-side echo, same shape as prescriptionType.
  const [summaryName, setSummaryName] = useState(value.exerciseNameEs);
  const [summarySets, setSummarySets] = useState(value.targetSets);
  const [summaryRepMin, setSummaryRepMin] = useState(value.targetRepMin ?? 8);
  const [summaryRepMax, setSummaryRepMax] = useState(value.targetRepMax ?? 12);
  const [summaryExerciseId, setSummaryExerciseId] = useState(value.exerciseId ?? "");

  function openYoutubeTechnique() {
    const nameEs = nameInputRef.current?.value.trim();
    if (!nameEs) {
      return;
    }
    const isUnilateralNow = unilateralInputRef.current?.checked ?? false;
    window.open(buildYoutubeTechniqueSearchUrl({ nameEs, isUnilateral: isUnilateralNow }), "_blank", "noopener,noreferrer");
  }

  function handleDurationUnitChange(nextUnit: DurationUnit) {
    setDurationValue((current) => (current === "" ? current : convertDurationValue(current, durationUnit, nextUnit)));
    setDurationUnit(nextUnit);
  }

  const durationSecondsToSubmit = durationValue === "" ? "" : durationInputToSeconds(durationValue, durationUnit);

  const muscleGroupLabel = summaryExerciseId
    ? exerciseCatalog.find((catalogEntry) => catalogEntry.slug === summaryExerciseId)?.nameEs
    : undefined;
  const statsSummary = isDuration
    ? `Duración · ${summarySets} ${summarySets === 1 ? "ronda" : "rondas"}${
        durationValue === "" ? "" : ` · ${durationValue}${durationUnit === "minutes" ? " min" : " s"}`
      }`
    : `Fuerza · ${summarySets}×${summaryRepMin}-${summaryRepMax}`;
  const summaryLine = [statsSummary, muscleGroupLabel].filter(Boolean).join(" · ");

  return (
    // Collapsed by default only for an exercise that already has a name (an
    // existing row you're scanning, not actively editing); a fresh blank row
    // opens immediately since there's nothing to summarize yet and you're
    // about to type into it. A row that was *just* prefilled from history
    // also stays open — remounting-then-immediately-hiding the very fields
    // and confirmation message that prefill just populated would bury the
    // one moment this feedback matters. `open` only reflects this once, on
    // mount — `value` is a stable prop outside of the remount-on-prefill
    // case (see the form-level comment on applyKnownExerciseDefaults), so it
    // never fights a user's manual expand/collapse on a later re-render.
    <details
      open={!value.exerciseNameEs || value.prefilledFromHistory}
      className="group rounded-3xl bg-zinc-900 ring-1 ring-zinc-800"
    >
      <summary className="flex list-none cursor-pointer flex-col gap-1 p-4 [&::-webkit-details-marker]:hidden">
        {/* Reorder/delete only share a row with the small eyebrow label, not
            the name or stats line below — those get the card's full width to
            themselves instead of being squeezed into whatever's left beside
            the button cluster for their entire height. */}
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Ejercicio {index + 1}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-150 group-open:rotate-180 group-open:text-zinc-300"
            />
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onMoveUp();
              }}
              disabled={!canMoveUp}
              aria-label="Mover arriba"
              className="rounded-xl bg-zinc-950 p-2.5 text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onMoveDown();
              }}
              disabled={!canMoveDown}
              aria-label="Mover abajo"
              className="rounded-xl bg-zinc-950 p-2.5 text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-30"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            {canRemove ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  onRemove();
                }}
                className="ml-1.5 rounded-xl bg-zinc-950 px-3 py-2.5 text-xs font-semibold text-amber-200 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                Eliminar
              </button>
            ) : null}
          </span>
        </span>
        <span className="block text-base font-semibold text-zinc-100">
          {summaryName.trim() || "Sin nombre todavía"}
        </span>
        <span className="block text-xs text-zinc-400">{summaryLine}</span>
      </summary>

      <div className="border-t border-zinc-800/80 px-4 pb-4 pt-4">
        <div className="flex items-end gap-2">
          <label className="grid flex-1 gap-1 text-sm font-medium text-zinc-300">
            <span>Nombre del ejercicio</span>
            <input
              ref={nameInputRef}
              name={`${prefix}:exerciseNameEs`}
              type="text"
              maxLength={200}
              defaultValue={value.exerciseNameEs}
              onChange={(event) => setSummaryName(event.target.value)}
              onBlur={(event) => onPrefill(event.target.value.trim())}
              className="input"
              placeholder="Prensa de piernas"
              list={KNOWN_EXERCISE_NAMES_DATALIST_ID}
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            onClick={openYoutubeTechnique}
            aria-label="Ver técnica en YouTube"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 active:text-emerald-300"
          >
            <YoutubeTechniqueIcon className="h-5 w-5" />
          </button>
        </div>
        {value.prefilledFromHistory ? (
          <p className="mt-1 text-xs leading-5 text-emerald-300">
            Series, reps y RIR se llenaron con tu configuración más reciente de este ejercicio — puedes ajustarlos.
          </p>
        ) : null}

        <label className="mt-3 grid gap-1 text-sm font-medium text-zinc-300">
          <span>Tipo de ejercicio</span>
          <select
            name={`${prefix}:prescriptionType`}
            value={prescriptionType}
            onChange={(event) => setPrescriptionType(event.target.value as PrescriptionType)}
            className="input"
          >
            <option value="strength">Fuerza (series × repeticiones)</option>
            <option value="duration">Duración (calentamiento cardio, movilidad)</option>
          </select>
        </label>
        <HelpDisclosure label="¿Qué significa esto?">
          Duración es para calentamientos de cardio (escaladora, cinta) o movilidad — no aplica RIR ni rango de reps.
        </HelpDisclosure>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium text-zinc-300">
            <span>Fase</span>
            <select name={`${prefix}:phase`} defaultValue={value.phase} className="input">
              {phaseOptions.map(([option, labelEs]) => (
                <option key={option} value={option}>
                  {labelEs}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2.5 text-sm font-medium text-zinc-300">
            <input
              ref={unilateralInputRef}
              name={`${prefix}:isUnilateral`}
              type="checkbox"
              defaultChecked={value.isUnilateral}
              className="h-5 w-5 rounded border-zinc-700 bg-zinc-950"
            />
            <span>Unilateral (un lado a la vez)</span>
          </label>
        </div>

        {isDuration ? (
          <div key="duration-fields" className="mt-3 grid grid-cols-3 gap-3">
            <label className="grid gap-1 text-sm font-medium text-zinc-300">
              <span>Rondas</span>
              <input
                name={`${prefix}:targetSets`}
                type="number"
                inputMode="numeric"
                min={1}
                max={6}
                defaultValue={value.targetSets}
                onChange={(event) => setSummarySets(Number(event.target.value) || 0)}
                className="input"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-300">
              <span>Duración</span>
              <input
                type="number"
                inputMode={durationUnit === "minutes" ? "decimal" : "numeric"}
                step={durationUnit === "minutes" ? 0.5 : 1}
                min={durationUnit === "minutes" ? 0.5 : 5}
                max={durationUnit === "minutes" ? 60 : 3600}
                value={durationValue}
                onChange={(event) => setDurationValue(event.target.value === "" ? "" : Number(event.target.value))}
                className="input"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-300">
              <span>Unidad</span>
              <select
                value={durationUnit}
                onChange={(event) => handleDurationUnitChange(event.target.value as DurationUnit)}
                className="input"
              >
                <option value="seconds">Segundos</option>
                <option value="minutes">Minutos</option>
              </select>
            </label>
            <input type="hidden" name={`${prefix}:durationSeconds`} value={durationSecondsToSubmit} />
          </div>
        ) : (
          <div key="strength-fields" className="mt-3 grid grid-cols-3 gap-3">
            <label className="grid gap-1 text-sm font-medium text-zinc-300">
              <span>Series</span>
              <input
                name={`${prefix}:targetSets`}
                type="number"
                inputMode="numeric"
                min={1}
                max={6}
                defaultValue={value.targetSets}
                onChange={(event) => setSummarySets(Number(event.target.value) || 0)}
                className="input"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-300">
              <span>Reps mín.</span>
              <input
                name={`${prefix}:targetRepMin`}
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                defaultValue={value.targetRepMin ?? 8}
                onChange={(event) => setSummaryRepMin(Number(event.target.value) || 0)}
                className="input"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-300">
              <span>Reps máx.</span>
              <input
                name={`${prefix}:targetRepMax`}
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                defaultValue={value.targetRepMax ?? 12}
                onChange={(event) => setSummaryRepMax(Number(event.target.value) || 0)}
                className="input"
              />
            </label>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          {isDuration ? null : (
            <label className="grid gap-1 text-sm font-medium text-zinc-300">
              <span>RIR objetivo</span>
              <select name={`${prefix}:targetRir`} defaultValue={value.targetRir ?? 2} className="input">
                {rirValues.map((rir) => (
                  <option key={rir} value={rir}>
                    {rirLabelsEs[rir]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="grid gap-1 text-sm font-medium text-zinc-300">
            <span>Descanso (s)</span>
            <input
              name={`${prefix}:restSeconds`}
              type="number"
              inputMode="numeric"
              min={30}
              max={240}
              step={15}
              defaultValue={value.restSeconds}
              className="input"
            />
          </label>
        </div>

        <details className="mt-4 rounded-2xl bg-zinc-950/60 p-3 ring-1 ring-zinc-800/80">
          <summary className="min-h-11 cursor-pointer py-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Clasificación y notas
          </summary>
          <div className="mt-2">
            <label className="grid gap-1 text-sm font-medium text-zinc-300">
              <span>Grupo muscular</span>
              <select
                name={`${prefix}:exerciseId`}
                defaultValue={value.exerciseId ?? ""}
                onChange={(event) => setSummaryExerciseId(event.target.value)}
                className="input"
              >
                <option value="">Sin clasificar</option>
                {catalogByMuscleGroup.map(({ muscleGroup, entries }) => (
                  <optgroup key={muscleGroup} label={muscleGroupLabelsEs[muscleGroup]}>
                    {entries.map((catalogEntry) => (
                      <option key={catalogEntry.slug} value={catalogEntry.slug}>
                        {catalogEntry.nameEs}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <optgroup label="Cardio y acondicionamiento">
                  {cardioCatalogEntries.map((catalogEntry) => (
                    <option key={catalogEntry.slug} value={catalogEntry.slug}>
                      {catalogEntry.nameEs}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <HelpDisclosure label="¿Qué es esto?">
              Clasifica el ejercicio para el resumen de series por grupo muscular en Progreso. El nombre que
              escribiste arriba sigue siendo el que verás al entrenar.
            </HelpDisclosure>

            {isDuration ? null : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1 text-sm font-medium text-zinc-300">
                    <span>Mecanismo de carga (opcional)</span>
                    <select name={`${prefix}:loadMechanism`} defaultValue={value.loadMechanism ?? ""} className="input">
                      <option value="">Sin especificar</option>
                      {loadMechanismOptions.map(([option, labelEs]) => (
                        <option key={option} value={option}>
                          {labelEs}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-zinc-300">
                    <span>Tipo de movimiento (opcional)</span>
                    <select
                      name={`${prefix}:isCompound`}
                      defaultValue={value.isCompound === null ? "" : String(value.isCompound)}
                      className="input"
                    >
                      <option value="">Sin especificar</option>
                      <option value="true">Compuesto (varias articulaciones)</option>
                      <option value="false">Aislamiento (una articulación)</option>
                    </select>
                  </label>
                </div>
                <HelpDisclosure label="¿En qué se diferencia de Grupo muscular?">
                  Esto no es la clasificación muscular (esa es «Grupo muscular» arriba) — solo define cómo se
                  sugiere el aumento de peso en Entrenar (ej. máquina compuesta: +5%; aislamiento: suma una
                  repetición en vez de subir peso).
                </HelpDisclosure>
              </>
            )}

            <label className="mt-3 grid gap-1 text-sm font-medium text-zinc-300">
              <span>Sustituciones (separadas por coma, opcional)</span>
              <input
                name={`${prefix}:substitutionOptionsEs`}
                type="text"
                defaultValue={value.substitutionOptionsEs.join(", ")}
                className="input"
                placeholder="Máquina equivalente, Cable equivalente"
              />
            </label>

            <label className="mt-3 grid gap-1 text-sm font-medium text-zinc-300">
              <span>Notas (opcional)</span>
              <textarea
                name={`${prefix}:notesEs`}
                rows={2}
                defaultValue={value.notesEs}
                className="input resize-none"
                placeholder="Ajusta la carga y conserva técnica."
              />
            </label>

            <label className="mt-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <input
                name={`${prefix}:painSensitive`}
                type="checkbox"
                defaultChecked={value.painSensitive}
                className="h-5 w-5 rounded border-zinc-700 bg-zinc-950"
              />
              <span>Vigilar dolor en este ejercicio</span>
            </label>
          </div>
        </details>
      </div>
    </details>
  );
}

function HelpDisclosure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="mt-1 list-none text-xs text-zinc-400 [&::-webkit-details-marker]:hidden">
      <summary className="inline-flex min-h-6 cursor-pointer items-center gap-1 py-0.5 text-zinc-500">
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {label}
      </summary>
      <p className="mt-1 leading-5">{children}</p>
    </details>
  );
}

// Grouped once at module scope, not per render: the catalog is a static
// import and the same ~70 options are rendered for every exercise row.
const catalogByMuscleGroup = muscleGroups
  .map((muscleGroup) => ({
    muscleGroup,
    entries: exerciseCatalog.filter((catalogEntry) => catalogEntry.primaryMuscleGroup === muscleGroup),
  }))
  .filter((group) => group.entries.length > 0);

// Null primary group — known exercises that deliberately contribute no
// effective sets, kept selectable so cardio rows can still be classified.
const cardioCatalogEntries = exerciseCatalog.filter((catalogEntry) => catalogEntry.primaryMuscleGroup === null);

const phaseOptions: Array<[Phase, string]> = [
  ["warmup", "Calentamiento"],
  ["main", "Principal"],
  ["accessory", "Accesorio"],
  ["mobility", "Movilidad"],
];

const loadMechanismOptions: Array<[LoadMechanism, string]> = [
  ["bodyweight", "Peso corporal"],
  ["dumbbell", "Mancuerna"],
  ["machine", "Máquina o cable"],
  ["barbell", "Barra libre"],
];
