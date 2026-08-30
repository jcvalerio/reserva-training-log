"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

/**
 * A route-level boundary for the running session.
 *
 * Before this existed, a single unrenderable exercise took down the whole
 * screen mid-workout and left Safari's "This page couldn't load" — which
 * offers no way to reach the rest of the session and no clue what went wrong.
 * That is the worst failure this app has: someone is standing in a gym with a
 * loaded bar and their log is gone.
 *
 * Recovery is deliberately more than a reload button, because a reload
 * re-renders the same bad data and fails identically. `Reintentar` is offered
 * for the transient case, but the way out that actually works is going back to
 * `/entrenar`, where the other sessions are still reachable.
 */
export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-4 py-10">
      <div className="rounded-2xl bg-amber-300/10 p-5 ring-1 ring-amber-400/30">
        <h1 className="text-lg font-semibold text-amber-200">No pudimos abrir este entrenamiento</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Algo salió mal al cargar esta sesión. Tus series guardadas están a salvo — no se ha borrado nada.
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Ya recibimos el aviso automáticamente y lo estamos revisando.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-2xl px-5 py-4 text-center font-semibold text-zinc-200 ring-1 ring-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Reintentar
        </button>
        <Link
          href="/entrenar"
          className="rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100"
        >
          Volver a Entrenar
        </Link>
      </div>

      {error.digest ? (
        <p className="text-center text-xs text-zinc-500">
          Referencia: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
    </main>
  );
}
