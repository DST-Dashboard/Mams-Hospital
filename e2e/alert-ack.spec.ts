import { test, expect, Page } from "@playwright/test";

test.describe("OHTMS Operations - Alert Ack Workflow (Prompt 3)", () => {
  test.setTimeout(60000);

  async function loginAndDismissM1(page: Page) {
    const password = process.env.ADMIN_PASSWORD || "ChangeMe!2026";
    await page.goto("/login?next=/alerts");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@mams.local");
    await page.fill("#login-password", password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/alerts/, { timeout: 25000 });

    // Dismiss M1 if present
    const m1Modal = page.locator('[role="dialog"]').filter({ hasText: "Confirm Tank Dimensions (M1)" });
    try {
      await m1Modal.waitFor({ state: "visible", timeout: 3000 });
      const saveBtn = m1Modal.getByRole("button", { name: "Save and start monitoring" });
      await saveBtn.click();
      await m1Modal.waitFor({ state: "hidden", timeout: 10000 });
    } catch {
      // Dimensions already confirmed
    }

    await expect(page.locator("header.glass-header")).toBeVisible({ timeout: 35000 });
  }

  test("loads alerts table and navigates to alert detail", async ({ page }) => {
    await loginAndDismissM1(page);

    // Verify page header
    const pageTitle = page.locator("h1").filter({ hasText: "Alerts & Incident Log" });
    await expect(pageTitle).toBeVisible();

    // Verify filter bar
    await expect(page.locator("form[role='search']")).toBeVisible();

    // Check if any alerts exist
    const rows = page.locator("table tbody tr");
    const count = await rows.count();

    if (count > 0) {
      // Click first row to navigate to alert detail
      const firstRow = rows.first();
      await firstRow.click();
      await expect(page).toHaveURL(/\/alerts\/\d+/);

      // Verify detail cards
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("text=Evidence & Telemetry")).toBeVisible();
      await expect(page.locator("text=Lifecycle Progression")).toBeVisible();
    }
  });

  test("viewer role cannot see acknowledge button", async ({ page }) => {
    // Intercept /api/auth/me to simulate Viewer role
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ uid: 3, name: "Nurse Priya", role: "viewer" }),
      });
    });

    await page.goto("/alerts");
    await page.waitForLoadState("domcontentloaded");

    // Viewer should not see any Acknowledge buttons
    const ackButtons = page.getByRole("button", { name: "Acknowledge" });
    const count = await ackButtons.count();
    expect(count).toBe(0);
  });
});
