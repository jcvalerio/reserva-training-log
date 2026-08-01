export type Point = { x: number; y: number };

export function scaleLinear(domain: [number, number], range: [number, number]): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  return (value: number) => (span === 0 ? (r0 + r1) / 2 : r0 + ((value - d0) / span) * (r1 - r0));
}

export function buildLinePath(points: Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

/**
 * Pads a [min, max] domain so the plotted min/max points aren't flush
 * against the chart edge. Handles the min===max case (a flat series, or a
 * single point) with a fixed absolute pad instead of a 0-width ratio pad.
 */
export function padDomain([min, max]: [number, number], ratio = 0.1): [number, number] {
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * ratio;
    return [min - pad, max + pad];
  }
  const pad = (max - min) * ratio;
  return [min - pad, max + pad];
}
