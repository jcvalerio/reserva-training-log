import { roundKg, toKg, type PlateDenomination, type WeightUnit } from "./units";

/**
 * Plate arithmetic for a plate-loaded implement, in two directions.
 *
 * Both exist because of one measured complaint. An athlete returns to the hip
 * thrust, reads "122 kg", and their gym stocks discs in pounds — so before
 * they can lift they convert 122 kg to pounds and work out which combination
 * of 45s, 35s and 25s sums to it. Then, to progress, they do it again for a
 * number the app invented.
 *
 * So:
 *
 * - `buildFromScratch` answers "which discs make this number" — the bar is
 *   empty and has to be loaded.
 * - `chooseLoadStep` answers "what do I ADD to what is already on" — which is
 *   what progressing actually looks like, and is NOT the same question.
 *
 * The difference between those two is the whole design. Snapping a suggestion
 * to the nearest buildable total and rendering its minimum-plate recipe is
 * arithmetically correct and physically absurd: on the real inventory, moving
 * a 122.47 kg hip thrust to the nearest rung above +5% prescribes
 * 1x45lb + 1x35lb + 1x25lb + 1x15kg per side — stripping the bar and
 * rebuilding it from four denominations across two unit families, to add three
 * kilos. Nobody does that. Minimum *plates* is the wrong objective; minimum
 * *change* is the right one.
 */

/** How an exercise takes load. Only `plate_loaded` is served here. */
export const loadingModels = ["stack", "plate_loaded", "fixed_dumbbell", "bodyweight", "band", "other"] as const;

export type LoadingModel = (typeof loadingModels)[number];

export const loadingModelLabelsEs: Record<LoadingModel, string> = {
  stack: "Placas (torre con pin)",
  plate_loaded: "Discos",
  fixed_dumbbell: "Mancuernas fijas",
  bodyweight: "Peso corporal",
  band: "Banda elástica",
  other: "Otro",
};

/** A denomination plus how many of it, always PER SIDE. */
export type PlateCount = PlateDenomination & { count: number };

/** A complete loading of one side, and what it comes to across both. */
export type PlateBuild = {
  perSide: PlateCount[];
  /** Both sides. The convention `setLog.actualWeightKg` is recorded under. */
  totalKg: number;
  /** Discs on one side — the number that decides whether this is practical. */
  plateCount: number;
};

/** Discs to ADD per side, and where that lands. */
export type LoadStep = {
  added: PlateCount[];
  /** Change across both sides. Base-independent: adding a 5 lb pair is
   *  +4.54 kg whatever was already loaded, which is why this needs no record
   *  of the current recipe. */
  deltaKg: number;
  totalKg: number;
  plateCount: number;
};

/**
 * Bounds. Constants rather than schema, deliberately — this is what makes it
 * affordable to NOT track how many of each disc a gym owns. Tracking counts
 * would make every answer depend on state nobody maintains, and a calculator
 * that is confidently wrong is worse than no calculator.
 */
export const MAX_DENOMINATIONS = 12;
export const MAX_PLATES_PER_SIDE = 8;
export const MAX_ADDED_PLATES_PER_SIDE = 3;

function denominationKey(denominations: readonly PlateDenomination[]): string {
  return denominations
    .map((d) => `${d.value}${d.unit}`)
    .sort()
    .join("|");
}

function normalize(denominations: readonly PlateDenomination[]): PlateDenomination[] {
  const seen = new Set<string>();
  const out: PlateDenomination[] = [];
  for (const d of denominations) {
    const key = `${d.value}${d.unit}`;
    if (d.value > 0 && !seen.has(key)) {
      seen.add(key);
      out.push(d);
    }
  }
  // Heaviest first: the enumerator emits fewer-plate builds earlier, and the
  // recipes read the way anyone actually loads a bar.
  return out.sort((a, b) => toKg(b.value, b.unit) - toKg(a.value, a.unit)).slice(0, MAX_DENOMINATIONS);
}

function toCounts(indexes: number[], denominations: readonly PlateDenomination[]): PlateCount[] {
  const byKey = new Map<number, number>();
  for (const i of indexes) {
    byKey.set(i, (byKey.get(i) ?? 0) + 1);
  }
  return [...byKey.entries()].map(([i, count]) => ({ ...denominations[i]!, count }));
}

