export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function roundTo(value: number, decimalPlaces = 2): number {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
}

export function percentage(value: number, total: number): number {
  if (total === 0) return 0;

  return roundTo((value / total) * 100, 2);
}
