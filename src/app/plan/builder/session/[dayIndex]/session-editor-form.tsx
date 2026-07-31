"use client";

import { useRef, useState } from "react";

import { MIN_SESSION_EXERCISES } from "@/plans/generated-plan-schema";
import { convertDurationValue, durationInputToSeconds, secondsToDurationInput } from "@/training/duration";
import type { DurationUnit } from "@/training/duration";
import { rirLabelsEs, rirValues } from "@/training/rir";
import type { LoadMechanism } from "@/workouts/progression-view";

import { SubmitButton } from "../../../../submit-button";

type Phase = "warmup" | "main" | "accessory" | "mobility";
type PrescriptionType = "strength" | "duration";

export type SessionEditorInitialExercise = {
  exerciseNameEs: string;
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

type ExerciseRowValue = SessionEditorInitialExercise & { key: string };

function blankRow(key: string): ExerciseRowValue {
  return {
    key,
    exerciseNameEs: "",
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
  };
}

export function SessionEditorForm({
  action,
  draftPlanId,
  dayIndex,
  initialNameEs,
  initialFocus,
  initialExercises,
}: {
  action: (formData: FormData) => void | Promise<void>;
  draftPlanId: string;
  dayIndex: number;
  initialNameEs: string;
  initialFocus: string;
  initialExercises: SessionEditorInitialExercise[];
}) {
  const nextKeyRef = useRef(Math.max(initialExercises.length, 1));
  const [rows, setRows] = useState<ExerciseRowValue[]>(() =>
    initialExercises.length > 0
      ? initialExercises.map((exercise, index) => ({ ...exercise, key: `row-${index}` }))
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

  return (
    <form action={action} className="mt-6 grid gap-4 pb-10">
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

      <p className="text-xs leading-5 text-zinc-500">
        Necesitas al menos {MIN_SESSION_EXERCISES} ejercicios en esta sesión para poder activar el plan
        ({rows.length}/{MIN_SESSION_EXERCISES} por ahora).
      </p>

      <div className="grid gap-3">
        {rows.map((row, index) => (
          <ExerciseRowFields
            key={row.key}
            index={index}
            value={row}
            onRemove={() => removeRow(row.key)}
            canRemove={rows.length > 1}
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
}: {
  index: number;
  value: ExerciseRowValue;
  onRemove: () => void;
  canRemove: boolean;
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

  function handleDurationUnitChange(nextUnit: DurationUnit) {
    setDurationValue((current) => (current === "" ? current : convertDurationValue(current, durationUnit, nextUnit)));
    setDurationUnit(nextUnit);
  }

  const durationSecondsToSubmit = durationValue === "" ? "" : durationInputToSeconds(durationValue, durationUnit);

  return (
    <section className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Ejercicio {index + 1}</p>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-amber-200 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            Eliminar
          </button>
        ) : null}
      </div>

      <label className="mt-3 grid gap-1 text-sm font-medium text-zinc-300">
        <span>Nombre del ejercicio</span>
        <input
          name={`${prefix}:exerciseNameEs`}
          type="text"
          maxLength={200}
          defaultValue={value.exerciseNameEs}
          className="input"
          placeholder="Prensa de piernas"
        />
      </label>

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
      <p className="mt-1 text-xs leading-5 text-zinc-500">
        Duración es para calentamientos de cardio (escaladora, cinta) o movilidad — no aplica RIR ni rango de reps.
      </p>

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
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Esto no clasifica el ejercicio — solo define cómo se sugiere el aumento de peso en Entrenar (ej. máquina
            compuesta: +5%; aislamiento: suma una repetición en vez de subir peso).
          </p>
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
    </section>
  );
}

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
