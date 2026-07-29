"use client";

import { useMemo, useRef, useState } from "react";

import { baselineExerciseDefinitions } from "@/baseline/baseline-exercises";
import { getBaselineSides, type BaselineLiftInput } from "@/baseline/baseline-schema";
import { rirLabelsEs, rirValues } from "@/training/rir";

import { SubmitButton } from "../submit-button";

type BaselineSavedLift = {
  exerciseSlug: string;
  side: BaselineLiftInput["side"];
  weightKg: string;
  reps: number;
  sets: number;
  rir: number;
  painScore: number;
  notes: string | null;
};

type BaselineProgress = {
  completedExerciseSlugs: Set<string>;
  completedRowCount: number;
};

export function BaselineIntakeForm({
  action,
  savedLifts,
}: {
  action: (formData: FormData) => void | Promise<void>;
  savedLifts: BaselineSavedLift[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const savedByKey = useMemo(
    () => new Map(savedLifts.map((lift) => [`${lift.exerciseSlug}:${lift.side}`, lift])),
    [savedLifts],
  );
  const [progress, setProgress] = useState(() => getSavedProgress(savedLifts));
  const completedCount = progress.completedExerciseSlugs.size;
  const totalExercises = baselineExerciseDefinitions.length;
  const firstIncomplete = baselineExerciseDefinitions.find(
    (exercise) => !progress.completedExerciseSlugs.has(exercise.slug),
  );

  function updateProgress() {
    if (!formRef.current) {
      return;
    }

    setProgress(getFormProgress(new FormData(formRef.current)));
  }

  return (
    <form
      ref={formRef}
      action={action}
      onInput={updateProgress}
      onChange={updateProgress}
      className="mt-6 grid gap-5 pb-10"
    >
      <section className="sticky top-2 z-10 rounded-3xl bg-zinc-900/95 p-4 shadow-2xl shadow-black/40 ring-1 ring-emerald-400/30 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              {completedCount}/{totalExercises} ejercicios con datos
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-300">
              {progress.completedRowCount} filas completas. Una fila válida requiere kg, reps, series, RIR y dolor.
            </p>
          </div>
          {firstIncomplete ? (
            <a
              href={`#baseline-${firstIncomplete.slug}`}
              className="shrink-0 rounded-full bg-zinc-950 px-3 py-2 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/30"
            >
              Ir a pendiente
            </a>
          ) : (
            <span className="shrink-0 rounded-full bg-emerald-300 px-3 py-2 text-xs font-semibold text-zinc-950">
              Listo
            </span>
          )}
        </div>

        <details className="mt-3 rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
            Saltar a ejercicio
            <span className="ml-2 text-xs font-medium text-zinc-500">tocar para expandir</span>
          </summary>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {baselineExerciseDefinitions.map((exercise, index) => {
              const isComplete = progress.completedExerciseSlugs.has(exercise.slug);

              return (
                <a
                  key={exercise.slug}
                  href={`#baseline-${exercise.slug}`}
                  aria-label={`Ir a ${exercise.nameEs}`}
                  className={`rounded-2xl px-2 py-3 text-center text-xs font-semibold ring-1 ${
                    isComplete
                      ? "bg-emerald-300/10 text-emerald-300 ring-emerald-400/30"
                      : "bg-zinc-900 text-zinc-400 ring-zinc-800"
                  }`}
                >
                  {index + 1}
                </a>
              );
            })}
          </div>
        </details>
      </section>

      {baselineExerciseDefinitions.map((exerciseDefinition) => {
        const isComplete = progress.completedExerciseSlugs.has(exerciseDefinition.slug);

        return (
          <section
            key={exerciseDefinition.slug}
            id={`baseline-${exerciseDefinition.slug}`}
            className="scroll-mt-4 rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{exerciseDefinition.nameEs}</h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {exerciseDefinition.isUnilateral ? "Unilateral · izquierda/derecha" : "Bilateral"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  isComplete
                    ? "bg-emerald-300/10 text-emerald-300 ring-emerald-400/30"
                    : "bg-zinc-950 text-zinc-400 ring-zinc-800"
                }`}
              >
                {isComplete ? "con datos" : "opcional"}
              </span>
            </div>

            <div className="mt-4 grid gap-4">
              {getBaselineSides(exerciseDefinition.isUnilateral).map((side) => {
                const prefix = `${exerciseDefinition.slug}:${side}`;
                const saved = savedByKey.get(prefix);

                return (
                  <div key={side} className="rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
                    <p className="mb-3 text-sm font-semibold text-zinc-300">{sideLabelsEs[side]}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="kg">
                        <input
                          name={`${prefix}:weightKg`}
                          type="number"
                          inputMode="decimal"
                          min={0.5}
                          max={999}
                          step="0.5"
                          defaultValue={saved?.weightKg ?? ""}
                          className="input"
                        />
                      </Field>
                      <Field label="reps">
                        <input
                          name={`${prefix}:reps`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={50}
                          defaultValue={saved?.reps ?? ""}
                          className="input"
                        />
                      </Field>
                      <Field label="series">
                        <input
                          name={`${prefix}:sets`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={10}
                          defaultValue={saved?.sets ?? ""}
                          className="input"
                        />
                      </Field>
                      <Field label="dolor 0-10">
                        <input
                          name={`${prefix}:painScore`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={10}
                          defaultValue={saved?.painScore ?? ""}
                          className="input"
                        />
                      </Field>
                    </div>
                    <Field label="RIR">
                      <select name={`${prefix}:rir`} defaultValue={saved?.rir ?? ""} className="input mt-2">
                        <option value="">Seleccionar</option>
                        {rirValues.map((rir) => (
                          <option key={rir} value={rir}>
                            {rirLabelsEs[rir]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Notas">
                      <textarea
                        name={`${prefix}:notes`}
                        rows={2}
                        defaultValue={saved?.notes ?? ""}
                        className="input mt-2 resize-none"
                        placeholder="Opcional. Útil para dictado en iPhone."
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <SubmitButton className="sticky-submit rounded-2xl bg-emerald-300 px-5 py-4 text-base font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30">
        Guardar pesos base
      </SubmitButton>
    </form>
  );
}

const requiredFields = ["weightKg", "reps", "sets", "rir", "painScore"] as const;

const sideLabelsEs = {
  bilateral: "Bilateral",
  left: "Izquierda",
  right: "Derecha",
} as const;

function getSavedProgress(savedLifts: BaselineSavedLift[]): BaselineProgress {
  return {
    completedExerciseSlugs: new Set(savedLifts.map((lift) => lift.exerciseSlug)),
    completedRowCount: savedLifts.length,
  };
}

function getFormProgress(formData: FormData): BaselineProgress {
  const completedExerciseSlugs = new Set<string>();
  let completedRowCount = 0;

  for (const exercise of baselineExerciseDefinitions) {
    for (const side of getBaselineSides(exercise.isUnilateral)) {
      const prefix = `${exercise.slug}:${side}`;
      const isComplete = requiredFields.every((field) => hasValue(formData.get(`${prefix}:${field}`)));

      if (isComplete) {
        completedExerciseSlugs.add(exercise.slug);
        completedRowCount += 1;
      }
    }
  }

  return { completedExerciseSlugs, completedRowCount };
}

function hasValue(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() !== "";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-300">
      <span>{label}</span>
      {children}
    </label>
  );
}
