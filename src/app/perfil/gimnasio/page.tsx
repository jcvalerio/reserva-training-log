import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth-server";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { getOrCreateDefaultGym } from "@/training/gym-repository";
import { formatDenominationList } from "@/training/gym-schema";
import { buildFromScratch, formatPlateCounts } from "@/training/plate-math";

import { AppShell } from "../../app-shell";
import { FormStatusBanner } from "../../form-status-banner";
import { SubmitButton } from "../../submit-button";
import { saveGymInventoryAction } from "./actions";

type GymPageProps = {
  searchParams?: Promise<{ saved?: string; error?: string }>;
};

/** A load worth previewing against: heavy enough to need several discs, light
 *  enough that most racks can build it. Only ever a preview — it proves the
 *  list was understood, which a saved-confirmation alone does not. */
const PREVIEW_KG = 60;

export default async function GymPage({ searchParams }: GymPageProps) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);
  const params = searchParams ? await searchParams : {};

  if (!profile) {
    return (
      <AppShell activeHref="/perfil" backTo={{ href: "/perfil", label: "Perfil" }}>
        <p className="text-sm leading-6 text-zinc-300">
          Crea tu perfil primero para configurar tu gimnasio.{" "}
          <Link href="/perfil" className="text-emerald-300 underline">
            Ir a mi perfil
          </Link>
        </p>
      </AppShell>
    );
  }

  const gym = await getOrCreateDefaultGym(profile.id);
  const preview = buildFromScratch(PREVIEW_KG, gym.plateInventory);

  return (
    <AppShell activeHref="/perfil" backTo={{ href: "/perfil", label: "Perfil" }}>
      <div className="grid gap-4">
        <header className="grid gap-1">
          <p className="text-xs font-semibold tracking-widest text-emerald-300">MI GIMNASIO</p>
          <h1 className="text-2xl font-semibold text-zinc-50">Discos disponibles</h1>
          <p className="text-sm leading-6 text-zinc-300">
            Anota los discos que hay en tu gimnasio. Con eso la app puede decirte qué poner en la barra en vez de
            darte un número que toca convertir a mano.
          </p>
        </header>

        <FormStatusBanner
          saved={Boolean(params.saved)}
          error={Boolean(params.error)}
          savedMessage="Discos guardados."
          errorMessage="No se pudo guardar. Revisa los valores."
        />

        <form action={saveGymInventoryAction} className="grid gap-4 rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <label className="grid gap-1 text-sm font-medium text-zinc-300">
            <span>Nombre</span>
            <input name="nameEs" defaultValue={gym.nameEs} maxLength={200} className="input" />
          </label>

          <label className="grid gap-1 text-sm font-medium text-zinc-300">
            <span>Discos en libras (lb)</span>
            <input
              name="platesLb"
              defaultValue={formatDenominationList(gym.plateInventory, "lb")}
              placeholder="45, 35, 25, 10, 5, 2.5"
              inputMode="text"
              maxLength={200}
              className="input"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-zinc-300">
            <span>Discos en kilos (kg)</span>
            <input
              name="platesKg"
              defaultValue={formatDenominationList(gym.plateInventory, "kg")}
              placeholder="25, 20, 15, 10, 5"
              inputMode="text"
              maxLength={200}
              className="input"
            />
          </label>

          {/* The separator rule, stated where it is used. The comma is the
              decimal mark everywhere else in this app, so this has to be said
              rather than assumed — see gym-schema.ts for why guessing is
              worse. */}
          <p className="text-xs leading-5 text-zinc-400">
            Sepáralos con comas. Para decimales usa punto: <span className="text-zinc-300">2.5</span>. Puedes dejar
            una de las dos líneas vacía si tu gimnasio sólo tiene una clase de disco.
          </p>

          <label className="grid gap-1 text-sm font-medium text-zinc-300">
            <span>Mostrar pesos en</span>
            <select name="displayUnit" defaultValue={gym.displayUnit} className="input">
              <option value="kg">Kilos (kg)</option>
              <option value="lb">Libras (lb)</option>
            </select>
            <span className="text-xs leading-5 text-zinc-400">
              Sólo cambia cómo se muestran. Tus series se siguen guardando en kilos, así que tu historial y tus
              gráficas no cambian.
            </span>
          </label>

          <SubmitButton className="min-h-11 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200">
            Guardar discos
          </SubmitButton>
        </form>

        {/* Proof the list was read correctly, in the app's own words. A
            "Guardado" banner only says the write happened. */}
        {gym.plateInventory.length > 0 && preview ? (
          <section className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-100">Comprobación</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-300">
              Con estos discos, {PREVIEW_KG} kg se arma con{" "}
              <span className="text-emerald-300">{formatPlateCounts(preview.perSide)}</span> por lado
              {preview.totalKg !== PREVIEW_KG ? (
                <span className="text-zinc-400"> (lo más cerca: {preview.totalKg} kg)</span>
              ) : null}
              .
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              Los pesos se cuentan como discos en total, sin contar la barra — que es como los venías anotando.
            </p>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
