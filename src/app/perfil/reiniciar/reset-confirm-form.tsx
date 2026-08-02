"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import type { ProfileResetSummary } from "@/profile/profile-reset";

import { RESET_CONFIRM_TEXT } from "./reset-confirm-text";

export function ResetConfirmForm({
  action,
  summary,
}: {
  action: (formData: FormData) => void | Promise<void>;
  summary: ProfileResetSummary;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [keepMeasurements, setKeepMeasurements] = useState(true);
  const isConfirmed = confirmText === RESET_CONFIRM_TEXT;

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!isConfirmed) {
          event.preventDefault();
        }
      }}
      className="mt-6 grid gap-4"
    >
      {summary.measurementCount > 0 ? (
        <label className="flex items-start gap-3 rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <input
            name="keepMeasurements"
            type="checkbox"
            value="keep"
            checked={keepMeasurements}
            onChange={(event) => setKeepMeasurements(event.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-zinc-700 bg-zinc-950"
          />
          <span className="text-sm font-medium text-zinc-300">
            Mantener mis mediciones corporales ({summary.measurementCount})
            <span className="mt-1 block text-xs font-normal leading-5 text-zinc-400">
              Tu peso, cintura y medidas quedan aparte de tus planes y sesiones — puedes seguir tu progreso físico
              aunque empieces de cero con el entrenamiento.
            </span>
          </span>
        </label>
      ) : null}

      <p className="text-sm leading-6 text-zinc-300">
        Se eliminarán {summary.planCount} {summary.planCount === 1 ? "plan" : "planes"} y {summary.sessionCount}{" "}
        {summary.sessionCount === 1 ? "sesión registrada" : "sesiones registradas"}.{" "}
        {summary.measurementCount > 0 ? (
          keepMeasurements ? (
            <span className="text-emerald-300">Tus mediciones se mantienen.</span>
          ) : (
            <span className="text-amber-200">
              Tus {summary.measurementCount} mediciones también se eliminarán.
            </span>
          )
        ) : null}
      </p>

      <label className="grid gap-2 text-sm font-medium text-zinc-300">
        <span>
          Escribe <span className="font-semibold text-amber-200">{RESET_CONFIRM_TEXT}</span> para confirmar
        </span>
        <input
          name="confirmText"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          className="input"
        />
      </label>

      <ConfirmSubmitButton isConfirmed={isConfirmed} />
    </form>
  );
}

function ConfirmSubmitButton({ isConfirmed }: { isConfirmed: boolean }) {
  const { pending } = useFormStatus();
  // A dimmed amber button still reads as "amber, so basically ready" at a
  // glance for a destructive action — swap to a plain, clearly-inert zinc
  // fill until actually confirmed, instead of relying on opacity alone.
  const isActive = isConfirmed && !pending;

  return (
    <button
      type="submit"
      disabled={!isActive}
      aria-disabled={!isActive}
      className={
        isActive
          ? "rounded-2xl bg-amber-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-amber-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100"
          : "cursor-not-allowed rounded-2xl bg-zinc-900 px-5 py-4 text-center font-semibold text-zinc-500 ring-1 ring-zinc-800"
      }
    >
      {pending ? "Eliminando…" : "Eliminar mis planes y sesiones"}
    </button>
  );
}
