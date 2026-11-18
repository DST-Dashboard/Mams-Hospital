import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const VIEWPORTS = [
  { name: "mobile", width: 360, height: 740 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
];

const PUBLIC_PAGES = [
  { name: "login", path: "/login" },
  { name: "forgot-password", path: "/forgot-password" },
  { name: "reset-password", path: "/reset-password?token=sample" },
  { name: "kiosk", path: "/kiosk" },
];

const AUTH_PAGES = [
  { name: "dashboard", path: "/dashboard" },
  { name: "tank-detail", path: "/tanks/1" },
  { name: "alerts", path: "/alerts" },
  { name: "analytics", path: "/analytics" },
  { name: "about", path: "/about" },
  { name: "admin-nodes", path: "/admin/nodes" },
  { name: "admin-users", path: "/admin/users" },
  { name: "admin-audit", path: "/admin/audit" },
  { name: "admin-system", path: "/admin/system" },
  { name: "settings", path: "/settings" },
];

async function main() {
  const outDir = path.resolve("tests/screenshots/baseline");
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Capturing viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      baseURL: "http://localhost:3000",
    });
    const page = await context.newPage();

    for (const p of PUBLIC_PAGES) {
      console.log(`Capturing public: ${p.name} @ ${vp.width}px`);
      await page.goto(p.path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, `${p.name}-${vp.width}.png`), fullPage: true });
    }

    // Login
    console.log(`Logging in @ ${vp.width}px`);
    await page.goto("/login?next=/dashboard", { waitUntil: "domcontentloaded" });
    await page.fill("#login-email", "admin@mams.local");
    await page.fill("#login-password", "ChangeMe!2026");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Dismiss M1 if present
    const m1Modal = page.locator('[role="dialog"]').filter({ hasText: "Confirm Tank Dimensions (M1)" });
    try {
      await m1Modal.waitFor({ state: "visible", timeout: 2500 });
      const saveBtn = m1Modal.getByRole("button", { name: "Save and start monitoring" });
      await saveBtn.click();
      await m1Modal.waitFor({ state: "hidden", timeout: 5000 });
    } catch {
      // Dimensions already confirmed
    }

    for (const p of AUTH_PAGES) {
      console.log(`Capturing auth: ${p.name} @ ${vp.width}px`);
      if (p.path !== "/dashboard" || !page.url().includes("/dashboard")) {
        await page.goto(p.path, { waitUntil: "domcontentloaded" });
      }
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outDir, `${p.name}-${vp.width}.png`), fullPage: true });
    }

    await context.close();
  }

  await browser.close();
  console.log("\nBaseline screenshots capture complete!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

