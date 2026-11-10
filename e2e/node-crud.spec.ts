import { test, expect, Page } from "@playwright/test";

test.describe("OHTMS Operations - Node CRUD Workflow (Prompt 3)", () => {
  test.setTimeout(60000);

  async function loginAndDismissM1(page: Page) {
    const password = process.env.ADMIN_PASSWORD || "ChangeMe!2026";
    await page.goto("/login?next=/admin/nodes");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@mams.local");
    await page.fill("#login-password", password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/admin\/nodes/, { timeout: 25000 });

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

    await expect(page.locator("header.glass-header")).toBeVisible({ timeout: 20000 });
  }

  test("renders node table, tabs, and opens Add Node wizard", async ({ page }) => {
    await loginAndDismissM1(page);

    // Verify admin tabs exist
    const tabs = page.locator("nav[aria-label='Secondary tabs'] a");
    await expect(tabs).toHaveCount(4);

    // Verify Add Node button opens M2 dialog
    const addBtn = page.getByRole("button", { name: "Add node" });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Check M2 dialog presence
    const dialog = page.locator('[role="dialog"]').filter({ hasText: "Add Rooftop Node (Modal M2)" });
    await expect(dialog).toBeVisible();

    // Step 1: fill label
    await dialog.locator("#wizard-label").fill("Tank 6 E2E");
    await dialog.getByRole("button", { name: /Next:/i }).click();

    // Step 2: Dimensions
    await expect(dialog.locator("#wizard-height")).toBeVisible();
    await dialog.getByRole("button", { name: /Next:/i }).click();

    // Step 3: Thresholds
    await expect(dialog.locator("#wizard-warn")).toBeVisible();
    await dialog.getByRole("button", { name: /Next:/i }).click();

    // Step 4: Recipients
    await expect(dialog.locator("text=In-App Webhooks & Browser Banner")).toBeVisible();
    await dialog.getByRole("button", { name: /Next:/i }).click();

    // Step 5: Review
    await expect(dialog.locator("text=Review and Activate")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Save as draft" })).toBeVisible();

    // Close dialog
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });

  test("viewer cannot access node administration", async ({ page }) => {
    await loginAndDismissM1(page);

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ uid: 3, name: "Nurse Priya", role: "viewer" }),
      });
    });

    await page.goto("/admin/nodes");
    await page.waitForLoadState("domcontentloaded");

    // Should show lock state
    await expect(page.locator("text=Admin Privilege Required")).toBeVisible();
  });
});
