export function FormStatusBanner({
  saved,
  error,
  savedMessage = "Guardado correctamente.",
  errorMessage = "No se pudo guardar. Revisa los campos marcados y vuelve a intentar.",
}: {
  saved: boolean;
  error: boolean;
  savedMessage?: string;
  errorMessage?: string;
}) {
  if (saved) {
    return (
      <section role="status" className="mt-6 rounded-3xl bg-emerald-300/10 p-4 ring-1 ring-emerald-400/30">
        <p className="text-sm font-semibold text-emerald-300">Guardado</p>
        <p className="mt-1 text-sm leading-6 text-zinc-300">{savedMessage}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section role="alert" className="mt-6 rounded-3xl bg-amber-300/10 p-4 ring-1 ring-amber-300/30">
        <p className="text-sm font-semibold text-amber-200">Revisa el formulario</p>
        <p className="mt-1 text-sm leading-6 text-zinc-300">{errorMessage}</p>
      </section>
    );
  }

  return null;
}
