import { plateBuildFromCounts } from "@/training/plate-build";
import {
  buildFromScratch,
  chooseLoadStep,
  type LoadingModel,
  type LoadStep,
  type PlateBuild,
  type PlateCount,
} from "@/training/plate-math";
import { byHeaviestFirst, loadConventionLabelsEs, type PlateDenomination } from "@/training/units";

import { increaseBandFor, type LoadMechanism } from "./progression-view";

/**
 * Everything the runner needs to stop the athlete doing plate arithmetic on
 * their phone, computed on the server and serialised as plain data.
 *
 * THREE questions, and the first version conflated the first two:
 *
 * - `savedBuild` answers "what is on the bar" — a fact, only ever obtained by
 *   asking. Nothing derives it.
 * - `suggestedBuild` answers "which discs COULD make this number" — an offer,
 *   shown only while no answer has been recorded.
 * - `step` answers "what do I ADD" — which is what progressing actually looks
 *   like. Rebuilding a bar from a fresh minimum-plate recipe to add three
 *   kilos is not a thing anyone does.
 *
 * The first shipped version had no `savedBuild` and rendered `suggestedBuild`
 * under the label "La vez pasada", which made a computation impersonate a
 * record. Caught in preview on real data: 63 kg came back as
 * `1 x 20 kg + 1 x 25 lb`, and the athlete had used 45 lb discs because the
 * 25 kg plates were at the other end of the gym. The enumerator has no term
 * for how far you have to walk, and it never will — so the fix is not a
 * better objective function, it is asking.
 */
export type LoadAssist = {
  /** What the weight box means here, stated in words. This is the only place
   *  the app has ever said so, and it is the detection mechanism for an
   *  athlete whose habit differs — cheaper than a column they would have to
   *  find and set correctly. */
  conventionEs: string;
  /** The discs this gym stocks, so the editor can offer them as taps rather
   *  than asking anyone to type "45 lb" on a phone between sets. */
  inventory: PlateDenomination[];
  /** What the athlete told us is on the bar, per side. Null until they say. */
  savedBuild: PlateBuild | null;
  /** When they said it. A build is a claim with an age — discs come off. */
  savedBuildRecordedAt: string | null;
  /**
   * How far the recorded build's true mass sits from what they typed. This is
   * the ONLY honest place for this number: the shipped version computed it
   * against the guessed build and rendered it as "(62.7 kg reales)", asserting
   * a mass nobody had lifted. A drift figure is only as true as the recipe it
   * came from.
   */
  savedBuildDriftKg: number;
  /**
   * The recorded build no longer matches the weight they last logged — they
   * moved the load since recording it. Surfaced rather than silently ignored,
   * because a stale build is still the best evidence of which DENOMINATIONS
   * this athlete reaches for; it just no longer says how many.
   */
  savedBuildIsStale: boolean;
  /** A build this gym could make. An offer, never history. Suppressed once
   *  `savedBuild` exists, since a guess beside a fact is only noise. */
  suggestedBuild: PlateBuild | null;
  /**
   * Discs to add to reach the next load. Computed unconditionally, and the
   * caller decides whether an increase was actually earned.
   *
   * That split is deliberate rather than tidy: the progression action is
   * derived during CLIENT render in session-runner.tsx, while this enumeration
   * has to stay on the server — up to ~75k multisets is not something to run
   * on a phone between sets. Computing the step regardless lets both live
   * where they belong.
   *
   * Null means no pair of discs in this gym lands inside the band. Not a
   * failure: it means the smallest available jump is too big for this load,
   * and the runner should say so rather than invent a number.
   */
  step: LoadStep | null;
  /**
   * Where the step lands and what holding looks like, in true kilograms —
   * `null` unless a fresh recorded build makes those numbers real.
   *
   * The runner prefills the NEXT set's weight box from these. It never
   * rewrites a logged set: invariant 13 in data-model.md, because shifting
   * past weights moves every /progreso number and can hand
   * buildWeeklyLoadGuardrail a ratio it reads as escalation.
   */
  trueHoldKg: number | null;
  trueStepKg: number | null;
};

export type LoadAssistInput = {
  lastWeightKg: number | null;
  loadMechanism?: LoadMechanism | null;
  isCompound?: boolean | null;
  loadingModel?: LoadingModel | null;
  inventory: readonly PlateDenomination[];
  /**
   * The last weight logged for this exercise in THIS session, if any.
   *
   * Deliberately separate from `lastWeightKg`, which is the previous session's
   * and drives what to progress TO. This one answers a different question —
   * what is on the bar right now — and is the only honest thing to judge a
   * recorded build against.
   *
   * Missing it shipped a visible lie: on a first session there is no previous
   * weight, so nothing could contradict the build, and a `3 × 45 lb` recorded
   * by mistake was stated as fact on an exercise being logged at 35 kg — with
   * "Set 1 · 35kg" on screen three lines above it.
   */
  loggedWeightKg?: number | null;
  /** The athlete's recorded per-side build for this exercise, if they have
   *  given one. Validated at the write edge, in parsePlateBuild. */
  recordedBuild?: readonly PlateCount[] | null;
  recordedBuildAt?: Date | null;
};

