import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { normalizeUplink, parseTs } from "@/dataset/normalize";

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
  it("normalizes real ttn-uplink fixture", () => {
    const fixturePath = path.resolve(process.cwd(), "tests/fixtures/ttn-uplink.json");
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const norm = normalizeUplink(fixture);
    expect(norm.reading.deviceId).toBe("wio-e5-node-01");
    expect(norm.reading.distanceCm).toBeGreaterThan(0);
    expect(norm.reading.fCnt).toBeDefined();
  });
});

describe("fixture dataset (tests/fixtures)", () => {
  const fixturesDir = path.resolve(process.cwd(), "tests/fixtures");
  const manifest = JSON.parse(fs.readFileSync(path.join(fixturesDir, "manifest.json"), "utf8"));
  const devices = JSON.parse(fs.readFileSync(path.join(fixturesDir, "devices.json"), "utf8"));

  it("covers all 5 devices with fixtures", () => {
    expect(manifest.devices).toHaveLength(5);
    expect(manifest.totalReadings).toBe(1500);
  });

  it.each(manifest.devices as string[])("%s is ascending and passes validation", (id) => {
    const f = JSON.parse(fs.readFileSync(path.join(fixturesDir, "readings", `${id}.json`), "utf8"));
    const rows = (f.rows as (number | null)[][]).map((r) => ({
      deviceId: id,
      t: r[0]!,
      distanceCm: r[1]!,
      fCnt: r[2] ?? null,
      rssi: r[3] ?? null,
      snr: r[4] ?? null,
      batteryPct: r[5] ?? null,
      gatewayId: null,
      spreadingFactor: null,
      payloadMatches: null,
    }));
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.t).toBeGreaterThan(rows[i - 1]!.t);
    }
    expect(f.rows.every((r: (number | null)[]) => r[1] != null)).toBe(true);
  });

  it("devices.json covers every device", () => {
    expect(devices.map((d: { deviceId: string }) => d.deviceId).sort()).toEqual([...manifest.devices].sort());
  });
});
