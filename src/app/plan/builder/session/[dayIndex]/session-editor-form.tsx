"use client";

import { useRef, useState } from "react";

import { rirLabelsEs, rirValues } from "@/training/rir";

import { SubmitButton } from "../../../../submit-button";

type Phase = "warmup" | "main" | "accessory" | "mobility";
type SideMode = "bilateral" | "unilateral_separate" | "unilateral_matched";
type IncrementCategory = "machine_or_lower_body" | "upper_compound" | "isolation" | "dumbbell";

export type SessionEditorInitialExercise = {
  exerciseNameEs: string;
  phase: Phase;
  sideMode: SideMode;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  targetRir: number;
  restSeconds: number;
  notesEs: string;
  painSensitive: boolean;
  substitutionOptionsEs: string[];
  incrementCategory: IncrementCategory | null;
};

type ExerciseRowValue = SessionEditorInitialExercise & { key: string };

function blankRow(key: string): ExerciseRowValue {
  return {
    key,
    exerciseNameEs: "",
    phase: "main",
    sideMode: "bilateral",
    targetSets: 3,
    targetRepMin: 8,
    targetRepMax: 12,
    targetRir: 2,
    restSeconds: 90,
    notesEs: "",
    painSensitive: false,
    substitutionOptionsEs: [],
    incrementCategory: null,
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
        <label className="grid gap-1 text-sm font-medium text-zinc-300">
          <span>Modo</span>
          <select name={`${prefix}:sideMode`} defaultValue={value.sideMode} className="input">
            {sideModeOptions.map(([option, labelEs]) => (
              <option key={option} value={option}>
                {labelEs}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
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
            defaultValue={value.targetRepMin}
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
            defaultValue={value.targetRepMax}
            className="input"
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm font-medium text-zinc-300">
          <span>RIR objetivo</span>
          <select name={`${prefix}:targetRir`} defaultValue={value.targetRir} className="input">
            {rirValues.map((rir) => (
              <option key={rir} value={rir}>
                {rirLabelsEs[rir]}
              </option>
            ))}
          </select>
        </label>
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

      <label className="mt-3 grid gap-1 text-sm font-medium text-zinc-300">
        <span>Categoría de incremento (opcional)</span>
        <select name={`${prefix}:incrementCategory`} defaultValue={value.incrementCategory ?? ""} className="input">
          <option value="">Sin especificar</option>
          {incrementCategoryOptions.map(([option, labelEs]) => (
            <option key={option} value={option}>
              {labelEs}
            </option>
          ))}
        </select>
      </label>

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

const sideModeOptions: Array<[SideMode, string]> = [
  ["bilateral", "Bilateral"],
  ["unilateral_separate", "Unilateral separado"],
  ["unilateral_matched", "Unilateral pareado"],
];

const incrementCategoryOptions: Array<[IncrementCategory, string]> = [
  ["machine_or_lower_body", "Máquina o tren inferior"],
  ["upper_compound", "Compuesto tren superior"],
  ["isolation", "Aislamiento"],
  ["dumbbell", "Mancuerna"],
];
