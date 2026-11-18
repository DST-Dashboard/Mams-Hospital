export interface WaterCost {
  consumedL: number;
  ratePerLitre: number | null;
  estimatedCost: number | null;
}

export function waterCost(consumedL: number, ratePerLitre: number | null): WaterCost {
  if (!Number.isFinite(consumedL) || consumedL < 0) throw new RangeError("consumedL must be a non-negative finite number");
  if (ratePerLitre != null && (!Number.isFinite(ratePerLitre) || ratePerLitre < 0)) {
    throw new RangeError("ratePerLitre must be a non-negative finite number");
  }
  return {
    consumedL: Math.round(consumedL),
    ratePerLitre,
    estimatedCost: ratePerLitre == null ? null : Math.round(consumedL * ratePerLitre * 100) / 100,
  };
}
