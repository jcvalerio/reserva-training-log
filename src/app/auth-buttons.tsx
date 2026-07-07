"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { authClient } from "@/lib/auth-client";

export function GoogleSignInButton({ disabled = false }: { disabled?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await authClient.signIn.social({
              provider: "google",
              callbackURL: "/",
              errorCallbackURL: "/",
            });

            if (result.error) {
              setError("No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
            }
          });
        }}
        className="rounded-2xl bg-emerald-300 px-5 py-4 text-center text-base font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 transition disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
      >
        {isPending ? "Abriendo Google…" : "Iniciar sesión con Google"}
      </button>
      {disabled ? (
        <p className="text-center text-xs text-amber-300">
          Google OAuth aún no está configurado en este entorno.
        </p>
      ) : null}
      {error ? <p className="text-center text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await authClient.signOut();

            if (result.error) {
              setError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
              return;
            }

            router.refresh();
          });
        }}
        className="rounded-2xl border border-zinc-700 px-5 py-4 text-center text-base font-semibold text-zinc-100 transition disabled:cursor-not-allowed disabled:text-zinc-500"
      >
        {isPending ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
      {error ? <p className="text-center text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
