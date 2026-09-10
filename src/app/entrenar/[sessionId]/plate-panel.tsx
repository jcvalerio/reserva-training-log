"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { formatKg } from "@/lib/format";
import { plateBuildFromCounts, serializePlateBuild } from "@/training/plate-build";
import {
  formatPlateCounts,
  MAX_PLATES_PER_SIDE,
  type PlateCount,
  type PlateDenomination,
} from "@/training/plate-math";
import type { ExerciseWithLoggedSets } from "@/workouts/workout-repository";

import { SubmitButton } from "../../submit-button";
import type { SetLoadingModelActionState, SetPlateBuildActionState } from "../actions";

import type { SetLoadingModelAction, SetPlateBuildAction } from "./plate-actions";

/**
 * The plate assistant's own screen furniture, lifted out of session-runner.tsx.
 *
 * Not a stylistic split. The runner had grown past three thousand lines, and
 * these four components are the most self-contained thing in it: they talk to
 * two server actions of their own, hold their own editor state, and nothing
 * else in the file reads that state. Everything they need arrives as props.
 *
 * The two halves stay together HERE, though, and apart on screen — see
 * PlateStepLine on why the "what do I add" line lives beside the progression
 * verdict while the build editor lives in the collapsed reference section.
 */

/**
 * The decision half: what to ADD to a loaded bar, and nothing else.
 *
 * Split from the build half deliberately. This line changes what the athlete
 * does in the next thirty seconds, so it stays on screen beside the
 * progression verdict it belongs to. Which discs are currently on the machine
 * is reference material, and lives in the one collapsed section with the rest
 * of it — see ExerciseReferenceSection.
 *
 * The complaint this answers, measured: they return to the hip thrust, read
 * "122 kg", and their gym stocks discs in pounds — so before they can lift
 * they convert and hunt for a combination that sums to it. Then, to progress,
 * they do it again for a number the app invented. Rebuilding a bar from a
 * fresh minimum-plate recipe to add three kilos is not a thing anyone does, so
 * the output is an instruction relative to the weight they logged.
 */
export function PlateStepLine({
  assist,
  showStep,
}: {
  assist: ExerciseWithLoggedSets["loadAssist"];
  showStep: boolean;
}) {
  if (!assist || !showStep) {
    return null;
  }

  return assist.step ? (
    <p className="mt-2 text-sm leading-6 text-zinc-200">
      Añade <span className="font-semibold text-emerald-300">{formatPlateCounts(assist.step.added)}</span> por lado →{" "}
      <span className="font-semibold text-zinc-50">{formatKg(String(assist.step.totalKg), 1)}</span>
    </p>
  ) : (
    /* A real answer, not a gap. The smallest pair this gym stocks is a bigger
       jump than the exercise should take, so there is no load change to make —
       say so instead of rounding to a number that does not exist. */
    <p className="mt-2 text-sm leading-6 text-zinc-300">
      Con los discos de tu gimnasio no hay un salto de carga apropiado aquí: suma una repetición en vez de peso.
    </p>
  );
}

/**
 * Which discs are on the bar, and the way to correct that.
 *
 * This half was WRONG in the first version and preview caught it. It printed
 * the enumerator's output under the heading "La vez pasada", with the build's
 * mass in parentheses marked "reales" — two assertions about history, from a
 * computation that had never seen the bar. On real data it claimed
 * `1 x 20 kg + 1 x 25 lb` for a lift loaded with 45 lb discs throughout,
 * because the 25 kg plates live at the far end of the room. Nothing computable
 * recovers that; the rack layout is not, and will not be, in the model.
 *
 * So the language tracks provenance exactly. A recorded build is stated flatly
 * and is the only thing allowed to claim a true mass. A computed one is offered
 * in the conditional ("podrías armarlo así") and carries no mass claim at all —
 * beside it, the way to disagree.
 */
