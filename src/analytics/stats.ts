export interface Describe { n: number; mean: number; min: number; max: number; std: number; p10: number; p50: number; p90: number }

export function describe(values: number[]): Describe | null {
  const v = values.filter((x) => Number.isFinite(x));
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const std = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]!;
  return { n: v.length, mean, min: s[0]!, max: s.at(-1)!, std, p10: q(0.1), p50: q(0.5), p90: q(0.9) };
}
