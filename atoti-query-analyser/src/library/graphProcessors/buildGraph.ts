import {
  AggregateRetrieval,
  ARetrieval,
  ExternalRetrieval,
  RetrievalGraph,
  RetrievalVertex,
  VirtualRetrieval,
  VirtualRetrievalKind,
} from "../dataStructures/json/retrieval";
import { computeEdgeCriticalScore } from "./criticalPath";

/**
 * Takes array of retrievals, verifies index consistency (no gaps, no repeats),
 * creates vertices for each retrieval and returns array of vertex UUIDs.
 * */
function processArrayOfRetrievals(
  graph: RetrievalGraph,
  retrievals: ARetrieval[]
) {
  return retrievals
    .sort((lhs, rhs) => lhs.retrievalId - rhs.retrievalId)
    .map((retrieval, index) => {
      const { retrievalId, $kind } = retrieval;

      if (retrievalId !== index) {
        throw new Error(`Missing retrieval ${$kind}#${retrievalId - 1}`);
      }

      const vertex = new RetrievalVertex(retrieval);
      graph.addVertex(vertex);
      return vertex.getUUID();
    });
}

/**
 * Creates a virtual retrieval.
 */
export function makeVirtualRetrieval({
  retrievalId,
  type,
}: {
  retrievalId: number;
  type: string;
}): VirtualRetrieval {
  return {
    $kind: VirtualRetrievalKind,
    type,
    retrievalId,
    timingInfo: {},
  };
}

/**
 * Takes raw retrieval info from JSON and builds a graph of retrievals.
 */
export function buildGraph(
  aggregateRetrievals: AggregateRetrieval[],
  externalRetrievals: ExternalRetrieval[],
  aggregateDependencies: Map<number, Set<number>>,
  externalDependencies: Map<number, Set<number>>
): RetrievalGraph {
  const graph = new RetrievalGraph();

  const virtualSource = new RetrievalVertex(
    makeVirtualRetrieval({ type: "VirtualSource", retrievalId: -1 })
  );
  graph.addVertex(virtualSource);
  graph.labelVertex(virtualSource.getUUID(), "virtualSource");
  const virtualTarget = new RetrievalVertex(
    makeVirtualRetrieval({ type: "VirtualTarget", retrievalId: -2 })
  );
  graph.addVertex(virtualTarget);
  graph.labelVertex(virtualTarget.getUUID(), "virtualTarget");

  const aggregateRetrievalVertices = processArrayOfRetrievals(
    graph,
    aggregateRetrievals
  );
  const externalRetrievalVertices = processArrayOfRetrievals(
    graph,
    externalRetrievals
  );

  [
    {
      dependencies: aggregateDependencies,
      depVertices: aggregateRetrievalVertices,
    },
    {
      dependencies: externalDependencies,
      depVertices: externalRetrievalVertices,
    },
  ].forEach(({ dependencies, depVertices }) => {
    dependencies.forEach((deps, key) => {
      deps.forEach((dep) => {
        graph.createEdge(
          key < 0 ? virtualSource.getUUID() : aggregateRetrievalVertices[key],
          depVertices[dep],
          { criticalScore: 1 }
        );
      });
    });
  });

  graph.getVertices().forEach((vertex) => {
    if (vertex === virtualTarget) {
      return;
    }

    const edges = graph.getOutgoingEdges(vertex);
    if (edges.size > 0) {
      return;
    }

    graph.createEdge(vertex.getUUID(), virtualTarget.getUUID(), {
      criticalScore: 1,
    });
  });

  computeEdgeCriticalScore(graph);

  return graph;
}
