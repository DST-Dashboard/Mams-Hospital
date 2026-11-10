import { describe, expect, it } from "vitest";
import { loadDevices, loadManifest, loadReadings } from "@/dataset/files";
import { normalizeUplink, parseTs } from "@/dataset/normalize";
import { validateSeries } from "@/dataset/validate";

const raw = (dev: string, slot: number, dist: number | null, extra: Record<string, number | null> = {}) => ({
  time: "2026-10-30T05:41:48.287704342Z",
  data: { end_device_ids: { device_id: dev }, uplink_message: { f_cnt: 5, decoded_payload: { [`Node${slot}_distance_cm`]: dist, ...extra } } },
});
describe("normalize", () => {
  it("parses 9-digit fractional seconds", () => expect(parseTs("2026-10-30T05:41:48.287704342Z")).toBe(Date.UTC(2026, 9, 30, 5, 41, 48, 287)));
  it("picks the single non-null slot", () => expect(normalizeUplink(raw("wio-e5-node-01", 1, 202, { Node2_distance_cm: null })).reading).toMatchObject({ deviceId: "wio-e5-node-01", distanceCm: 202 }));
  it("rejects zero or multiple distance slots", () => {
    expect(() => normalizeUplink(raw("wio-e5-node-01", 1, null))).toThrow(/exactly 1/);
    expect(() => normalizeUplink(raw("wio-e5-node-01", 1, 202, { Node2_distance_cm: 50 }))).toThrow(/exactly 1/);
  });
  it("rejects a node reporting in someone else's slot", () => expect(() => normalizeUplink(raw("wio-e5-node-02", 1, 202))).toThrow(/slot/));
  it("accepts the live-webhook shape (no data wrapper)", () => {
    const w = raw("wio-e5-node-03", 3, 236); expect(normalizeUplink({ ...w.data, received_at: w.time }).reading.distanceCm).toBe(236);
  });
});
describe("shipped dataset (data/processed)", () => {
  const m = loadManifest();
  it("is complete: 5 devices × 2016 readings, one week", () => {
    expect(m.devices).toHaveLength(5); expect(m.totalReadings).toBe(10_080);
    expect((m.endT - m.startT) / 86_400_000).toBeGreaterThan(6.99);
  });
  it.each(m.devices)("%s is ascending, gap-free, f_cnt-continuous", (id) => {
    const f = loadReadings(id);
    const rows = f.rows.map((r) => ({ deviceId: id, t: r[0]!, distanceCm: r[1]!, fCnt: r[2] ?? null, rssi: r[3] ?? null, snr: r[4] ?? null, batteryPct: r[5] ?? null, gatewayId: null, spreadingFactor: null, payloadMatches: null }));
    const rep = validateSeries(id, rows);
    expect(rep.problems).toEqual([]); expect(f.rows.every((r) => r[1] != null)).toBe(true);
  });
  it("devices.json covers every device", () => expect(loadDevices().map((d) => d.deviceId).sort()).toEqual([...m.devices].sort()));
});