export function PlateBuildSection({
  assist,
  askLoadingModel,
  exerciseNameEs,
  sessionId,
  setLoadingModelAction,
  setPlateBuildAction,
}: {
  assist: ExerciseWithLoggedSets["loadAssist"];
  /** The gym has discs recorded but nobody has said whether THIS movement
   *  uses them. Asked here rather than only on a settings screen: the moment
   *  you notice is the moment you are stood in front of the machine. */
  askLoadingModel: boolean;
  exerciseNameEs: string;
  sessionId: string;
  setLoadingModelAction: SetLoadingModelAction;
  setPlateBuildAction: SetPlateBuildAction;
}) {
  // Kept here rather than inside the editor so "Cambiar los discos" and "Yo lo
  // armo distinto" — two buttons in different branches — drive the same panel.
  const [editing, setEditing] = useState(false);

  if (!assist) {
    return askLoadingModel ? (
      <LoadingModelQuestion
        exerciseNameEs={exerciseNameEs}
        sessionId={sessionId}
        action={setLoadingModelAction}
      />
    ) : null;
  }

  const saved = assist.savedBuild;

  return (
    <div className="grid gap-1">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Armar desde cero</p>

      {saved ? (
        <>
          <p className="text-xs leading-5 text-zinc-200">
            Así lo armas: <span className="font-semibold">{formatPlateCounts(saved.perSide)}</span> por lado
            {/* The mass claim lives HERE and only here — this recipe came from
                the athlete, so its weight is a fact about the bar rather than
                about the enumerator. */}
            <span className="text-zinc-400">
              {" "}
              ({formatKg(String(saved.totalKg), 1)} reales · {saved.plateCount * 2} discos
              {assist.savedBuildRecordedAt ? ` · ${formatBuildDate(assist.savedBuildRecordedAt)}` : ""})
            </span>
          </p>
          {assist.savedBuildIsStale ? (
            /* Never silently discarded. The denominations they reach for are
               still the best thing we know; only the count has moved on. */
            <p className="text-xs leading-5 text-amber-200">
              Lo guardaste para {formatKg(String(saved.totalKg), 1)} y tu última serie fue con otra carga. Actualízalo
              si cambiaste los discos.
            </p>
          ) : null}
        </>
      ) : assist.suggestedBuild && assist.suggestedBuild.plateCount > 0 ? (
        /* Conditional mood, and no mass in parentheses. This is a way to reach
           the number, not a report of what anyone did. */
        <p className="text-xs leading-5 text-zinc-300">
          Con tus discos podrías armarlo así:{" "}
          <span className="font-semibold">{formatPlateCounts(assist.suggestedBuild.perSide)}</span> por lado.
        </p>
      ) : (
        <p className="text-xs leading-5 text-zinc-300">Todavía no sé con qué discos armas este ejercicio.</p>
      )}

      {editing ? (
        <PlateBuildEditor
          inventory={assist.inventory}
          initialPerSide={saved?.perSide ?? []}
          exerciseNameEs={exerciseNameEs}
            sessionId={sessionId}
          action={setPlateBuildAction}
          onDone={() => setEditing(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 min-h-11 w-full rounded-xl bg-zinc-950 px-3 text-sm font-semibold text-sky-300 ring-1 ring-sky-300/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          {saved ? "Cambiar los discos" : "Yo lo armo distinto"}
        </button>
      )}

      <p className="text-xs leading-5 text-zinc-500">{assist.conventionEs}</p>
    </div>
  );
}

/** "6 sep" — short, because it sits inside a line that is already secondary. */
function formatBuildDate(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toLocaleDateString("es", { day: "numeric", month: "short" });
}

/**
 * Record what went on the bar: a stepper for each disc in play, a chip for
 * every other disc the gym stocks.
 *
 * Taps rather than typing, because this is filled in between sets on a 390px
 * screen with chalk on your hands — eleven number inputs is not a form anyone
 * completes there, and a typed number could name a disc the gym does not own,
 * which is exactly the surface `parsePlateBuild` exists to close.
 *
 * The layout is one rule: **a denomination gets a row once its count is above
 * zero, and is a chip until then.** The first version gave all eleven a full
 * stepper unconditionally, which cost 572px — most of the viewport — to ask
 * about eight discs nobody had touched. A real build uses one to three
 * denominations. A chip needs one 44px target instead of two plus a counter,
 * so four fit on a line where one stepper row did, and the empty state lands
 * around 190px with every disc still exactly one tap away.
 *
 * Two things follow from that rule and are easy to get wrong:
 *
 * - A row that drops back to zero STAYS a row for the rest of this edit. It
 *   would otherwise collapse into a chip under the thumb that just tapped it,
 *   which is the control-shifting failure this screen has a history of. It is
 *   still dropped on save, since `serializePlateBuild` filters `count > 0`.
 * - Promoting a chip unmounts a button in one container and mounts a different
 *   one in another, so React cannot treat it as a move and focus lands on
 *   `<body>`. Keyboard and screen-reader users would silently lose their
 *   place, so focus is moved explicitly to the new row's "+".
 *
 * Per SIDE, matching every recipe this app renders, with the total across both
 * sides and the total disc count shown live. Both numbers deliberately: the
 * disc count is what you can verify by looking down at the bar, and it is how
 * someone catches having answered the wrong question.
 */
function PlateBuildEditor({
  inventory,
  initialPerSide,
  exerciseNameEs,
  sessionId,
  action,
  onDone,
}: {
  inventory: PlateDenomination[];
  initialPerSide: PlateCount[];
  exerciseNameEs: string;
  sessionId: string;
  action: SetPlateBuildAction;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(action, { status: "idle" } as SetPlateBuildActionState);
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const seed: Record<string, number> = {};
    for (const plate of initialPerSide) {
      seed[plateKey(plate)] = plate.count;
    }
    return seed;
  });
  // Which denominations show a stepper. Seeded from the recorded build, and
  // only ever added to — see the doc comment on why a row never demotes.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(initialPerSide.map(plateKey)));
  // Promoting a chip unmounts a button in one container and mounts a different
  // one in another, so React cannot treat it as a move and focus falls to
  // <body> — a keyboard or VoiceOver user silently loses their place mid-edit.
  // Handled in the ref callback rather than an effect because that fires
  // exactly when the replacement button mounts, with no extra render.
  const pendingFocusRef = useRef<string | null>(null);

  // Closed by the SAVE, not by the submit. Closing optimistically would throw
  // away the one thing the athlete needs to see when the build is rejected —
  // "esos discos no coinciden con los de tu gimnasio" — along with the counts
  // they just tapped in.
  useEffect(() => {
    if (state.status === "saved") {
      onDone();
    }
  }, [state, onDone]);

  const rows = inventory.filter((plate) => expanded.has(plateKey(plate)));
  const chips = inventory.filter((plate) => !expanded.has(plateKey(plate)));

  const perSide: PlateCount[] = inventory
    .map((plate) => ({ ...plate, count: counts[plateKey(plate)] ?? 0 }))
    .filter((plate) => plate.count > 0);
  // Through plateBuildFromCounts, not a local sum: the running total the
  // athlete reads while tapping has to be the same arithmetic the server will
  // store, or the number moves on save. It is a pure function of the counts,
  // so running it on a keystroke costs nothing.
  const preview = plateBuildFromCounts(perSide);
  const platesPerSide = preview?.plateCount ?? 0;
  const atCap = platesPerSide >= MAX_PLATES_PER_SIDE;

  const bump = (plate: PlateDenomination, delta: number) => {
    setCounts((current) => {
      const key = plateKey(plate);
      return { ...current, [key]: Math.max(0, (current[key] ?? 0) + delta) };
    });
  };

  const promote = (plate: PlateDenomination) => {
    const key = plateKey(plate);
    pendingFocusRef.current = key;
    setExpanded((current) => new Set(current).add(key));
    bump(plate, 1);
  };

  return (
    <form action={formAction} className="mt-2 grid gap-2">
      <input type="hidden" name="workoutSessionId" value={sessionId} />
      <input type="hidden" name="exerciseNameEs" value={exerciseNameEs} />
      <input type="hidden" name="plateBuild" value={serializePlateBuild(perSide)} />

      <p className="text-xs leading-5 text-zinc-400">
        {rows.length === 0
          ? "Toca los discos que pusiste por lado."
          : "¿Cuántos discos de cada uno pusiste por lado?"}
      </p>

      {rows.length > 0 ? (
        <div className="grid gap-1">
          {rows.map((plate) => {
            const key = plateKey(plate);
            const count = counts[key] ?? 0;
            return (
              <div
                key={key}
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-1 ${count > 0 ? "bg-emerald-300/10" : "bg-zinc-950"}`}
              >
                <span className={`text-sm font-semibold ${count > 0 ? "text-emerald-300" : "text-zinc-300"}`}>
                  {plate.value} {plate.unit}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => bump(plate, -1)}
                    disabled={count === 0}
                    aria-label={`Quitar un disco de ${plate.value} ${plate.unit}`}
                    className="min-h-11 w-11 rounded-lg bg-zinc-900 text-lg font-semibold text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums text-zinc-100">{count}</span>
                  <button
                    type="button"
                    ref={(node) => {
                      if (node && pendingFocusRef.current === key) {
                        pendingFocusRef.current = null;
                        node.focus();
                      }
                    }}
                    onClick={() => bump(plate, 1)}
                    disabled={atCap}
                    aria-label={`Añadir un disco de ${plate.value} ${plate.unit}`}
                    className="min-h-11 w-11 rounded-lg bg-zinc-900 text-lg font-semibold text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {chips.length > 0 ? (
        <div className="grid gap-1">
          {rows.length > 0 ? <p className="text-xs leading-5 text-zinc-500">Otros discos</p> : null}
          <div className="flex flex-wrap gap-2">
            {chips.map((plate) => (
              <button
                key={plateKey(plate)}
                type="button"
                onClick={() => promote(plate)}
                disabled={atCap}
                /* The SAME accessible name as the row's "+". Tapping a chip and
                   tapping "+" are one action to the athlete — "pon uno más de
                   este" — so the name must not change when the control does. */
                aria-label={`Añadir un disco de ${plate.value} ${plate.unit}`}
                className="min-h-11 rounded-xl bg-zinc-950 px-3 text-sm font-semibold text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-30"
              >
                {plate.value} {plate.unit}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* The only live region in the editor. One per row would announce on
          every tap across up to eleven controls; this is the amount of
          feedback that is actually useful. */}
      <p className="text-sm leading-6 text-zinc-200" role="status">
        {perSide.length > 0 ? (
          <>
            <span className="font-semibold">{formatPlateCounts(perSide)}</span> por lado ·{" "}
            <span className="font-semibold text-emerald-300">{formatKg(String(preview?.totalKg ?? 0), 1)}</span> ·{" "}
            {platesPerSide * 2} discos
          </>
        ) : (
          "Sin discos — guardar así borra lo que tenías."
        )}
      </p>
      {atCap ? <p className="text-xs leading-5 text-zinc-500">Máximo {MAX_PLATES_PER_SIDE} discos por lado.</p> : null}

      {state.status === "error" ? (
        <p role="alert" className="text-sm leading-6 text-amber-200">
          {state.message}
        </p>
      ) : null}

      <div className="flex gap-2">
        <SubmitButton className="min-h-11 flex-1 rounded-xl bg-emerald-300 px-3 text-sm font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
          Guardar discos
        </SubmitButton>
        <button
          type="button"
          onClick={onDone}
          className="min-h-11 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function plateKey(plate: PlateDenomination): string {
  return `${plate.value}${plate.unit}`;
}

/**
 * Two buttons, no scale, no modal. A "no" writes a real answer ("other")
 * rather than staying null, so the question does not reappear every session
 * and turn into noise — the same reasoning that makes "no pain" store a 0.
 */
function LoadingModelQuestion({
  exerciseNameEs,
  sessionId,
  action,
}: {
  exerciseNameEs: string;
  sessionId: string;
  action: SetLoadingModelAction;
}) {
  // The state is read, not discarded. A refused write — the session resolving
  // to nothing of this athlete's, a rejected loadingModel — used to leave the
  // question sitting there with the tap having visibly done nothing, which
  // reads as a dead button rather than a failure. PlateBuildEditor already
  // says so; this is the same panel.
  const [state, formAction] = useActionState(action, { status: "idle" } as SetLoadingModelActionState);

  return (
    <form action={formAction} className="mt-3 border-t border-zinc-800 pt-3">
      <input type="hidden" name="workoutSessionId" value={sessionId} />
      <input type="hidden" name="exerciseNameEs" value={exerciseNameEs} />
      <p className="text-xs leading-5 text-zinc-400">
        ¿Este ejercicio se carga con discos? Si me lo dices, te digo qué poner en la barra en vez de sólo un número.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="submit"
          name="loadingModel"
          value="plate_loaded"
          className="min-h-11 flex-1 rounded-xl bg-zinc-950 px-3 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-300/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          Sí, con discos
        </button>
        <button
          type="submit"
          name="loadingModel"
          value="other"
          className="min-h-11 flex-1 rounded-xl bg-zinc-950 px-3 text-sm font-semibold text-zinc-300 ring-1 ring-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          No
        </button>
      </div>
      {state.status === "error" ? (
        <p role="alert" className="mt-2 text-xs leading-5 text-amber-200">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
