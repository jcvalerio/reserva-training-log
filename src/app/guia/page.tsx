import { AppShell } from "../app-shell";

type GuiaSection = "rir" | "amrap" | "matematica" | "volumen";

const validSections: GuiaSection[] = ["rir", "amrap", "matematica", "volumen"];

export default async function GuiaPage({
  searchParams,
}: {
  searchParams?: Promise<{ open?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const openSection = validSections.includes(params.open as GuiaSection) ? (params.open as GuiaSection) : null;

  return (
    <AppShell activeHref="/guia" backTo={{ href: "/", label: "Inicio" }}>
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Guía</p>
        <h1 className="text-2xl font-semibold tracking-tight">Cómo entrenamos y cómo calculamos tu progresión</h1>
        <p className="text-sm leading-6 text-zinc-400">
          Cuatro conceptos que usa la app en cada serie que registras — explicados como lo haría tu entrenador junto a
          un fisioterapeuta, no como un manual técnico.
        </p>
      </header>

      <div className="mt-6 grid gap-3 pb-10">
        <details open={openSection === "rir"} className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <summary className="cursor-pointer text-base font-semibold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
            ¿Qué es RIR (Reps en Reserva)?
          </summary>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-zinc-300">
            <p>
              RIR es cuántas repeticiones más, con buena técnica, podrías haber hecho al terminar una serie. Es una
              forma de medir el esfuerzo sin necesariamente llegar al fallo.
            </p>
            <div className="overflow-x-auto rounded-xl ring-1 ring-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-semibold">RIR</th>
                    <th className="px-3 py-2 font-semibold">Significado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  <tr>
                    <td className="px-3 py-2 font-semibold text-zinc-100">4+</td>
                    <td className="px-3 py-2 text-zinc-300">Fácil — te quedaron 4 o más repeticiones buenas</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-zinc-100">3</td>
                    <td className="px-3 py-2 text-zinc-300">Desafiante pero cómodo</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-emerald-300">2</td>
                    <td className="px-3 py-2 text-zinc-300">Zona ideal para hipertrofia — el objetivo por defecto</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-zinc-100">1</td>
                    <td className="px-3 py-2 text-zinc-300">Muy exigente</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-amber-200">0</td>
                    <td className="px-3 py-2 text-zinc-300">Fallo — no queda ninguna repetición más con buena técnica</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              <span className="font-semibold text-zinc-100">Por qué RIR 2 es el objetivo por defecto:</span>{" "}
              suficiente estímulo para progresar, sin acumular tanta fatiga que comprometa la siguiente sesión.
            </p>
            <p>
              <span className="font-semibold text-zinc-100">Por qué no entrenar siempre al fallo:</span> entrenar
              cerca del fallo en cada serie eleva el riesgo de perder la técnica justo cuando el cuerpo está más
              fatigado — exactamente el momento en que aparecen las molestias articulares. RIR es el margen de
              seguridad que permite distinguir &ldquo;esto es cansancio normal&rdquo; de &ldquo;esto es dolor
              real.&rdquo;
            </p>
          </div>
        </details>

        <details open={openSection === "amrap"} className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <summary className="cursor-pointer text-base font-semibold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
            ¿Qué es un AMRAP-to-failure?
          </summary>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-zinc-300">
            <p>
              AMRAP significa &ldquo;tantas repeticiones como sea posible&rdquo; (as many reps as possible). Un
              AMRAP-to-failure
              es una serie llevada de verdad al fallo — RIR 0, intencional, no accidental. Es una herramienta
              ocasional, no el modo por defecto: sirve para conocer tu límite real en un ejercicio.
            </p>
            <p className="rounded-xl bg-zinc-950 p-3 text-amber-200 ring-1 ring-amber-300/30">
              Regla sin excepciones: nunca en un ejercicio marcado para vigilar dolor, nunca si ya sentiste molestia
              esa sesión, y nunca en la primera vez que pruebas un ejercicio nuevo — todavía no tienes la técnica
              consolidada para hacerlo con seguridad.
            </p>
            <p>
              Un AMRAP-to-failure es, en la práctica, uno de los tipos de &ldquo;set extra&rdquo; que puedes
              registrar después de completar tu plan (el botón &ldquo;+ Agregar un set extra&rdquo; en cada
              ejercicio). La app ya sabe que una
              serie extra no es igual a una serie planificada — el dolor de una serie extra siempre cuenta para tu
              seguridad, pero un AMRAP más corto de lo normal no te va a bloquear una subida de carga que tus series
              planificadas ya ganaron limpiamente. Ver la sección siguiente para el detalle.
            </p>
          </div>
        </details>

        <details open={openSection === "matematica"} className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <summary className="cursor-pointer text-base font-semibold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
            ¿Cómo calculamos la sugerencia de progresión?
          </summary>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-zinc-300">
            <p>Cada vez que repites un ejercicio, la app revisa tu sesión anterior en este orden:</p>
            <ol className="grid gap-2">
              <li className="rounded-xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
                <span className="font-semibold text-zinc-100">1. ¿Dolor bajo control?</span> El dolor máximo de
                cualquier serie — incluidas las extra — manda primero: más de 3 sugiere reducir o modificar; más de 2
                bloquea cualquier subida agresiva, sin importar qué tan bien fue el resto.
              </li>
              <li className="rounded-xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
                <span className="font-semibold text-zinc-100">2. ¿Llegaste al tope del rango de reps?</span> Sólo se
                compara contra tus series <span className="italic">planificadas</span>, no las extra.
              </li>
              <li className="rounded-xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
                <span className="font-semibold text-zinc-100">3. ¿RIR promedio de 2 o más?</span> También calculado
                sólo sobre tus series planificadas — un AMRAP extra no arrastra este promedio hacia abajo.
              </li>
              <li className="rounded-xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
                <span className="font-semibold text-emerald-300">4. Si los tres se cumplen → sube carga:</span>{" "}
                +5% en máquina, +2.5% en barra, +2kg fijo en mancuerna, o &ldquo;agrega una repetición&rdquo; en
                ejercicios de
                aislamiento o peso corporal (para esos, subir peso no es la primera palanca).
              </li>
              <li className="rounded-xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
                <span className="font-semibold text-zinc-100">5. Si no → mantén la carga</span> esta vez y busca
                mejorar reps, control o bajar el RIR sin subir el dolor.
              </li>
            </ol>
            <p className="rounded-xl bg-zinc-950 p-3 text-xs leading-5 text-zinc-400 ring-1 ring-zinc-800">
              Dolor &gt;2 bloquea aumentos agresivos, dolor &gt;3 exige reducir, modificar o cambiar el movimiento,
              dolor ≥7 significa detener y buscar orientación profesional si persiste — la misma regla en cada
              pantalla de la app.
            </p>
          </div>
        </details>
        <details open={openSection === "volumen"} className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <summary className="cursor-pointer text-base font-semibold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
            ¿Qué son las series por grupo muscular?
          </summary>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-zinc-300">
            <p>
              Para ganar músculo, lo que más manda no es cuánto pesa una serie suelta sino cuántas series de calidad
              recibe cada músculo en la semana. Por eso Progreso empieza por ahí y no por una curva de peso.
            </p>
            <ul className="grid gap-2">
              <li className="rounded-xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
                <span className="font-semibold text-zinc-100">Grupo principal: 1 serie.</span> El músculo que limita la
                serie — el que te hace parar.
              </li>
              <li className="rounded-xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
                <span className="font-semibold text-zinc-100">Grupos secundarios: media serie.</span> Un remo también
                entrena bíceps. Ignorarlo haría parecer que te falta brazo cuando no es así.
              </li>
              <li className="rounded-xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
                <span className="font-semibold text-zinc-100">Unilaterales: 3 izquierda + 3 derecha = 3 series.</span>{" "}
                Cada pierna recibió tres rondas de estímulo. Sumarlas daría 6 y haría ver la pierna como si estuviera
                al doble de trabajo que un ejercicio bilateral.
              </li>
              <li className="rounded-xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
                <span className="font-semibold text-zinc-100">No cuentan</span> el calentamiento ni el trabajo por
                tiempo (planchas, cardio). Sí cuenta el trabajo de fuerza aunque esté marcado como movilidad — un face
                pull entrena hombro posterior de verdad.
              </li>
            </ul>
            <p className="rounded-xl bg-zinc-950 p-3 text-xs leading-5 text-zinc-400 ring-1 ring-zinc-800">
              La banda gris de cada barra es un <span className="font-semibold">rango de referencia</span>, no una
              meta que debas cumplir cada semana. Una rutina de 5 días con 2 series por accesorio queda por debajo de
              casi todas las bandas, y eso está bien: la constancia importa más que llegar al rango, y subir series
              sólo para llenar la barra es trabajo desperdiciado. Por eso una barra baja no se pinta de rojo — el
              color en esta app está reservado para el dolor.
            </p>
            <p className="rounded-xl bg-zinc-950 p-3 text-xs leading-5 text-zinc-400 ring-1 ring-zinc-800">
              <span className="font-semibold text-zinc-100">Esta semana, 4 semanas y Todo:</span> los dos últimos
              muestran el <span className="font-semibold">promedio por semana</span>, no el total del periodo. El rango
              de referencia es una dosis semanal, así que un total de varias semanas quedaría muy por encima de la
              banda y parecería saludable cuando no lo es. La semana en curso no entra en los promedios: un martes
              tiene un día entrenado de cinco, y contarlo haría que el promedio bajara cada lunes sin que hayas
              entrenado menos. Una semana de descanso sí cuenta — bajó tu dosis semanal de verdad.
            </p>
            <p className="rounded-xl bg-zinc-950 p-3 text-xs leading-5 text-zinc-400 ring-1 ring-zinc-800">
              <span className="font-semibold text-zinc-100">Sobre el dolor:</span> cuando registras dolor por encima
              de 0, la app te pregunta dónde. Eso separa las agujetas del dolor articular, que no son lo mismo: las
              primeras son parte de entrenar, el segundo es la señal a vigilar. Las series anteriores a esa pregunta
              aparecen marcadas como <span className="italic">estimado</span>, porque ahí sólo se puede repartir el
              dolor entre las articulaciones que carga el ejercicio. Nada de esto es un diagnóstico.
            </p>
          </div>
        </details>
      </div>
    </AppShell>
  );
}
