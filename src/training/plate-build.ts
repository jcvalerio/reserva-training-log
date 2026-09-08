import { MAX_PLATES_PER_SIDE, type PlateBuild, type PlateCount } from "./plate-math";
import { byHeaviestFirst, roundKg, toKg, weightUnits, type PlateDenomination, type WeightUnit } from "./units";

/**
 * The recorded build: what the athlete says is on the bar, as opposed to what
 * the enumerator thinks would be a sensible way to reach a number.
 *
 * These are not the same question and the app shipped as if they were. Asked
 * for 63 kg on a real rack, `buildFromScratch` answers `1 x 20 kg + 1 x 25 lb`
 * — arithmetically excellent, and not what was on the bar, because the 25 kg
 * discs were at the far end of the room and the athlete grabbed 45 lb plates
 * instead. Distance to the rack is not in the model and never will be.
 *
 * So this module is the plumbing for an answer rather than a guess: a compact
 * wire format for a per-side build, and a parser that will not accept a disc
 * the gym does not own.
 */

/**
 * "3x45lb|1x25kg" — count, denomination, unit; per side, one group per
 * denomination.
 *
 * A string rather than a repeating field group because the editor is a client
 * component posting through a server action, and one hidden input round-trips
 * without a naming convention that both halves have to agree on. Compact
 * enough to read in a network log while debugging on a phone, which is the
 * only place this feature can actually be tested.
 */
export function serializePlateBuild(perSide: readonly PlateCount[]): string {
  return perSide
    .filter((plate) => plate.count > 0)
    .map((plate) => `${plate.count}x${plate.value}${plate.unit}`)
    .join("|");
}

const GROUP = /^(\d+)x(\d+(?:\.\d+)?)(kg|lb)$/;

/**
 * Parses a wire build and REJECTS any denomination the gym has not recorded.
 *
 * The validation is the point, not defensive habit. A build is the one input
 * in this feature whose numbers are not derived from the inventory, so an
 * unchecked one is a channel for inventing discs that do not exist — and
 * every recipe, drift figure and prefilled weight downstream would then be
 * confidently wrong in a way nothing else in the app could detect. Cheaper to
 * refuse here than to explain later.
 *
 * Returns null for anything malformed, over the per-side cap, or drawing on a
 * disc outside `inventory`. Empty input returns an empty array, which is how
 * the athlete clears a build they no longer stand behind.
 */
export function parsePlateBuild(
  raw: string,
  inventory: readonly PlateDenomination[],
): PlateCount[] | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return [];
  }

  const stocked = new Map<string, PlateDenomination>();
  for (const plate of inventory) {
    stocked.set(denominationKey(plate.value, plate.unit), plate);
  }

  const seen = new Set<string>();
  const out: PlateCount[] = [];
  let total = 0;

  for (const group of trimmed.split("|")) {
    const match = GROUP.exec(group);
    if (!match) {
      return null;
    }
    const count = Number(match[1]);
    const value = Number(match[2]);
    const unit = match[3] as WeightUnit;
    if (!(weightUnits as readonly string[]).includes(unit) || count <= 0 || value <= 0) {
      return null;
    }
    const key = denominationKey(value, unit);
    // A denomination twice would let two groups disagree about the same disc.
    if (seen.has(key) || !stocked.has(key)) {
      return null;
    }
    seen.add(key);
    total += count;
    if (total > MAX_PLATES_PER_SIDE) {
      return null;
    }
    out.push({ value, unit, count });
  }

  return sortHeaviestFirst(out);
}

function denominationKey(value: number, unit: WeightUnit): string {
  return `${value}${unit}`;
}

function sortHeaviestFirst(plates: PlateCount[]): PlateCount[] {
  return [...plates].sort(byHeaviestFirst);
}

/**
 * A recorded per-side build as a `PlateBuild`, so it renders through exactly
 * the same code as a computed one.
 *
 * `totalKg` is BOTH sides, because that is the convention every logged weight
 * in this app is already recorded under (`loadConventionLabelsEs`). Converting
 * at full precision and rounding once is what keeps 3 x 45 lb at 122.47 rather
 * than accumulating a half-kilo of error per entry.
 */
export function plateBuildFromCounts(perSide: readonly PlateCount[]): PlateBuild | null {
  const plates = perSide.filter((plate) => plate.count > 0);
  if (plates.length === 0) {
    return null;
  }
  const perSideKg = plates.reduce((sum, plate) => sum + toKg(plate.value, plate.unit) * plate.count, 0);
  return {
    perSide: sortHeaviestFirst([...plates]),
    totalKg: roundKg(perSideKg * 2),
    plateCount: plates.reduce((sum, plate) => sum + plate.count, 0),
  };
}
