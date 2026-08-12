import { anteriorRegions, BODY_MAP_VIEWBOX, posteriorRegions } from "@/app/progreso/body-map-geometry";
import { muscleGroupLabelsEs, type MuscleGroup } from "@/training/muscle-taxonomy";

// A tiny, non-interactive front/back silhouette on each plan-builder day
// card — "which muscles does this day actually hit" at a glance, before
// tapping in to read the exercise list. Reuses the same vendored geometry as
// /progreso's BodyMap (see body-map-geometry.ts for the licence note)
// instead of a second copy of the artwork, but unlike that component this is
// binary (trained or not) rather than shaded by volume — a draft day has no
// set counts to shade against, only the set of muscle groups its exercises
// resolve to.

function ThumbnailView({ regions, trained }: { regions: typeof anteriorRegions; trained: Set<MuscleGroup> }) {
  return (
    <svg viewBox={BODY_MAP_VIEWBOX} className="h-full w-auto" aria-hidden="true">
      {regions.map((region, regionIndex) =>
        region.polygons.map((points, polygonIndex) => (
          <polygon
            key={`${regionIndex}-${polygonIndex}`}
            points={points}
            className={region.muscleGroup && trained.has(region.muscleGroup) ? "fill-emerald-300" : "fill-zinc-800"}
          />
        )),
      )}
    </svg>
  );
}

export function SessionMuscleThumbnail({ muscleGroups }: { muscleGroups: MuscleGroup[] }) {
  const trained = new Set(muscleGroups);
  const label =
    muscleGroups.length > 0
      ? `Entrena ${muscleGroups.map((group) => muscleGroupLabelsEs[group]).join(", ")}`
      : "Sin ejercicios clasificados todavía";

  return (
    <div className="flex h-14 shrink-0 items-center gap-0.5" role="img" aria-label={label}>
      <ThumbnailView regions={anteriorRegions} trained={trained} />
      <ThumbnailView regions={posteriorRegions} trained={trained} />
    </div>
  );
}
