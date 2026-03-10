import { describe, it, expect } from "vitest";
import { JSON_FIXTURES, loadFixture } from "./fixtures";
import {
  preprocessQueryPlan,
  QueryPlan,
} from "library/dataStructures/processing/queryPlan";

describe("JSON file parsing", () => {
  JSON_FIXTURES.forEach((filename) => {
    describe(filename, () => {
      it("should parse and convert to QueryPlan without errors", () => {
        const content = loadFixture(filename);

        // Step 1: Parse JSON
        const parsed = JSON.parse(content);
        expect(parsed).toBeDefined();

        // Step 2: Unwrap {data: [...]} wrapper if present, else use direct array
        let rawJsonArray: unknown[];
        if (
          parsed &&
          typeof parsed === "object" &&
          "data" in parsed &&
          Array.isArray(parsed.data)
        ) {
          rawJsonArray = parsed.data;
        } else if (Array.isArray(parsed)) {
          rawJsonArray = parsed;
        } else {
          throw new Error(
            `Unexpected JSON structure in ${filename}: expected array or {data: [...]}`,
          );
        }

        // Step 3: Preprocess into QueryPlan objects
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
