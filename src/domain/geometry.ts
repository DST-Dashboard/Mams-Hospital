import type { TankGeometry, TankShape } from "./types";

export function baseAreaCm2(shape: TankShape): number {
  return shape.kind === "cylinder" ? Math.PI * shape.radiusCm ** 2 : shape.widthCm * shape.lengthCm;
}

/** Litres for a given water depth (cm). 1 L = 1000 cm³. */
export function volumeLitres(shape: TankShape, levelCm: number): number {
  return (baseAreaCm2(shape) * levelCm) / 1000;
}

/** Total capacity measured the way the dashboard measures fill % (full height). */
export function capacityLitres(g: TankGeometry): number {
  return volumeLitres(g.shape, g.heightCm);
}
