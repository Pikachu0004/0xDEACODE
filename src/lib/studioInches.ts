/** Scene units are treated as meters for AR scale. */
export const METERS_PER_INCH = 0.0254;
export const INCHES_PER_METER = 39.37007874015748;

export function metersToInches(m: number): number {
  return m / METERS_PER_INCH;
}

export function inchesToMeters(inches: number): number {
  return inches * METERS_PER_INCH;
}

/** Human-readable inches (1 decimal for small objects). */
export function formatInches(inches: number): string {
  if (!Number.isFinite(inches)) return '—';
  const abs = Math.abs(inches);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return `${inches.toFixed(digits)}"`;
}

export function formatDimsInches(w: number, h: number, d: number): string {
  return `${formatInches(metersToInches(w))} × ${formatInches(metersToInches(h))} × ${formatInches(metersToInches(d))}`;
}
