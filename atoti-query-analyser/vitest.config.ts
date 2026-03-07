import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 30000,
    reporters: ["default", ["junit", { outputFile: "test-results/results.xml" }]],
  },
  resolve: {
    alias: {
      library: path.resolve(__dirname, "./src/library"),
    },
  },
});
