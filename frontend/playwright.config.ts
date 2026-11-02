import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  use: {
    channel: process.env.AEROTWIN_BROWSER_CHANNEL,
    baseURL: process.env.AEROTWIN_URL ?? "http://127.0.0.1:5173",
    viewport: { width: 1512, height: 1100 },
    screenshot: "only-on-failure",
  },
  reporter: "list",
  workers: 1,
});
