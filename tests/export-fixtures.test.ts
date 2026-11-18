import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { exportFixtures } from "../scripts/export-fixtures";
import { openDb } from "@/server/db";

const tempDir = path.join(os.tmpdir(), `ohtms-fixtures-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const databasePath = path.join(tempDir, "source.db");
const outputPath = path.join(tempDir, "fixtures", "snapshot.json");

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("database fixture exporter", () => {
  it("exports selected domain rows without authentication or contact data", () => {
    const database = openDb(databasePath);
    database.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, ?, ?)")
      .run("fixture-device", 1, 100);
    const tankId = Number(database.prepare(`
      INSERT INTO tanks (device_id, label, height_cm, radius_cm, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("fixture-device", "Fixture tank", 300, 100, 100, 100).lastInsertRowid);
    database.prepare("INSERT INTO readings (device_id, t, distance_cm, rssi) VALUES (?, ?, ?, ?)")
      .run("fixture-device", 200, 42, -70);
    database.prepare(`
      INSERT INTO alerts (tank_id, type, severity, state, message, opened_at, simulated)
      VALUES (?, 'LOW_LEVEL', 'warning', 'active', 'Fixture alert', ?, 1)
    `).run(tankId, 200);
    database.prepare(`
      INSERT INTO users (email, name, password_hash, role, created_at)
      VALUES (?, ?, ?, 'viewer', ?)
    `).run("private@example.test", "Private User", "sensitive-password-hash", 100);
    database.close();

    const snapshot = exportFixtures(databasePath, outputPath);
    const serialized = fs.readFileSync(outputPath, "utf8");

    expect(snapshot.devices).toEqual([{ device_id: "fixture-device", simulated: 1 }]);
    expect(snapshot.tanks).toMatchObject([{ id: tankId, label: "Fixture tank" }]);
    expect(snapshot.readings).toMatchObject([{ device_id: "fixture-device", t: 200, distance_cm: 42, rssi: -70 }]);
    expect(snapshot.alerts).toMatchObject([{ tank_id: tankId, type: "LOW_LEVEL", severity: "warning" }]);
    expect(serialized).not.toContain("private@example.test");
    expect(serialized).not.toContain("sensitive-password-hash");
  });
});
