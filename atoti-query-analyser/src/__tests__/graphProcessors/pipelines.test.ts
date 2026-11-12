import { describe, it, expect, beforeAll } from "vitest";
import { ALL_FIXTURES, loadQueryPlans } from "../parsing/fixtures";
import { QueryPlan } from "library/dataStructures/processing/queryPlan";
import {
  AggregateRetrieval,
  AggregateRetrievalKind,
  CondensedRetrievalKind,
  PartitionCondensedRetrievalKind,
  RetrievalGraph,
  VirtualRetrievalKind,
} from "library/dataStructures/json/retrieval";
import { VertexSelection } from "library/dataStructures/processing/selection";
import {
  buildDefaultSelection,
  filterByMeasures,
} from "library/graphProcessors/selection";
import {
  computeEdgeCriticalScore,
  criticalPath,
  selectCriticalSubgraph,
} from "library/graphProcessors/criticalPath";
import { condenseFastRetrievals } from "library/graphProcessors/condenseFastRetrievals";
import { condenseByPartitions } from "library/graphProcessors/condenseByPartitions";
import { removeMergerNodes } from "library/graphProcessors/removeMergerNodes";
import { nodeDepths } from "library/graphProcessors/fillTimingInfo";
import { addClustersToNodes } from "library/graphProcessors/cluster";
import {
  dumpMetadata,
  extractMetadata,
} from "library/graphProcessors/extractMetadata";
import { buildD3 } from "library/graphView/jsonToD3Data";
import { untangle } from "library/dataStructures/d3/d3Graph";
import {
  buildPartitioningColorMap,
  createPartitioningColorFn,
} from "library/graphView/partitionColors";
import { compareNodes } from "library/comparison/nodeComparison";

const MERGER_TYPES = ["PrimitiveResultsMerger", "PostProcessedResultsMerger"];

function realVertices(graph: RetrievalGraph) {
  return Array.from(graph.getVertices()).filter(
    (vertex) => vertex.getMetadata().$kind !== VirtualRetrievalKind,
  );
}

function edgeCount(graph: RetrievalGraph) {
  return Array.from(graph.getVertices()).reduce(
    (count, vertex) => count + graph.getOutgoingEdges(vertex).size,
    0,
  );
}

