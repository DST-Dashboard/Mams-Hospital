import { compareTanks, type CompareResolution } from "@/analytics/compare";
import { listTanks } from "../repos/tanks";
import * as readings from "../repos/readings";

export function tankComparison(from: number, to: number, resolution: CompareResolution) {
  const tanks = listTanks().map((tank) => ({
    tankId: tank.id,
    label: tank.label,
    simulated: tank.simulated,
    geometry: tank.geometry,
    readings: tank.deviceId ? readings.range(tank.deviceId, from, to) : [],
  }));
  return { from, to, resolution, tanks: compareTanks(tanks, from, to, resolution) };
}