/**
 * Every total this inventory can build, mapped to its fewest-disc recipe.
 *
 * Memoised on the inventory rather than computed per exercise: the achievable
 * set is a property of the ROOM, not of the movement, and `/entrenar` renders
 * six or seven exercises at once. Enumerating per exercise would run this tens
 * of thousands of times on the hottest server render in the app.
 */
const buildTableCache = new Map<string, Map<number, PlateBuild>>();

function achievableBuilds(denominations: readonly PlateDenomination[]): Map<number, PlateBuild> {
  const key = denominationKey(denominations);
  const cached = buildTableCache.get(key);
  if (cached) {
    return cached;
  }

  const table = new Map<number, PlateBuild>();
  const stack: number[] = [];

  const walk = (start: number, perSideKg: number) => {
    const totalKg = roundKg(perSideKg * 2);
    const existing = table.get(totalKg);
    if (!existing || stack.length < existing.plateCount) {
      table.set(totalKg, {
        perSide: toCounts(stack, denominations),
        totalKg,
        plateCount: stack.length,
      });
    }
    if (stack.length >= MAX_PLATES_PER_SIDE) {
      return;
    }
    // `start` never decreases, so each multiset is generated once rather than
    // once per ordering.
    for (let i = start; i < denominations.length; i += 1) {
      stack.push(i);
      walk(i, perSideKg + toKg(denominations[i]!.value, denominations[i]!.unit));
      stack.pop();
    }
  };

  walk(0, 0);
  buildTableCache.set(key, table);
  return table;
}

/**
 * How far from the requested weight a build may land before it stops counting
 * as an answer to that request. 1%, floored at half a kilo.
 *
 * This exists because "closest total wins" is the wrong objective here too,
 * and testing caught it where reasoning did not. Asked for 122 kg on the real
 * inventory, closest-total returns 122.06 — as 2x45lb + 2x10lb + 1x2.5lb +
 * 1x10kg per side. Six discs across four denominations and two unit families,
 * to be 0.06 kg nearer than 3x45lb at 122.47. Nobody loads that, and the
 * athlete who typed 122 had 3x45lb on the bar.
 *
 * So: fewest discs, subject to landing close enough. Same correction as
 * chooseLoadStep, one level down — practicality is the objective and
 * arithmetic proximity is only the constraint.
 */
const BUILD_TOLERANCE_RATIO = 0.01;
const BUILD_TOLERANCE_FLOOR_KG = 0.5;

/**
 * The discs that make `targetKg`, or the most practical build close to it.
 *
 * Answers the reverse-engineering the athletes are doing by hand today: read
 * 122 kg, get "3 x 45 lb por lado".
 *
 * Returns null only for an empty inventory — with any discs at all, the empty
 * bar is a valid (if unhelpful) answer, and callers decide whether the miss is
 * too large to show.
 */
export function buildFromScratch(
  targetKg: number,
  denominations: readonly PlateDenomination[],
): PlateBuild | null {
  const dens = normalize(denominations);
  if (dens.length === 0) {
    return null;
  }

  const tolerance = Math.max(BUILD_TOLERANCE_FLOOR_KG, Math.abs(targetKg) * BUILD_TOLERANCE_RATIO);
  const builds = [...achievableBuilds(dens).values()];

  const withinTolerance = builds.filter((b) => Math.abs(b.totalKg - targetKg) <= tolerance + 0.001);
  // Nothing close enough (a very light target, or a gym of only heavy discs)
  // falls back to plain proximity — a distant answer stated honestly beats no
  // answer, and the caller renders the gap.
  const pool = withinTolerance.length > 0 ? withinTolerance : builds;
  const preferFewest = withinTolerance.length > 0;

  let best: PlateBuild | null = null;
  for (const build of pool) {
    if (!best || isBetterBuild(build, best, targetKg, preferFewest)) {
      best = build;
    }
  }
  return best;
}

/**
 * Fewest discs, then fewest DISTINCT denominations, then closest.
 *
 * The middle term is not cosmetic and testing is what surfaced it. Asked for
 * 122 kg, plate-count-then-distance picks 1x25kg + 1x20kg + 1x35lb (121.75,
 * off by 0.25) over 3x45lb (122.47, off by 0.47) — three different discs from
 * two unit families, to be a quarter-kilo nearer. Grabbing three of the same
 * disc is materially easier than hunting three different ones, and on this
 * bar 3x45lb is literally what was already loaded.
 */
