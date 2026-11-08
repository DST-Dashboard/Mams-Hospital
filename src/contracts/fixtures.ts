/**
 * Realistic sample payloads for every endpoint that is not implemented yet.
 * Served by src/server/mock.ts when ENABLE_MOCKS=1, so the frontend is never blocked on the backend.
 * The backend keeps these as test fixtures after replacing the mock with the real implementation.
 */
import type { AlertDetailDTO, AuditEntryDTO, CompareDTO, HeatmapDTO, NotificationPrefsDTO, SystemStatusDTO, UserDTO } from "./index";

const T = Date.UTC(2026, 9, 30, 5, 43); // dataset end
const H = 3_600_000;

export const alertDetail = (id: number): AlertDetailDTO => ({
  id, tankId: 4, tankLabel: "Tank 4", type: "CRITICAL_LOW", severity: "critical", state: "active",
  message: "Tank 4 at 14% — critically low — refill needed", value: 14, openedAt: T - 2 * H, acknowledgedAt: null, ackNote: null, resolvedAt: null, snoozedUntil: null, simulated: true,
  trigger: { t: T - 2 * H, distanceCm: 258, levelPct: 14 },
  sensorHealth: { lastReadingAgeMin: 1, rssi: -72, snr: 11.5, batteryPct: 96, quality: "ok" },
  acknowledgedBy: null,
  deliveries: [{ channel: "in_app", recipient: "all", status: "sent", sentAt: T - 2 * H, error: null }, { channel: "email", recipient: "facilities@mams.local", status: "sent", sentAt: T - 2 * H + 30_000, error: null }],
  timeline: [{ t: T - 2 * H, event: "opened", by: null }, { t: T - 2 * H + 30_000, event: "notified", by: null }],
});

export const users: UserDTO[] = [
  { id: 1, email: "admin@mams.local", name: "Administrator", role: "admin", disabled: false, createdAt: T - 30 * 24 * H, lastLoginAt: T - H },
  { id: 2, email: "priya@mams.local", name: "Priya (Facility Manager)", role: "operator", disabled: false, createdAt: T - 20 * 24 * H, lastLoginAt: T - 5 * H },
  { id: 3, email: "rajesh@mams.local", name: "Rajesh (Administrator)", role: "viewer", disabled: false, createdAt: T - 10 * 24 * H, lastLoginAt: null },
];

export const audit: AuditEntryDTO[] = [
  { id: 3, t: T - H, user: { id: 2, name: "Priya" }, action: "alert.ack", entity: "alert", entityId: "12", before: null, after: { note: "Pump started" }, ip: "10.0.0.7" },
  { id: 2, t: T - 5 * H, user: { id: 1, name: "Administrator" }, action: "tank.update", entity: "tank", entityId: "4", before: { heightCm: 300 }, after: { heightCm: 285 }, ip: "10.0.0.2" },
  { id: 1, t: T - 6 * H, user: { id: 1, name: "Administrator" }, action: "login", entity: "user", entityId: "1", before: null, after: null, ip: "10.0.0.2" },
];

export const heatmap = (tankId: number): HeatmapDTO => ({
  tankId, tz: "IST", from: T - 7 * 24 * H, to: T,
  cells: Array.from({ length: 7 * 24 }, (_, i) => ({ dow: Math.floor(i / 24), hour: i % 24, avgPct: Math.round(35 + 30 * Math.sin((i % 24) / 24 * Math.PI * 2 - 1) + (i % 7)), minPct: 20, n: 12 })),
});

export const compare: CompareDTO = {
  from: T - 7 * 24 * H, to: T, resolution: "1h",
  tanks: [1, 2, 3, 4, 5].map((id) => ({
    tankId: id, label: `Tank ${id}`, simulated: id !== 1, currentPct: 20 + id * 12, meanPct: 30 + id * 8, trend: id % 2 ? "falling" : "stable",
    consumedL: 8000 + id * 900, pumpedInL: 8200 + id * 850, anomalies: id === 3 ? 6 : 0, healthScore: id === 3 ? 62 : 96,
    series: Array.from({ length: 24 }, (_, k) => ({ t: T - (24 - k) * H, pct: 25 + id * 10 + 15 * Math.sin(k / 4 + id) })),
  })),
};

export const notificationPrefs: NotificationPrefsDTO = {
  channelsBySeverity: { info: ["in_app"], warning: ["in_app", "email"], critical: ["in_app", "email", "sms"], emergency: ["in_app", "email", "sms"] },
  quietHours: { enabled: true, start: "22:00", end: "06:00" }, email: "priya@mams.local", phone: null, whatsapp: null, tankIds: [],
};

export const systemStatus: SystemStatusDTO = {
  version: "0.1.0", clockMode: "anchored", asOf: T, uptimeS: 86_400, ingest: { enabled: false, lastUplinkAt: null },
  db: { sizeMb: 2.4, readings: 10_080, firstReadingAt: T - 7 * 24 * H, lastReadingAt: T },
  devices: [1, 2, 3, 4, 5].map((n) => ({ deviceId: `wio-e5-node-0${n}`, tankId: n, lastReadingAt: T, ageMin: 0, status: "fresh" as const, rssi: -70 - n, batteryPct: 96 })),
  jobs: [{ name: "alerts", lastRunAt: T, ok: true }],
};
