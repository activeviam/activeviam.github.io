import { describe, it, expect, vi } from "vitest";
import { ALL_FIXTURES, loadQueryPlans } from "./fixtures";
import { preprocessQueryPlan, QueryPlan } from "library/dataStructures/processing/queryPlan";

/**
 * Summarize a query plan into a small, stable structure, so that snapshots
 * detect any change in what the parsing produces.
 */
function summarize(plan: QueryPlan) {
  const vertices = Array.from(plan.graph.getVertices());
  const kinds: Record<string, number> = {};
  const types: Record<string, number> = {};
  let edgeCount = 0;
  for (const vertex of vertices) {
    const { $kind, type } = vertex.getMetadata();
    kinds[$kind] = (kinds[$kind] ?? 0) + 1;
    types[type] = (types[type] ?? 0) + 1;
    edgeCount += plan.graph.getOutgoingEdges(vertex).size;
  }
  return {
    pivotId: plan.planInfo.pivotId,
    mdxPass: plan.planInfo.mdxPass,
    vertexCount: vertices.length,
    edgeCount,
    kinds,
    types,
    filterCount: plan.queryFilters.length,
    measureCount: plan.querySummary.measures.size,
  };
}

describe("Query plan content", () => {
  ALL_FIXTURES.forEach((filename) => {
    it(`produces the expected graphs for ${filename}`, async () => {
      const plans = await loadQueryPlans(filename);
      expect(plans.map(summarize)).toMatchSnapshot();
    });
  });

  it("labels the virtual source and target of every graph", async () => {
    const [plan] = await loadQueryPlans("small-plan-v1.txt");
    expect(plan.graph.getVertexByLabel("virtualSource").getMetadata().$kind).toBe(
      "VirtualRetrieval",
    );
    expect(plan.graph.getVertexByLabel("virtualTarget").getMetadata().$kind).toBe(
      "VirtualRetrieval",
    );
  });

  it("rejects an input which is not an array", () => {
    expect(() => preprocessQueryPlan({})).toThrow("data must be an array");
  });

  it("rejects a plan without its mandatory fields", () => {
    // The validation logs why each format failed before throwing.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => preprocessQueryPlan([{}])).toThrow();
    consoleError.mockRestore();
  });
});
