import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q, q1 } from "@/server/db";
import { resetEnvCache } from "@/server/env";
import { createTank } from "@/server/repos/tanks";
import { middleware } from "@/middleware";
import { extractItems, resolveTimestamp } from "@/server/services/ingest";
import * as ingestRoute from "@/app/api/ingest/route";

const KEY = `ohtms_live_${"a1b2c3d4".repeat(8)}`;
const OLD_KEY = `ohtms_live_${"0f0e0d0c".repeat(8)}`;

const call = (
  method: "GET" | "POST",
  body?: unknown,
  opts: { key?: string | null; bearer?: boolean; contentType?: string | null; raw?: string } = {}
) => {
  const headers: Record<string, string> = {};
  const key = opts.key === undefined ? KEY : opts.key;
  if (key) {
    if (opts.bearer) headers.authorization = `Bearer ${key}`;
    else headers["x-api-key"] = key;
  }
  if (opts.contentType !== null) headers["content-type"] = opts.contentType ?? "application/json";
  const init: RequestInit = { method, headers };
  if (method === "POST") init.body = opts.raw ?? JSON.stringify(body);
  const req = new Request("http://localhost/api/ingest", init);
  return method === "GET" ? ingestRoute.GET(req) : ingestRoute.POST(req);
};

describe("POST /api/ingest (API-key data push)", () => {
  let ctx: TestSchemaContext;
  let tank1: number;
  let tank2: number;
  let tankSim: number;

  const readingsFor = (deviceId: string) =>
    q<{ t: string; distance_cm: number; source: string; rssi: number | null; battery_pct: number | null; gateway_id: string | null }>(
      "SELECT t, distance_cm, source, rssi, battery_pct, gateway_id FROM readings WHERE device_id = $1 ORDER BY t",
      [deviceId]
    );

  beforeAll(async () => {
    ctx = await createTestSchema();
    process.env.INGEST_API_KEY = KEY;
    resetEnvCache();

    const t0 = Date.now();
    for (const id of ["push-01", "push-02"]) {
      await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ($1, FALSE, $2)", [id, t0]);
    }
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('push-sim', TRUE, $1)", [t0]);

    const geometry = { shape: "cylinder" as const, heightCm: 300, radiusCm: 100, deadZoneCm: 25, dimsConfirmed: true, status: "active" as const };
    tank1 = await createTank({ label: "Tank One", deviceId: "push-01", ...geometry });
    tank2 = await createTank({ label: "Tank Two", deviceId: "push-02", ...geometry });
    tankSim = await createTank({ label: "Tank Sim", deviceId: "push-sim", ...geometry });
  });

  afterAll(async () => {
    delete process.env.INGEST_API_KEY;
    resetEnvCache();
    if (ctx) await ctx.cleanup();
  });

  describe("authentication", () => {
    it("rejects a request with no key (401)", async () => {
      const res = await call("POST", { deviceId: "push-01", distanceCm: 120 }, { key: null });
      expect(res.status).toBe(401);
      expect(res.headers.get("www-authenticate")).toContain("ApiKey");
    });

    it("rejects a wrong key (401) and stores nothing", async () => {
      const res = await call("POST", { deviceId: "push-01", distanceCm: 120 }, { key: OLD_KEY });
      expect(res.status).toBe(401);
      expect((await readingsFor("push-01")).length).toBe(0);
    });

    it("rejects a key that is only a prefix of the real one", async () => {
      const res = await call("POST", { deviceId: "push-01", distanceCm: 120 }, { key: KEY.slice(0, -1) });
      expect(res.status).toBe(401);
    });

    it("does not accept the key from the URL query string", async () => {
      const req = new Request(`http://localhost/api/ingest?key=${KEY}&secret=${KEY}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId: "push-01", distanceCm: 120 }),
      });
      expect((await ingestRoute.POST(req)).status).toBe(401);
    });

    it("accepts Authorization: Bearer as well as X-API-Key", async () => {
      const res = await call("GET", undefined, { bearer: true });
      expect(res.status).toBe(200);
    });

    it("supports key rotation with two comma-separated keys", async () => {
      process.env.INGEST_API_KEY = `${OLD_KEY}, ${KEY}`;
      resetEnvCache();
      try {
        expect((await call("GET", undefined, { key: OLD_KEY })).status).toBe(200);
        expect((await call("GET", undefined, { key: KEY })).status).toBe(200);
        expect((await call("GET", undefined, { key: "x".repeat(40) })).status).toBe(401);
      } finally {
        process.env.INGEST_API_KEY = KEY;
        resetEnvCache();
      }
    });

    it("is disabled (503) when no key is configured, even if the caller sends one", async () => {
      delete process.env.INGEST_API_KEY;
      resetEnvCache();
      try {
        expect((await call("POST", { deviceId: "push-01", distanceCm: 120 })).status).toBe(503);
      } finally {
        process.env.INGEST_API_KEY = KEY;
        resetEnvCache();
      }
    });

    it("treats a too-short configured key as not configured", async () => {
      process.env.INGEST_API_KEY = "short";
      resetEnvCache();
      try {
        expect((await call("POST", { deviceId: "push-01", distanceCm: 120 }, { key: "short" })).status).toBe(503);
      } finally {
        process.env.INGEST_API_KEY = KEY;
        resetEnvCache();
      }
    });

    it("is reachable without a login cookie, while other API routes still require one", async () => {
      const open = await middleware(new NextRequest("http://localhost/api/ingest", { method: "POST" }));
      expect(open.headers.get("x-middleware-next")).toBe("1");

      const closed = await middleware(new NextRequest("http://localhost/api/tanks"));
      expect(closed.status).toBe(401);
    });
  });

  describe("connectivity check (GET)", () => {
    it("lists the device ids that will be accepted", async () => {
      const res = await call("GET");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.acceptedDevices.map((d: { deviceId: string }) => d.deviceId).sort()).toEqual(["push-01", "push-02", "push-sim"]);
    });

    it("requires the key", async () => {
      expect((await call("GET", undefined, { key: null })).status).toBe(401);
    });
  });

  describe("request handling", () => {
    it("rejects non-JSON content types (415)", async () => {
      expect((await call("POST", {}, { contentType: "text/plain" })).status).toBe(415);
      expect((await call("POST", {}, { contentType: null })).status).toBe(415);
    });

    it("rejects malformed JSON (400)", async () => {
      expect((await call("POST", undefined, { raw: "{not json" })).status).toBe(400);
    });

    it("rejects an oversized body (413)", async () => {
      const big = JSON.stringify({ deviceId: "push-01", distanceCm: 100, gatewayId: "x".repeat(300_000) });
      expect((await call("POST", undefined, { raw: big })).status).toBe(413);
    });
  });

  describe("storing readings", () => {
    it("stores a single reading by deviceId and returns derived values (201)", async () => {
      const t = Date.now() - 120_000;
      const res = await call("POST", { deviceId: "push-01", distanceCm: 120, t, batteryPct: 88, rssi: -97, snr: 7.5, fCnt: 41, gatewayId: "gw-1" });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toMatchObject({ ok: true, received: 1, inserted: 1, duplicates: 0 });
      expect(body.results[0]).toMatchObject({
        tankId: tank1,
        deviceId: "push-01",
        t,
        distanceCm: 120,
        levelCm: 180,
        levelPct: 60,
        quality: "ok",
        status: "inserted",
      });

      const rows = await readingsFor("push-01");
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ distance_cm: 120, source: "api", rssi: -97, battery_pct: 88, gateway_id: "gw-1" });
      expect(Number(rows[0]!.t)).toBe(t);
    });

    it("identifies the tank by tankId too", async () => {
      const t = Date.now() - 110_000;
      const res = await call("POST", { tankId: tank2, distanceCm: 150, t });
      expect(res.status).toBe(201);
      expect((await readingsFor("push-02")).map((r) => r.distance_cm)).toEqual([150]);
    });

    it("converts levelCm (water height) into the sensor distance", async () => {
      const t = Date.now() - 100_000;
      const res = await call("POST", { deviceId: "push-02", levelCm: 200, t });
      expect(res.status).toBe(201);
      expect((await res.json()).results[0]).toMatchObject({ distanceCm: 100, levelCm: 200 });
    });

    it("timestamps with the server time when t is omitted", async () => {
      const before = Date.now();
      const res = await call("POST", { deviceId: "push-01", distanceCm: 130 });
      expect(res.status).toBe(201);
      const t = (await res.json()).results[0].t as number;
      expect(t).toBeGreaterThanOrEqual(before);
      expect(t).toBeLessThanOrEqual(Date.now());
    });

    it("accepts epoch seconds, ISO-8601 strings and numeric strings", async () => {
      const base = Date.now() - 3 * 3600_000;
      const iso = new Date(base + 1000).toISOString();
      const res = await call("POST", [
        { deviceId: "push-01", distanceCm: "140", t: Math.floor(base / 1000), batteryPct: "90" },
        { deviceId: "push-01", distanceCm: 141, t: iso },
      ]);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.results[0]).toMatchObject({ distanceCm: 140, t: Math.floor(base / 1000) * 1000 });
      expect(body.results[1].t).toBe(Date.parse(iso));
    });

    it("accepts a batch as an array and as { readings: [...] }", async () => {
      const base = Date.now() - 5 * 3600_000;
      const a = await call("POST", [
        { deviceId: "push-01", distanceCm: 100, t: base },
        { deviceId: "push-02", distanceCm: 101, t: base },
      ]);
      expect(a.status).toBe(201);
      expect((await a.json()).inserted).toBe(2);

      const b = await call("POST", { readings: [{ deviceId: "push-01", distanceCm: 102, t: base + 60_000 }] });
      expect(b.status).toBe(201);
      expect((await b.json()).inserted).toBe(1);
    });

    it("is retry-safe: re-sending a stored reading is a duplicate and never overwrites (200)", async () => {
      const t = Date.now() - 7 * 3600_000;
      expect((await call("POST", { deviceId: "push-01", distanceCm: 111, t })).status).toBe(201);

      const again = await call("POST", { deviceId: "push-01", distanceCm: 222, t });
      expect(again.status).toBe(200);
      expect(await again.json()).toMatchObject({ inserted: 0, duplicates: 1 });

      const row = await q1<{ distance_cm: number }>("SELECT distance_cm FROM readings WHERE device_id = 'push-01' AND t = $1", [t]);
      expect(row?.distance_cm).toBe(111);
    });

    it("ignores unknown extra fields from the sender", async () => {
      const res = await call("POST", { deviceId: "push-02", distanceCm: 90, t: Date.now() - 9 * 3600_000, firmware: "1.2.3", vendorTag: { a: 1 } });
      expect(res.status).toBe(201);
    });
  });

  describe("validation (all-or-nothing)", () => {
    const rejects = async (payload: unknown, match: RegExp) => {
      const res = await call("POST", payload);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(JSON.stringify(body.details)).toMatch(match);
      return body;
    };

    it("rejects an unknown device", async () => {
      await rejects({ deviceId: "nope-99", distanceCm: 100 }, /Unknown deviceId/);
    });

    it("rejects an unknown or soft-deleted tank", async () => {
      await rejects({ tankId: 987654, distanceCm: 100 }, /Unknown tankId/);
      await q("UPDATE tanks SET deleted_at = $1 WHERE id = $2", [Date.now(), tank2]);
      try {
        await rejects({ deviceId: "push-02", distanceCm: 100 }, /Unknown deviceId/);
      } finally {
        await q("UPDATE tanks SET deleted_at = NULL WHERE id = $1", [tank2]);
      }
    });

    it("rejects a mismatched deviceId/tankId pair", async () => {
      await rejects({ deviceId: "push-01", tankId: tank2, distanceCm: 100 }, /does not belong/);
    });

    it("requires a tank and a measurement", async () => {
      await rejects({ distanceCm: 100 }, /deviceId/);
      await rejects({ deviceId: "push-01" }, /distanceCm/);
    });

    it("rejects out-of-range and non-numeric values", async () => {
      await rejects({ deviceId: "push-01", distanceCm: -5 }, /distanceCm/);
      await rejects({ deviceId: "push-01", distanceCm: "abc" }, /distanceCm/);
      await rejects({ deviceId: "push-01", distanceCm: 100, batteryPct: 150 }, /batteryPct/);
      await rejects({ deviceId: "push-01", levelCm: 301 }, /higher than the tank/);
    });

    it("rejects future, ancient and unparseable timestamps", async () => {
      await rejects({ deviceId: "push-01", distanceCm: 100, t: Date.now() + 3600_000 }, /future/);
      await rejects({ deviceId: "push-01", distanceCm: 100, t: Date.now() - 400 * 24 * 3600_000 }, /year old/);
      await rejects({ deviceId: "push-01", distanceCm: 100, t: "yesterday-ish" }, /epoch milliseconds/);
    });

    it("rejects empty bodies, empty arrays and oversized batches", async () => {
      await rejects([], /Send a reading/);
      await rejects("just text", /Send a reading/);
      await rejects(
        Array.from({ length: 101 }, () => ({ deviceId: "push-01", distanceCm: 100 })),
        /At most 100/
      );
    });

    it("stores NOTHING when one reading in a batch is bad, and says which one", async () => {
      const before = (await readingsFor("push-01")).length;
      const base = Date.now() - 20 * 3600_000;
      const body = await rejects(
        [
          { deviceId: "push-01", distanceCm: 100, t: base },
          { deviceId: "nope-99", distanceCm: 100, t: base },
        ],
        /"index":1/
      );
      expect(body.details).toHaveLength(1);
      expect((await readingsFor("push-01")).length).toBe(before);
    });

    it("records rejected payloads for debugging, but not unauthenticated noise", async () => {
      const before = await q1<{ n: number }>("SELECT count(*)::int AS n FROM ingest_rejects");
      await call("POST", { deviceId: "nope-99", distanceCm: 100 }, { key: OLD_KEY });
      const afterBadKey = await q1<{ n: number }>("SELECT count(*)::int AS n FROM ingest_rejects");
      expect(afterBadKey?.n).toBe(before?.n);

      await call("POST", { deviceId: "nope-99", distanceCm: 100 });
      const afterBadPayload = await q1<{ n: number }>("SELECT count(*)::int AS n FROM ingest_rejects");
      expect(afterBadPayload?.n).toBe((before?.n ?? 0) + 1);
    });
  });

  describe("system behaviour after a reading arrives", () => {
    it("flips a simulated node to live on its first real reading", async () => {
      const before = await q1<{ simulated: boolean }>("SELECT simulated FROM devices WHERE device_id = 'push-sim'");
      expect(before?.simulated).toBe(true);

      const res = await call("POST", { deviceId: "push-sim", distanceCm: 120, t: Date.now() - 60_000 });
      expect(res.status).toBe(201);

      const after = await q1<{ simulated: boolean }>("SELECT simulated FROM devices WHERE device_id = 'push-sim'");
      expect(after?.simulated).toBe(false);
      expect((await readingsFor("push-sim"))[0]?.source).toBe("api");
    });

    it("does not flip a simulated node when the reading was only a duplicate", async () => {
      await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('push-sim2', TRUE, $1)", [Date.now()]);
      await createTank({ label: "Tank Sim 2", deviceId: "push-sim2", shape: "cylinder", heightCm: 300, radiusCm: 100, deadZoneCm: 25, status: "active" });
      const t = Date.now() - 50_000;
      await q("INSERT INTO readings (device_id, t, distance_cm, source) VALUES ('push-sim2', $1, 100, 'simulated')", [t]);

      const res = await call("POST", { deviceId: "push-sim2", distanceCm: 200, t });
      expect(res.status).toBe(200);
      const dev = await q1<{ simulated: boolean }>("SELECT simulated FROM devices WHERE device_id = 'push-sim2'");
      expect(dev?.simulated).toBe(true);
    });

    it("runs the alert engine, so a faulty reading raises an alert immediately", async () => {
      // 400 cm on a 300 cm tank cannot be water: SENSOR_FAULT
      const res = await call("POST", { deviceId: "push-02", distanceCm: 400 });
      expect(res.status).toBe(201);

      const alert = await q1<{ type: string; state: string; simulated: boolean }>(
        "SELECT type, state, simulated FROM alerts WHERE tank_id = $1 AND type = 'SENSOR_FAULT'",
        [tank2]
      );
      expect(alert).toMatchObject({ type: "SENSOR_FAULT", state: "active", simulated: false });
    });
  });

  describe("helpers", () => {
    it("extractItems understands the three accepted shapes", () => {
      expect(extractItems({ a: 1 })).toEqual([{ a: 1 }]);
      expect(extractItems([{ a: 1 }, { a: 2 }])).toHaveLength(2);
      expect(extractItems({ readings: [{ a: 1 }] })).toEqual([{ a: 1 }]);
      expect(extractItems("x")).toBeNull();
      expect(extractItems(null)).toBeNull();
    });

    it("resolveTimestamp normalises ms, seconds and ISO strings", () => {
      const ref = 1_800_000_000_000;
      expect(resolveTimestamp(undefined, ref)).toBe(ref);
      expect(resolveTimestamp(ref, ref)).toBe(ref);
      expect(resolveTimestamp(ref / 1000, ref)).toBe(ref);
      expect(resolveTimestamp(String(ref), ref)).toBe(ref);
      expect(resolveTimestamp("2026-11-21T10:30:00Z", ref)).toBe(Date.parse("2026-11-21T10:30:00Z"));
      expect(resolveTimestamp("garbage", ref)).toBeNull();
      expect(resolveTimestamp(-1, ref)).toBeNull();
    });
  });
});
