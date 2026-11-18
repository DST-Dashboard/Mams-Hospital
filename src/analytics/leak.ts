import type { LevelPoint } from "./events";

export interface LeakEvent { startT: number; endT: number; dropCm: number }

/** Large overnight level drops in the configured local timezone; this is a heuristic, not a confirmed leak diagnosis. */
export function detectNightDrain(points: LevelPoint[], from: number, to: number, tz: "UTC" | "IST" = "IST", minDropCm = 20): LeakEvent[] {
  const offsetMs = tz === "IST" ? 330 * 60_000 : 0;
  const night = points
    .filter((point) => point.t >= from && point.t <= to)
    .sort((a, b) => a.t - b.t)
    .filter((point) => {
      const hour = new Date(point.t + offsetMs).getUTCHours();
      return hour >= 0 && hour < 5;
    });
  const events: LeakEvent[] = [];
  for (let index = 1; index < night.length; index++) {
    const previous = night[index - 1]!;
    const current = night[index]!;
    const dropCm = previous.v - current.v;
    if (dropCm >= minDropCm) events.push({ startT: previous.t, endT: current.t, dropCm });
  }
  return events;
}
