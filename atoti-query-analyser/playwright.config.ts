import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const port = 5173;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 120_000,
  reporter: [
    ["list"],
    ["junit", { outputFile: "test-results/e2e/results.xml" }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  outputDir: "test-results/e2e/artifacts",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: isCI ? "on-first-retry" : "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `yarn vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