/**
 * How far a recorded build's true mass may sit from the last logged weight
 * before it stops describing that weight. 1%, floored at half a kilo — the
 * same tolerance buildFromScratch uses, and for the same reason: it is the
 * width of a hand-rounded unit conversion, which is exactly the gap this
 * feature exists to explain.
 *
 * Inside it, the build describes the logged weight and its total is the truer
 * number. Outside it, the athlete moved the load and the build is history.
 */
const STALE_TOLERANCE_RATIO = 0.01;
const STALE_TOLERANCE_FLOOR_KG = 0.5;

/**
 * Returns null when there is nothing useful to say — no discs recorded, no
 * previous weight, or an exercise that is not plate-loaded.
 *
 * `loadingModel` must be an explicit `plate_loaded`. It is deliberately NOT
 * inferred from `loadMechanism`, because `loadMechanism = "machine"` covers
 * both a selectorized stack and a plate-loaded machine and nothing stored
 * today separates them. Guessing here would render a disc recipe for a pin
 * stack, which is worse than rendering nothing.
 */
export function buildLoadAssist(input: LoadAssistInput): LoadAssist | null {
  if (input.loadingModel !== "plate_loaded") {
    return null;
  }
  if (input.inventory.length === 0) {
    return null;
  }

  // Deliberately NOT gated on a previous weight any more, and that was the
  // second thing preview caught. A previous weight is what the STEP and the
  // suggested build are computed from; the recorded build is a fact about the
  // machine standing in front of you, and the first session on an exercise is
  // exactly when the app knows least and the athlete knows most. Requiring
  // history to accept an answer meant "¿lleva discos?" could not be answered
  // until session two either — logged as a known gap in the previous entry,
  // and reported by the athlete the first time they used it.
  const lastWeightKg = input.lastWeightKg && input.lastWeightKg > 0 ? input.lastWeightKg : null;
  const loggedWeightKg = input.loggedWeightKg && input.loggedWeightKg > 0 ? input.loggedWeightKg : null;
  const savedBuild = input.recordedBuild ? plateBuildFromCounts(input.recordedBuild) : null;

  // Today's set first: it is the freshest evidence of what the discs actually
  // come to, and it is the only evidence at all on a first session. Falling
  // back to the previous session keeps a build honest between sessions, when
  // nothing has been logged yet.
  const referenceKg = loggedWeightKg ?? lastWeightKg;

  // With no logged weight anywhere there is nothing for the build to disagree
  // WITH, so it cannot be stale and there is no drift to report. It is simply
  // the only thing known about this bar.
  const driftKg = savedBuild && referenceKg ? Math.round((savedBuild.totalKg - referenceKg) * 100) / 100 : 0;
  const tolerance = referenceKg
    ? Math.max(STALE_TOLERANCE_FLOOR_KG, referenceKg * STALE_TOLERANCE_RATIO)
    : Infinity;
  const isStale = savedBuild !== null && Math.abs(driftKg) > tolerance + 0.001;
  const isFresh = savedBuild !== null && !isStale;

  // A fresh recorded build is the truer base for plate arithmetic: the athlete
  // typed 122 and 3 x 45 lb is 122.47, so a step computed off 122 lands half a
  // kilo out. The progression suggestion itself is deliberately NOT rebased —
  // suggestNextWeightKg still reads the logged weight, so no stored number and
  // no guardrail sees a value it did not see before.
  const baseKg = isFresh ? savedBuild.totalKg : lastWeightKg;
  const band = increaseBandFor(input.loadMechanism, input.isCompound);
  // Gated on a previous WEIGHT, not merely on a base. A recorded build gives a
  // base even on a first session, but "what do I add" is a question about
  // history — answering it from a bar that has never been lifted would
  // prescribe an increase over nothing.
  const step = lastWeightKg && baseKg ? chooseLoadStep(baseKg, input.inventory, band.low, band.high) : null;

  return {
    conventionEs: loadConventionLabelsEs.plates_both_sides,
    // Sorted heaviest-first by real mass, not by the number printed on the
    // disc. The editor rendered this in stored order until 2026-09-07, which
    // put 45 lb (20.41 kg) below 5 kg because they sit in different unit
    // families — so the athlete scrolled past every kg plate to reach the one
    // they always use.
    inventory: [...input.inventory].sort(byHeaviestFirst),
    savedBuild,
    savedBuildRecordedAt: input.recordedBuildAt ? input.recordedBuildAt.toISOString() : null,
    savedBuildDriftKg: driftKg,
    savedBuildIsStale: isStale,
    // Suppressed once a build is recorded, including a stale one: offering a
    // machine's guess beside the athlete's own answer invites them to wonder
    // which the app believes. Null without a previous weight too — there is
    // no number to reverse-engineer yet, and this is the panel's one branch
    // that has nothing to say rather than something to ask.
    suggestedBuild: savedBuild || !lastWeightKg ? null : buildFromScratch(lastWeightKg, input.inventory),
    step,
    // On a first session this is the whole point: they load the bar, tap the
    // discs, and the weight box gets 122.47 instead of them converting pounds
    // in their head — which is the complaint the feature was built for, at the
    // one moment it previously had nothing to offer.
    trueHoldKg: isFresh ? savedBuild.totalKg : null,
    trueStepKg: isFresh && step ? step.totalKg : null,
  };
}
