const navItems = ["Inicio", "Perfil", "Plan", "Entrenar", "Progreso"];
const loggingFields = ["kg", "reps", "RIR", "dolor", "notas"];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-zinc-950 px-5 py-6 text-zinc-50">
      <header className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-emerald-300">MVP personal · iPhone Web</p>
          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">ES / EN</span>
        </div>
        <nav aria-label="Principal" className="flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => (
            <span
              key={item}
              className="shrink-0 rounded-full bg-zinc-900 px-3 py-2 text-sm text-zinc-300 ring-1 ring-zinc-800"
            >
              {item}
            </span>
          ))}
        </nav>
      </header>

      <section className="flex flex-1 flex-col justify-center gap-8 py-10">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
            Entrenador Personal AI
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            Registra cada serie y progresa sin ignorar el dolor.
          </h1>
          <p className="text-lg leading-8 text-zinc-300">
            App web móvil para planes de hipertrofia de 5 días, sesiones de 60 minutos,
            historial por ejercicio y progresión agresiva pero segura.
          </p>
        </div>

        <div className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <p className="mb-3 text-sm font-medium text-zinc-400">Logging obligatorio por serie</p>
          <div className="grid grid-cols-5 gap-2">
            {loggingFields.map((field) => (
              <div key={field} className="rounded-2xl bg-zinc-950 px-2 py-4 text-center ring-1 ring-zinc-800">
                <span className="text-sm font-semibold uppercase text-zinc-100">{field}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl bg-emerald-300 px-5 py-4 text-center text-base font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30">
            Inicio con Google preparado
          </div>
          <p className="text-center text-sm text-zinc-500">
            Primero perfil, pesos base y mediciones. Después generación del plan.
          </p>
        </div>
      </section>
    </main>
  );
}
