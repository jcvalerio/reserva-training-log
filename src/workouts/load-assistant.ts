import {
  buildFromScratch,
  chooseLoadStep,
  type LoadingModel,
  type LoadStep,
  type PlateBuild,
} from "@/training/plate-math";
import { loadConventionLabelsEs, type PlateDenomination } from "@/training/units";

import { increaseBandFor, type LoadMechanism } from "./progression-view";

/**
 * Everything the runner needs to stop the athlete doing plate arithmetic on
 * their phone, computed on the server and serialised as plain data.
 *
 * Two questions, and they are not the same question:
 *
 * - `lastBuild` answers "which discs make this number" — the one they are
 *   doing by hand today. They read 122 kg, their gym stocks pounds, and they
 *   convert and search for a combination before they can lift.
 * - `step` answers "what do I ADD" — which is what progressing actually looks
 *   like. Rebuilding a bar from a fresh minimum-plate recipe to add three
 *   kilos is not a thing anyone does.
 */
export type LoadAssist = {
  /** What the weight box means here, stated in words. This is the only place
   *  the app has ever said so, and it is the detection mechanism for an
   *  athlete whose habit differs — cheaper than a column they would have to
   *  find and set correctly. */
  conventionEs: string;
  /** The discs that make the last logged weight. */
  lastBuild: PlateBuild | null;
  /** How far `lastBuild` sits from what they actually typed. Non-zero means
   *  they hand-rounded a conversion; shown, never silently applied. */
  lastBuildDriftKg: number;
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
};

export type LoadAssistInput = {
  lastWeightKg: number | null;
  loadMechanism?: LoadMechanism | null;
  isCompound?: boolean | null;
  loadingModel?: LoadingModel | null;
  inventory: readonly PlateDenomination[];
};

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
  if (input.inventory.length === 0 || !input.lastWeightKg || input.lastWeightKg <= 0) {
    return null;
  }

  const lastBuild = buildFromScratch(input.lastWeightKg, input.inventory);
  const band = increaseBandFor(input.loadMechanism, input.isCompound);

  return {
    conventionEs: loadConventionLabelsEs.plates_both_sides,
    lastBuild,
    lastBuildDriftKg: lastBuild ? Math.round((lastBuild.totalKg - input.lastWeightKg) * 100) / 100 : 0,
    step: chooseLoadStep(input.lastWeightKg, input.inventory, band.low, band.high),
  };
}
