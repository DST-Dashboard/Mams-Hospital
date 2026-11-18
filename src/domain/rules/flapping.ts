import { derive } from "../derive";
import type { Reading, TankGeometry } from "../types";

const WINDOW = 6;
const MIN_JUMP_CM = 15;
const MIN_ALTERNATIONS = 3;

export function flapping(readings: Reading[], geometry: TankGeometry, now: number) {
  const levels = readings
    .filter((reading) => reading.t <= now)
    .slice(-WINDOW)
    .map((reading) => derive(reading.distanceCm, geometry).levelCm)
    .filter((level): level is number => level != null);
  const directions = levels.slice(1).map((level, index) => {
    const delta = level - levels[index]!;
    return Math.abs(delta) >= MIN_JUMP_CM ? Math.sign(delta) : 0;
  });
  const significant = directions.filter((direction) => direction !== 0);
  let alternations = 0;
  for (let i = 1; i < significant.length; i++) {
    if (significant[i] !== significant[i - 1]) alternations++;
  }
  const raise = significant.length >= MIN_ALTERNATIONS + 1 && alternations >= MIN_ALTERNATIONS;
  return { raise, clear: levels.length >= WINDOW && !raise, alternations };
}