describe.each(ALL_FIXTURES)("Graph processing of %s", (filename) => {
  let plans: QueryPlan[];
  let selections: VertexSelection[];

  beforeAll(async () => {
    plans = await loadQueryPlans(filename);
    selections = buildDefaultSelection(plans.map((plan) => plan.graph));
  });

  it("extracts the passes metadata", () => {
    const metadata = extractMetadata(plans);
    expect(metadata).toHaveLength(plans.length);
    metadata.forEach((entry, index) => {
      expect(entry.id).toBe(index);
      expect(Number.isNaN(entry.pass)).toBe(false);
      if (entry.parentId !== null) {
        expect(entry.parentId).toBeGreaterThanOrEqual(0);
        expect(entry.parentId).toBeLessThan(plans.length);
      }
    });
    expect(dumpMetadata(metadata)).toMatch(/^digraph/);
  });

  it("selects the virtual vertices and the retrievals with timings", () => {
    plans.forEach((plan, index) => {
      const selection = selections[index];
      expect(
        selection.has(plan.graph.getVertexByLabel("virtualSource").getUUID()),
      ).toBe(true);
      expect(
        selection.has(plan.graph.getVertexByLabel("virtualTarget").getUUID()),
      ).toBe(true);
      expect(selection.size).toBeLessThanOrEqual(plan.graph.getVertexCount());
    });
  });

  it("finds a critical path made of edges of the graph", () => {
    plans.forEach((plan, index) => {
      const links = criticalPath(plan.graph, selections[index]);
      for (const link of links) {
        const [target, source] = link.split("#");
        expect(plan.graph.hasVertex(target as never)).toBe(true);
        expect(plan.graph.hasVertex(source as never)).toBe(true);
      }
    });
  });

  it("scores edges and selects the critical subgraph", () => {
    plans.forEach(({ graph }) => {
      computeEdgeCriticalScore(graph);
      for (const vertex of graph.getVertices()) {
        for (const edge of graph.getOutgoingEdges(vertex)) {
          const score = edge.getMetadata().criticalScore;
          expect(score).toBeGreaterThan(0);
          expect(score).toBeLessThanOrEqual(1);
        }
      }
      const all = selectCriticalSubgraph(graph, 0);
      const critical = selectCriticalSubgraph(graph, 1);
      expect(all.size).toBe(realVertices(graph).length);
      expect(critical.size).toBeLessThanOrEqual(all.size);
      critical.forEach((uuid) => expect(all.has(uuid)).toBe(true));
    });
  });

  it("filters the graph by measure", () => {
    plans.forEach((plan, index) => {
      const measures = Array.from(plan.querySummary.measures).slice(0, 1);
      const filtered = filterByMeasures({
        graph: plan.graph,
        measures,
        selection: selections[index],
      });
      filtered.forEach((uuid) => expect(plan.graph.hasVertex(uuid)).toBe(true));
      const none = filterByMeasures({
        graph: plan.graph,
        measures: [],
        selection: selections[index],
      });
      // Only the virtual source and target remain.
      expect(none.size).toBe(2);
    });
  });

  it("condenses fast retrievals without losing slow ones", () => {
    plans.forEach(({ graph }) => {
      const condensed = condenseFastRetrievals(graph, 1);
      expect(condensed.getVertexCount()).toBeLessThanOrEqual(
        graph.getVertexCount(),
      );
      // Kept retrievals are copies of the original ones.
      const originalIds = new Set(
        realVertices(graph).map((vertex) => vertex.getMetadata().retrievalId),
      );
      realVertices(condensed)
        .map((vertex) => vertex.getMetadata())
        .filter((metadata) => metadata.$kind !== CondensedRetrievalKind)
        .forEach((metadata) =>
          expect(originalIds.has(metadata.retrievalId)).toBe(true),
        );
      for (const vertex of condensed.getVertices()) {
        const metadata = vertex.getMetadata();
        if (metadata.$kind === CondensedRetrievalKind) {
          expect(
            (metadata as unknown as { underlyingRetrievals: unknown[] })
              .underlyingRetrievals.length,
          ).toBeGreaterThan(0);
        }
      }
      expect(condensed.getVertexByLabel("virtualSource")).toBe(
        graph.getVertexByLabel("virtualSource"),
      );
      // The condensed graph goes through the same steps as in the Graph view.
      computeEdgeCriticalScore(condensed);
      const [selection] = buildDefaultSelection([condensed]);
      expect(
        buildD3(condensed, selection, new Set(), false).nodes,
      ).toHaveLength(selection.size - 2);
    });
  });

  it("builds the d3 data of the Graph view", () => {
    plans.forEach((plan, index) => {
      const selection = selections[index];
      const depths = nodeDepths(plan.graph, selection);
      depths.forEach((depth, vertex) => {
        if (vertex.getMetadata().$kind !== VirtualRetrievalKind) {
          expect(depth).toBeGreaterThanOrEqual(0);
        }
      });

      const clusters = addClustersToNodes(plan.graph, selection);
      expect(clusters.size).toBeGreaterThan(0);

      for (const invertLayout of [false, true]) {
        const { nodes, links } = buildD3(
          plan.graph,
          selection,
          new Set(),
          invertLayout,
        );
        // The virtual source and target are not displayed.
        expect(nodes).toHaveLength(selection.size - 2);
        const ids = new Set(nodes.map((node) => node.id));
        links.forEach((link) => {
          expect(ids.has(link.source.id)).toBe(true);
          expect(ids.has(link.target.id)).toBe(true);
        });
        untangle({ nodes, links });
        nodes.forEach((node) => expect(Number.isFinite(node.x)).toBe(true));
      }
    });
  });

  it("condenses partitions and removes mergers as in the Partitions view", () => {
    plans.forEach(({ graph }) => {
      const { graph: condensedGraph, retainedUUIDs } =
        condenseByPartitions(graph);
      retainedUUIDs.forEach((uuid) => expect(graph.hasVertex(uuid)).toBe(true));

      const { graph: withoutMergers } = removeMergerNodes(condensedGraph);
      for (const vertex of withoutMergers.getVertices()) {
        expect(MERGER_TYPES).not.toContain(vertex.getMetadata().type);
        const { $kind } = vertex.getMetadata();
        expect([
          VirtualRetrievalKind,
          AggregateRetrievalKind,
          PartitionCondensedRetrievalKind,
          "ExternalRetrieval",
        ]).toContain($kind);
      }
      expect(edgeCount(withoutMergers)).toBeGreaterThan(0);

      const colorMap = buildPartitioningColorMap(withoutMergers);
      const colorOf = createPartitioningColorFn(colorMap);
      const [selection] = buildDefaultSelection([withoutMergers]);
      const { nodes } = buildD3(withoutMergers, selection, new Set(), false);
      nodes.forEach((node) => expect(colorOf(node)).toMatch(/^#/));
    });
  });

  it("compares two retrievals", () => {
    const retrievals = realVertices(plans[0].graph).map((vertex) =>
      vertex.getMetadata(),
    );
    const [left, right] = retrievals;
    const same = compareNodes(left, left);
    expect(same.type.status).toBe("same");
    same.measures.forEach((item) => expect(item.status).toBe("same"));
    same.location.forEach((item) => expect(item.status).toBe("same"));

    const diff = compareNodes(left, right ?? left);
    expect(["same", "different"]).toContain(diff.type.status);
  });
});

describe("Graph processing of a partitioned plan", () => {
  it("retains the nodes around the mergers", async () => {
    const [plan] = await loadQueryPlans("larger-distributed-query.json");
    const { graph, retainedUUIDs } = condenseByPartitions(plan.graph);
    expect(retainedUUIDs.size).toBeGreaterThan(0);
    const partitionings = new Set(
      realVertices(graph)
        .map((vertex) => vertex.getMetadata())
        .filter((metadata) => metadata.$kind === AggregateRetrievalKind)
        .map((metadata) => (metadata as AggregateRetrieval).partitioning),
    );
    expect(buildPartitioningColorMap(graph).size).toBeGreaterThanOrEqual(
      partitionings.size,
    );
  });
});
