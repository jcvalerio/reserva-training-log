"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * The last-resort boundary: catches render errors in the root layout itself,
 * which a route-level `error.tsx` cannot. It replaces the whole document, so
 * it has to render its own <html>/<body> and cannot rely on the app shell,
 * globals.css layout, or the bottom nav.
 *
 * Styling is inline for exactly that reason — if the failure is in the layout,
 * assuming the stylesheet loaded is how you get an unreadable error page.
 */
export default function GlobalError({
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
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          color: "#e4e4e7",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Algo salió mal</h1>
          <p style={{ fontSize: "0.95rem", color: "#a1a1aa", marginTop: "0.75rem" }}>
            No pudimos cargar la aplicación. Tus datos están a salvo. Ya recibimos el aviso automáticamente.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              width: "100%",
              padding: "1rem 1.25rem",
              borderRadius: "1rem",
              border: "none",
              backgroundColor: "#6ee7b7",
              color: "#09090b",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            Reintentar
          </button>
          {error.digest ? (
            <p style={{ fontSize: "0.75rem", color: "#71717a", marginTop: "1rem" }}>
              Referencia: <span style={{ fontFamily: "monospace" }}>{error.digest}</span>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
