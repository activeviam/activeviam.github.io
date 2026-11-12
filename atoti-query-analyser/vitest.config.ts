import { coverageConfigDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 30000,
    reporters: [
      "default",
      ["junit", { outputFile: "test-results/results.xml" }],
    ],
    coverage: {
      provider: "v8",
      // Every source file counts, including the ones no test loads.
      include: ["src/**/*.{ts,tsx}"],
      exclude: [...coverageConfigDefaults.exclude, "src/__tests__/**"],
      reportsDirectory: "coverage",
      reporter: ["text-summary", "html", "lcov"],
      // Current coverage, rounded down: raise these values when adding tests.
      thresholds: {
        branches: 34,
        functions: 36,
        lines: 44,
        statements: 43,
      },
    },
  },
  resolve: {
    alias: {
      library: path.resolve(__dirname, "./src/library"),
    },
  },
});
