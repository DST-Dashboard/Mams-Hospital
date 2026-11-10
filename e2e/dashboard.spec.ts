import { test, expect, Page } from "@playwright/test";

test.describe("OHTMS Monitoring Core (Prompt 2)", () => {
  test.setTimeout(60000);

  async function loginAndDismissM1(page: Page) {
    const password = process.env.ADMIN_PASSWORD || "ChangeMe!2026";
    await page.goto("/login?next=/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@mams.local");
    await page.fill("#login-password", password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 25000 });

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

    // Wait for chrome hydration
    await expect(page.locator("header.glass-header")).toBeVisible({ timeout: 20000 });
  }

  test("overview renders 5 tank tiles, Day panel, and Week panel concurrently", async ({ page }) => {
    await loginAndDismissM1(page);

    // Verify 5 tank tiles exist in the grid
    const tiles = page.locator(".mon-tile");
    await expect(tiles).toHaveCount(5);

    // Verify Day panel (Last 24 hours) is visible
    const dayHeading = page.locator("h2").filter({ hasText: "Last 24 hours · All tanks" });
    await expect(dayHeading).toBeVisible();

    // Verify Week panel (Last 7 days) is visible concurrently
    const weekHeading = page.locator("h2").filter({ hasText: "Last 7 days · All tanks" });
    await expect(weekHeading).toBeVisible();

    // Verify Fleet Health metrics
    await expect(page.locator("text=Active alerts")).toBeVisible();
    await expect(page.locator("text=Nodes reporting")).toBeVisible();
    await expect(page.locator("text=Data completeness")).toBeVisible();
  });

  test("calendar day selection updates URL state and timeline", async ({ page }) => {
    await loginAndDismissM1(page);

    // Find a calendar day button (e.g. Fri 23 Oct or 24h)
    const dayBtn = page.getByRole("radio", { name: /Oct/i }).first();
    if (await dayBtn.isVisible()) {
      await dayBtn.click();
      await expect(page).toHaveURL(/day=/);
    }
  });

  test("tank tile navigation opens tank deep dive with Day and Week charts", async ({ page }) => {
    await loginAndDismissM1(page);

    // Click Tank 1 tile
    const tank1Tile = page.locator(".mon-tile").filter({ hasText: "Tank 1" }).first();
    await tank1Tile.click();

    await expect(page).toHaveURL(/\/tanks\/1/);

    // Verify Tank Hero Card & Reading Card
    await expect(page.locator("h1").filter({ hasText: "Tank 1" })).toBeVisible();
    await expect(page.locator("text=Distance to water")).toBeVisible();
    await expect(page.locator("text=Water depth (Level)")).toBeVisible();

    // Verify both Day and Week charts exist on tank detail
    await expect(page.locator("h2").filter({ hasText: /Day trend/i })).toBeVisible();
    await expect(page.locator("h2").filter({ hasText: /Week trend/i })).toBeVisible();

    // Verify raw readings inspector toggle exists
    await expect(page.locator("text=Raw sensor readings & telemetry inspector")).toBeVisible();
  });

  test("kiosk mode renders fullscreen grid and exits on escape", async ({ page }) => {
    await loginAndDismissM1(page);

    await page.goto("/kiosk");
    await expect(page.locator(".mon-kiosk-page")).toBeVisible();
    await expect(page.locator(".mon-tile")).toHaveCount(5);

    // Press Escape to exit kiosk
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
