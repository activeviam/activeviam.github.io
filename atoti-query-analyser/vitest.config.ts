import { coverageConfigDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 30000,
    reporters: ["default", ["junit", { outputFile: "test-results/results.xml" }]],
    coverage: {
      provider: "v8",
      // Every source file counts, including the ones no test loads.
      include: ["src/**/*.{ts,tsx}"],
      exclude: [...coverageConfigDefaults.exclude, "src/__tests__/**"],
      reportsDirectory: "coverage",
      // The json-summary report feeds scripts/printCoverageSummary.mjs.
      reporter: ["html", "lcov", "json-summary"],
      // Current coverage, rounded down: raise these values when adding tests.
      thresholds: {
        branches: 34,
        functions: 36,
        lines: 44,
        statements: 43,
        // The React-free logic, which the unit tests target, has its own higher thresholds.
        "src/library/**": {
          branches: 76,
          functions: 77,
          lines: 81,
          statements: 81,
        },
      },
    },
  },
  resolve: {
    alias: {
      library: path.resolve(__dirname, "./src/library"),
    },
  },
});
