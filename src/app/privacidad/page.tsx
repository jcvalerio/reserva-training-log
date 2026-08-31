import type { Metadata } from "next";

import { AppShell } from "../app-shell";

export const metadata: Metadata = {
  title: "Privacidad · Reserva",
  description: "Qué datos guarda Reserva, quién los ve y cómo pedir que se borren.",
};

/**
 * Reserva began as three people the owner knew. It is public now, and it
 * records pain scores, pain locations and body measurements — health data,
 * from people nobody has met.
 *
 * Written in plain Spanish rather than legal boilerplate, deliberately: the
 * point is that an athlete can read it and actually know what happens to their
 * data. Deletion is a real address a person answers, not a form that goes
 * nowhere, because there is no automated deletion flow yet and promising one
 * would be a lie.
 */
export default function PrivacidadPage() {
  return (
    <AppShell activeHref="/" backTo={{ href: "/", label: "Inicio" }}>
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Privacidad</p>
        <h1 className="text-2xl font-semibold tracking-tight">Qué guardamos y qué hacemos con ello</h1>
        <p className="text-sm leading-6 text-zinc-400">
          Reserva es un proyecto personal y gratuito. No vendemos datos, no hay publicidad y no hay rastreadores de
          terceros. Esta página explica en concreto qué se guarda y cómo pedir que se borre.
        </p>
      </header>

      <div className="mt-6 grid gap-5 pb-10">
        <section className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <h2 className="font-semibold text-zinc-100">Qué se guarda</h2>
          <ul className="mt-2 grid gap-2 text-sm leading-6 text-zinc-300">
            <li>
              <span className="font-medium text-zinc-100">Tu cuenta.</span> Nombre, correo e imagen de perfil, tal como
              los entrega Google al iniciar sesión. Es el único método de acceso; nunca vemos ni guardamos tu
              contraseña.
            </li>
            <li>
              <span className="font-medium text-zinc-100">Tu entrenamiento.</span> Los planes que creas y cada serie que
              registras: peso, repeticiones, RIR, duración y notas.
            </li>
            <li>
              <span className="font-medium text-zinc-100">Datos de salud.</span> El dolor que registras (de 0 a 10 y
              dónde), tus limitaciones o lesiones si las anotas en el perfil, y las medidas corporales que decidas
              guardar. Es la información más sensible de la app y por eso la tratamos aparte.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <h2 className="font-semibold text-zinc-100">Quién puede verlo</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Solo tú, con tu cuenta. La única excepción es cuando <span className="font-medium text-zinc-100">tú</span>{" "}
            compartes un plan con otra persona por correo: en ese caso se copia el plan —los ejercicios y sus series
            objetivo— y nunca tu historial, tu dolor ni tus medidas.
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            El desarrollador puede acceder a la base de datos para arreglar problemas. Cuando eso pasa con tus datos, es
            para resolver algo concreto y se te dice.
          </p>
        </section>

        <section className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <h2 className="font-semibold text-zinc-100">Dónde vive y quién más lo toca</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            La app corre en <span className="font-medium text-zinc-100">Vercel</span> y los datos se guardan en{" "}
            <span className="font-medium text-zinc-100">Neon</span> (una base de datos PostgreSQL), ambos en Estados
            Unidos. El acceso usa <span className="font-medium text-zinc-100">Google</span>. Usamos{" "}
            <span className="font-medium text-zinc-100">Sentry</span> para enterarnos de los errores de la app.
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Los reportes de error van filtrados a propósito: no incluyen tu identidad, ni el contenido de los
            formularios, ni tus valores de dolor, peso o medidas. Solo lo necesario para arreglar la falla —en qué
            pantalla ocurrió y en qué dispositivo.
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">No hay analítica de comportamiento ni publicidad.</p>
        </section>

        <section className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <h2 className="font-semibold text-zinc-100">Borrar tus datos</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Puedes borrar series y mediciones desde la app cuando quieras. Para borrar tu cuenta completa —con todo tu
            historial— escribe a{" "}
            <a
              href="mailto:jcvalerio@gmail.com?subject=Reserva%20—%20borrar%20mi%20cuenta"
              className="font-medium text-emerald-300 underline underline-offset-4"
            >
              jcvalerio@gmail.com
            </a>{" "}
            desde el correo con el que entras. Se borra por completo, no se archiva.
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Todavía no hay un botón para hacerlo solo; lo hace una persona. Por eso está escrito así y no como una
            promesa automática.
          </p>
        </section>

        <section className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <h2 className="font-semibold text-zinc-100">Lo que esto no es</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Reserva no es un dispositivo médico y no da consejo médico. El seguimiento del dolor sirve para que la app
            no te sugiera cargar más cuando algo te está molestando. Si algo duele de forma persistente, consulta a un
            profesional.
          </p>
        </section>

        <p className="text-xs leading-5 text-zinc-500">
          Si cambia algo importante de lo anterior, se actualiza esta página. Última actualización: 31 de agosto de
          2026.
        </p>
      </div>
    </AppShell>
  );
}
