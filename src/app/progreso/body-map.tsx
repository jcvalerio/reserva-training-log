"use client";

import { useState } from "react";

import { muscleGroupLabelsEs, weeklySetReferenceRange, type MuscleGroup } from "@/training/muscle-taxonomy";
import { UNCLASSIFIED_BUCKET, type WeeklyMuscleVolume } from "@/workouts/muscle-volume";

import { anteriorRegions, BODY_MAP_VIEWBOX, posteriorRegions } from "./body-map-geometry";

// A front/back body diagram shaded by how much each muscle was trained this
// week — the "where did the work actually land" view, next to the numbers.
//
// Shading is a single emerald ramp by opacity, never a hue change. Colour in
// this app is reserved for pain, so a lightly-trained muscle must not read as
// a warning; it reads as *less emerald*. Untrained muscles stay zinc, which
// is what makes a skipped muscle visible at a glance — the same signal the
// "Sin series esta semana" line carries in the bar chart, in a form you can
// spot without reading.

type Shade = 0 | 1 | 2 | 3;

/**
 * Effective sets -> one of four steps, relative to that muscle's own reference
 * range rather than to an absolute count. 12 sets is a lot for pantorrillas
 * and modest for dorsal, so an absolute scale would misread both.
 */
export function shadeForVolume(muscleGroup: MuscleGroup, effectiveSets: number): Shade {
  if (effectiveSets <= 0) return 0;
  const { min, max } = weeklySetReferenceRange[muscleGroup];
  if (effectiveSets >= max) return 3;
  // min can legitimately be 0 (core, abductores), which would make any volume
  // instantly "in range" — floor the divisor so the ramp still has steps.
  if (effectiveSets >= Math.max(min, 1)) return 2;
  return 1;
}

const SHADE_CLASS: Record<Shade, string> = {
  0: "fill-zinc-800",
  1: "fill-emerald-300/25",
  2: "fill-emerald-300/60",
  3: "fill-emerald-300",
};

/** Regions with no tracked muscle group — drawn so the silhouette reads as a
 *  body, never highlighted, never tappable. */
const INERT_CLASS = "fill-zinc-800/50";

function BodyView({
  regions,
  setsByGroup,
  titleEs,
  selected,
  onSelect,
}: {
  regions: typeof anteriorRegions;
  setsByGroup: Map<MuscleGroup, number>;
  titleEs: string;
  selected: MuscleGroup | null;
  onSelect: (muscleGroup: MuscleGroup | null) => void;
}) {
  return (
    <figure className="m-0 flex-1">
      <svg
        viewBox={BODY_MAP_VIEWBOX}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={`Vista ${titleEs.toLowerCase()} del cuerpo, coloreada por series entrenadas esta semana`}
      >
        {regions.map((region, regionIndex) =>
          region.polygons.map((points, polygonIndex) => {
            const key = `${regionIndex}-${polygonIndex}`;
            if (!region.muscleGroup) {
              return <polygon key={key} points={points} className={INERT_CLASS} />;
            }
            const sets = setsByGroup.get(region.muscleGroup) ?? 0;
            const isSelected = selected === region.muscleGroup;
            return (
              <polygon
                key={key}
                points={points}
                onPointerDown={() => onSelect(isSelected ? null : region.muscleGroup)}
                className={`${SHADE_CLASS[shadeForVolume(region.muscleGroup, sets)]} ${
                  isSelected ? "stroke-emerald-200" : "stroke-zinc-950"
                } cursor-pointer`}
                strokeWidth={isSelected ? 1.5 : 0.5}
              />
            );
          }),
        )}
      </svg>
      <figcaption className="mt-1 text-center text-xs leading-5 text-zinc-400">{titleEs}</figcaption>
    </figure>
  );
}

export function BodyMap({ week }: { week: WeeklyMuscleVolume }) {
  const [selected, setSelected] = useState<MuscleGroup | null>(null);

  const setsByGroup = new Map<MuscleGroup, number>();
  for (const row of week.byMuscleGroup) {
    if (row.muscleGroup !== UNCLASSIFIED_BUCKET) {
      setsByGroup.set(row.muscleGroup, row.effectiveSets);
    }
  }

  const selectedSets = selected ? (setsByGroup.get(selected) ?? 0) : null;

  return (
    <div>
      <div className="flex items-start gap-2">
        <BodyView
          regions={anteriorRegions}
          setsByGroup={setsByGroup}
          titleEs="Frente"
          selected={selected}
          onSelect={setSelected}
        />
        <BodyView
          regions={posteriorRegions}
          setsByGroup={setsByGroup}
          titleEs="Espalda"
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      <p className="mt-2 min-h-11 text-sm leading-6 text-zinc-300" aria-live="polite">
        {selected && selectedSets !== null ? (
          <>
            <span className="font-semibold text-zinc-100">{muscleGroupLabelsEs[selected]}</span> —{" "}
            {selectedSets === 0
              ? "sin series esta semana"
              : `${selectedSets === 1 ? "1 serie" : `${selectedSets} series`} esta semana · rango de referencia ${
                  weeklySetReferenceRange[selected].min
                }–${weeklySetReferenceRange[selected].max}`}
          </>
        ) : (
          <span className="text-zinc-400">Toca un músculo para ver sus series de la semana.</span>
        )}
      </p>
    </div>
  );
}
