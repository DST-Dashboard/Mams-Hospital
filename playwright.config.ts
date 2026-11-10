import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
});
