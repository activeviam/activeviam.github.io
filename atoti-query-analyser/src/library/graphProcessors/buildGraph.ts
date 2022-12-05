import {
  ARetrieval,
  RetrievalGraph,
  RetrievalVertex,
  VirtualRetrieval,
  VirtualRetrievalKind,
} from "../dataStructures/json/retrieval";

function makeRetrievalConsumer(graph: RetrievalGraph) {
  return (retrievals: ARetrieval[]) => {
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
  };
}

function makeVirtualRetrieval({
  retrievalId,
}: {
  retrievalId: number;
}): VirtualRetrieval {
  return {
    $kind: VirtualRetrievalKind,
    retrievalId,
    timingInfo: {},
  };
}

export default function buildGraph(
  aggregateRetrievals: Array<any>,
  externalRetrievals: Array<any>,
  aggregateDependencies: Map<number, Set<number>>,
  externalDependencies: Map<number, Set<number>>
): RetrievalGraph {
  const graph = new RetrievalGraph();

  const retrievalConsumer = makeRetrievalConsumer(graph);

  const virtualSource = new RetrievalVertex(
    makeVirtualRetrieval({ retrievalId: -1 })
  );
  graph.addVertex(virtualSource);
  graph.labelVertex(virtualSource.getUUID(), "virtualSource");
  const virtualTarget = new RetrievalVertex(
    makeVirtualRetrieval({ retrievalId: -2 })
  );
  graph.addVertex(virtualTarget);
  graph.labelVertex(virtualTarget.getUUID(), "virtualTarget");

  const aggregateRetrievalVertices = retrievalConsumer(aggregateRetrievals);
  const externalRetrievalVertices = retrievalConsumer(externalRetrievals);

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
          undefined
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

    graph.createEdge(vertex.getUUID(), virtualTarget.getUUID(), undefined);
  });

  return graph;
}