function isBetterBuild(candidate: PlateBuild, best: PlateBuild, targetKg: number, preferFewest: boolean): boolean {
  if (preferFewest) {
    if (candidate.plateCount !== best.plateCount) {
      return candidate.plateCount < best.plateCount;
    }
    if (candidate.perSide.length !== best.perSide.length) {
      return candidate.perSide.length < best.perSide.length;
    }
  }
  const delta = Math.abs(candidate.totalKg - targetKg) - Math.abs(best.totalKg - targetKg);
  if (Math.abs(delta) > 0.001) {
    return delta < 0;
  }
  if (candidate.plateCount !== best.plateCount) {
    return candidate.plateCount < best.plateCount;
  }
  return candidate.perSide.length < best.perSide.length;
}

/**
 * What to add to a loaded bar to land inside a progression band.
 *
 * `bandLowRatio`/`bandHighRatio` are the mechanism's real range from
 * progression-rules.md (0.05-0.10 machine and lower body, 0.025-0.05 upper
 * compound), not the single conservative low end the code used to collapse
 * them to. That collapse was reasonable when any number was reachable; with a
 * discrete set of discs it throws away every rung but one. The low end stays
 * the TARGET, so the conservative bias is preserved — the band only decides
 * what else is allowed to win.
 *
 * Returns null when nothing in the band is reachable by adding at most
 * MAX_ADDED_PLATES_PER_SIDE discs per side. That is a real answer, not a
 * failure: it means this gym's smallest pair is too big a jump for this load,
 * and the caller should fall back to suggesting a rep instead.
 */
export function chooseLoadStep(
  lastKg: number,
  denominations: readonly PlateDenomination[],
  bandLowRatio: number,
  bandHighRatio: number,
): LoadStep | null {
  const dens = normalize(denominations);
  if (dens.length === 0 || lastKg <= 0) {
    return null;
  }

  const targetKg = lastKg * (1 + bandLowRatio);
  const lowKg = lastKg * (1 + Math.min(bandLowRatio, bandHighRatio));
  const highKg = lastKg * (1 + Math.max(bandLowRatio, bandHighRatio));

  let best: LoadStep | null = null;
  const stack: number[] = [];

  const consider = () => {
    if (stack.length === 0) {
      return;
    }
    const deltaKg = roundKg(stack.reduce((sum, i) => sum + toKg(dens[i]!.value, dens[i]!.unit), 0) * 2);
    const totalKg = roundKg(lastKg + deltaKg);
    if (totalKg < lowKg - 0.001 || totalKg > highKg + 0.001) {
      return;
    }
    const candidate: LoadStep = {
      added: toCounts(stack, dens),
      deltaKg,
      totalKg,
      plateCount: stack.length,
    };
    if (!best || isBetterStep(candidate, best, targetKg)) {
      best = candidate;
    }
  };

  const walk = (start: number) => {
    consider();
    if (stack.length >= MAX_ADDED_PLATES_PER_SIDE) {
      return;
    }
    for (let i = start; i < dens.length; i += 1) {
      stack.push(i);
      walk(i);
      stack.pop();
    }
  };

  walk(0);
  return best;
}

/**
 * Closest to the target first, then fewest discs, then fewest distinct
 * denominations.
 *
 * The order matters and is easy to get backwards: sorting by disc count first
 * picks 1x10lb (+7.4%) over 1x5lb + 1x2.5lb (+5.6%) on the real hip-thrust
 * numbers. Both are one line of instruction and neither is harder to load, so
 * paying nearly two extra percent of load for one fewer disc is the wrong
 * trade — especially on a hinge, for a 47-year-old. Pinned by a test.
 */
function isBetterStep(candidate: LoadStep, best: LoadStep, targetKg: number): boolean {
  const delta = Math.abs(candidate.totalKg - targetKg) - Math.abs(best.totalKg - targetKg);
  if (Math.abs(delta) > 0.001) {
    return delta < 0;
  }
  if (candidate.plateCount !== best.plateCount) {
    return candidate.plateCount < best.plateCount;
  }
  return candidate.added.length < best.added.length;
}

/** "3 × 45 lb + 1 × 2.5 lb" — per side, heaviest first. Dot decimal, matching
 *  formatKg, since both appear in the same rendered sentence. */
export function formatPlateCounts(plates: readonly PlateCount[]): string {
  return [...plates]
    .sort((a, b) => toKg(b.value, b.unit) - toKg(a.value, a.unit))
    .map((p) => `${p.count} × ${p.value} ${p.unit}`)
    .join(" + ");
}

export type { PlateDenomination, WeightUnit };
