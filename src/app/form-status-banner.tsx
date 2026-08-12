export function FormStatusBanner({
  saved,
  error,
  savedMessage = "Guardado correctamente.",
  errorMessage = "No se pudo guardar. Revisa los campos marcados y vuelve a intentar.",
  // A long, scrollable form (the plan builder's session editor is the first
  // case) puts the save/delete buttons far from the top of the page — an
  // inline banner up there is invisible from wherever the tap that triggered
  // it actually happened. Floating pins it just above the fixed bottom nav
  // instead, staying in view regardless of scroll position, like a toast.
  // Inline (the default) is unchanged for every other page using this.
  floating = false,
}: {
  saved: boolean;
  error: boolean;
  savedMessage?: string;
  errorMessage?: string;
  floating?: boolean;
}) {
  const position = floating
    ? "fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md shadow-2xl shadow-black/50"
    : "mt-6";

  if (saved) {
    return (
      <section role="status" className={`${position} rounded-3xl bg-emerald-300/10 p-4 ring-1 ring-emerald-400/30 backdrop-blur`}>
        <p className="text-sm font-semibold text-emerald-300">Guardado</p>
        <p className="mt-1 text-sm leading-6 text-zinc-300">{savedMessage}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section role="alert" className={`${position} rounded-3xl bg-amber-300/10 p-4 ring-1 ring-amber-300/30 backdrop-blur`}>
        <p className="text-sm font-semibold text-amber-200">Revisa el formulario</p>
        <p className="mt-1 text-sm leading-6 text-zinc-300">{errorMessage}</p>
      </section>
    );
  }

  return null;
}
