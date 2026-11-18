import { test, expect } from "@playwright/test";

test.describe("OHTMS Login & Shell Foundation", () => {
  test("defaults to light theme without flash", async ({ page }) => {
    await page.goto("/login");
    const theme = await page.getAttribute("html", "data-theme");
    expect(theme).toBe("light");
  });

  test("rejects incorrect credentials honestly", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#login-email", "admin@mams.local");
    await page.fill("#login-password", "WrongPassword123");
    await page.click('button[type="submit"]');

    const errorBanner = page.locator(".banner--error");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText("Email or password is incorrect.");
  });

  test("successful login redirects to dashboard and handles M1 modal", async ({ page }) => {
    const password = process.env.ADMIN_PASSWORD || "ChangeMe!2026";

    await page.goto("/login?next=/dashboard");
    await page.fill("#login-email", "admin@mams.local");
    await page.fill("#login-password", password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("header.glass-header")).toBeVisible();
    await expect(page.locator("nav.mega-nav")).toBeVisible();

    // M1 modal check: if unconfirmed tanks exist, DimensionsModal opens
    const m1Modal = page.locator('[role="dialog"]').filter({ hasText: "Confirm Tank Dimensions (M1)" });
    try {
      await m1Modal.waitFor({ state: "visible", timeout: 3000 });
      const saveBtn = m1Modal.getByRole("button", { name: "Save and start monitoring" });
      await saveBtn.click();
      await m1Modal.waitFor({ state: "hidden", timeout: 10000 });
    } catch {
      // Already confirmed
    }
  });

  test("session expired event displays M6 modal", async ({ page }) => {
    const password = process.env.ADMIN_PASSWORD || "ChangeMe!2026";
    await page.goto("/login");
    await page.fill("#login-email", "admin@mams.local");
    await page.fill("#login-password", password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    // Dismiss M1 if present
    const m1Modal = page.locator('[role="dialog"]').filter({ hasText: "Confirm Tank Dimensions (M1)" });
    try {
      await m1Modal.waitFor({ state: "visible", timeout: 3000 });
      const saveBtn = m1Modal.getByRole("button", { name: "Save and start monitoring" });
      await saveBtn.click();
      await m1Modal.waitFor({ state: "hidden", timeout: 10000 });
    } catch {
      // Already confirmed
    }

    // Wait for client shell hydration
    await expect(page.locator(".sticky-chrome-group")).toBeVisible();
    await page.waitForTimeout(500);

    // Trigger session expired
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("ohtms:session-expired"));
    });

    const m6Modal = page.locator('[role="dialog"]').filter({ hasText: "Session Expired (M6)" });
    await expect(m6Modal).toBeVisible({ timeout: 5000 });
  });

  test("text-size controls adjust root font size", async ({ page }) => {
    const password = process.env.ADMIN_PASSWORD || "ChangeMe!2026";
    await page.goto("/login");
    await page.fill("#login-email", "admin@mams.local");
    await page.fill("#login-password", password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    // Dismiss M1 if present
    const m1Modal = page.locator('[role="dialog"]').filter({ hasText: "Confirm Tank Dimensions (M1)" });
    try {
      await m1Modal.waitFor({ state: "visible", timeout: 3000 });
      const saveBtn = m1Modal.getByRole("button", { name: "Save and start monitoring" });
      await saveBtn.click();
      await m1Modal.waitFor({ state: "hidden", timeout: 10000 });
    } catch {
      // Already confirmed
    }

    await page.click('button[aria-label="Set large text size (18px)"]');
    const size = await page.getAttribute("html", "data-text-size");
    expect(size).toBe("18");
  });

  test("skip link targets workspace landmark", async ({ page }) => {
    const password = process.env.ADMIN_PASSWORD || "ChangeMe!2026";
    await page.goto("/login");
    await page.fill("#login-email", "admin@mams.local");
    await page.fill("#login-password", password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeVisible();
    expect(await skipLink.getAttribute("href")).toBe("#workspace");
  });
});
