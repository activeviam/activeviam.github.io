import { describe, it, expect } from "vitest";
import { V1_FIXTURES, loadFixture } from "./fixtures";
import { parseMultiV1, convertToV2 } from "library/inputProcessors/v1tov2";
import {
  preprocessQueryPlan,
  QueryPlan,
} from "library/dataStructures/processing/queryPlan";

describe("V1 text file parsing", () => {
  const noopCallback = () => {};

  V1_FIXTURES.forEach((filename) => {
    describe(filename, () => {
      it("should parse and convert to QueryPlan without errors", async () => {
        const content = loadFixture(filename);

        // Step 1: Parse V1 text format
        const v1Structures = await parseMultiV1(content, noopCallback);
        expect(v1Structures).toBeDefined();
        expect(Array.isArray(v1Structures)).toBe(true);
        expect(v1Structures.length).toBeGreaterThan(0);

        // Step 2: Convert each V1 structure to V2 JSON format
        const v2Results = v1Structures.map((v1Structure) =>
          convertToV2(v1Structure),
        );

        // Check that conversions succeeded
        v2Results.forEach((result, index) => {
          expect(result).toBeDefined();
          expect(result.result).toBeDefined();
          // Log recoverable errors for debugging but don't fail the test
          if (result.errors.length > 0) {
            console.warn(
              `Recoverable errors in ${filename} pass ${index}:`,
              result.errors.map((e) => e.message),
            );
          }
        });

        // Step 3: Preprocess into QueryPlan objects
        const rawJsonArray = v2Results.map((r) => r.result);
        const queryPlans: QueryPlan[] = preprocessQueryPlan(rawJsonArray);

        // Validate result
        expect(queryPlans).toBeDefined();
        expect(Array.isArray(queryPlans)).toBe(true);
        expect(queryPlans.length).toBeGreaterThan(0);

        // Validate each QueryPlan has required fields
        queryPlans.forEach((plan, index) => {
          expect(
            plan.planInfo,
            `planInfo missing in plan ${index}`,
          ).toBeDefined();
          expect(plan.graph, `graph missing in plan ${index}`).toBeDefined();
          expect(
            plan.queryFilters,
            `queryFilters missing in plan ${index}`,
          ).toBeDefined();
          expect(
            plan.querySummary,
            `querySummary missing in plan ${index}`,
          ).toBeDefined();

          // Validate graph has at least one vertex
          const vertices = Array.from(plan.graph.getVertices());
          expect(
            vertices.length,
            `graph has no vertices in plan ${index}`,
          ).toBeGreaterThan(0);
        });
      });
    });
  });
});
