import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q, q1 } from "@/server/db";
import { createTank } from "@/server/repos/tanks";
import { open, getAlert } from "@/server/repos/alerts";
import { claimJobSlot, recordJobResult, runTick } from "@/server/jobs/tick";
import { runEscalationTick } from "@/server/services/escalation";

describe("backend scheduled jobs and tick worker", () => {
  let testCtx: TestSchemaContext;
  let deviceId: string;
  let tankId: number;

  beforeAll(async () => {
    testCtx = await createTestSchema();
    deviceId = "job-test-device";
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ($1, FALSE, $2)", [deviceId, Date.now()]);
    tankId = await createTank({
      label: "Job test tank",
      deviceId,
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("claims job slots atomically and enforces intervals", async () => {
    const asOf = 1700000000000;
    // First claim should succeed
    const firstClaim = await claimJobSlot("test_job", 60_000, asOf);
    expect(firstClaim).toBe(true);

    // Second claim within interval should fail
    const secondClaim = await claimJobSlot("test_job", 60_000, asOf + 30_000);
    expect(secondClaim).toBe(false);

    // Third claim after interval has passed should succeed
    const thirdClaim = await claimJobSlot("test_job", 60_000, asOf + 65_000);
    expect(thirdClaim).toBe(true);

    // Recording result updates row
    await recordJobResult("test_job", true);
    const row = await q1<{ ok: boolean; error: string | null }>(
      "SELECT ok, error FROM job_runs WHERE name = 'test_job'"
    );
    expect(row?.ok).toBe(true);
    expect(row?.error).toBeNull();
  });

  it("escalates overdue unacknowledged alerts and records audit trail", async () => {
    const asOf = Date.now();
    const alertId = await open({
      tankId,
      type: "LOW_LEVEL",
      severity: "warning",
      message: "Low level",
      value: 30,
      at: asOf - 31 * 60_000,
      triggerT: null,
      triggerDistanceCm: null,
      simulated: false,
    });

    const escalated = await runEscalationTick(asOf, 15);
    expect(escalated).toBeGreaterThanOrEqual(1);

    const alert = await getAlert(alertId, asOf);
    expect(alert?.state).toBe("escalated");

    const auditRow = await q1<{ action: string }>(
      "SELECT action FROM audit_log WHERE entity_id = $1",
      [String(alertId)]
    );
    expect(auditRow?.action).toBe("alert.escalate");
  });

  it("executes runTick successfully", async () => {
    const executed = await runTick({ full: true });
    expect(executed.alerts).toBe(true);
    expect(executed.escalation).toBe(true);
  });
});
