import { Vertex, AdjacencyListGraph } from "../dataStructures/graph";
import { computeIfAbsent } from "../utilities/util";

function asMetadata({
                      rawMetadata,
                      kind,
                      retrievalId
                    }: { rawMetadata: object, kind: string, retrievalId: number }): Map<string, any> {
  const map = new Map(Object.entries(rawMetadata));
  map.set("$kind", kind);
  map.set("retrievalId", retrievalId);
  return map;
}

function makeRetrievalConsumer(graph: AdjacencyListGraph<Vertex>) {
  return (retrievals: Array<{ retrievalId: number | undefined, retrId: number | undefined }>, kind: string) => {
    return retrievals
      .map((retrieval) => {
        const { retrId, retrievalId, ...rest } = retrieval;
        const effectiveId = retrievalId === undefined ? retrId : retrievalId;
        if (effectiveId === undefined) {
          throw new Error("Retrieval doesn't have retrievalId: " + JSON.stringify(retrieval));
        }

        return { retrievalId: effectiveId, ...rest };
      })
      .sort((lhs, rhs) => lhs.retrievalId - rhs.retrievalId)
      .map((retrieval, index) => {
        const { retrievalId, ...rawMetadata } = retrieval;

        if (retrievalId !== index) {
          throw new Error(`Missing retrieval ${kind}#${retrievalId - 1}`);
        }

        const vertex = new Vertex(asMetadata({ rawMetadata, kind, retrievalId }));
        graph.addVertex(vertex);
        return vertex.getUUID();
      });
  };
}

export default function buildGraph(
  aggregateRetrievals: Array<any>,
  externalRetrievals: Array<any>,
  dependencies: Map<number, Set<number>>,
  externalDependencies: Map<number, Set<number>>
): AdjacencyListGraph<Vertex> {
  const graph = new AdjacencyListGraph<Vertex>();

  const retrievalConsumer = makeRetrievalConsumer(graph);

  const virtualSource = new Vertex(asMetadata({ rawMetadata: {}, kind: "Virtual", retrievalId: -1 }));
  graph.addVertex(virtualSource);
  graph.labelVertex(virtualSource.getUUID(), "virtualSource");
  const virtualTarget = new Vertex(asMetadata({ rawMetadata: {}, kind: "Virtual", retrievalId: -2 }));
  graph.addVertex(virtualTarget);
  graph.labelVertex(virtualTarget.getUUID(), "virtualTarget");

  const aggregateRetrievalVertices = retrievalConsumer(aggregateRetrievals, "Retrieval");
  const externalRetrievalVertices = retrievalConsumer(externalRetrievals, "ExternalRetrieval");

  externalRetrievalVertices.forEach(vertexId => {
    computeIfAbsent(graph.getVertexByUUID(vertexId).getMetadata(), "type", () => "ExternalDatabaseRetrieval");
  });

  [
    { dependencies: dependencies, depVertices: aggregateRetrievalVertices },
    { dependencies: externalDependencies, depVertices: externalRetrievalVertices }
  ].forEach(({ dependencies, depVertices }) => {
    console.log(dependencies);
    dependencies.forEach((deps, key) => {
      deps.forEach((dep) => {
        graph.createEdge(key < 0 ? virtualSource.getUUID() : aggregateRetrievalVertices[key], depVertices[dep], new Map());
      });
    });
  });

  graph.getVertices()
    .forEach((vertex) => {
      if (vertex === virtualTarget) {
        return;
      }

      const edges = graph.getOutgoingEdges(vertex);
      if (edges.size > 0) {
        return;
      }

      graph.createEdge(vertex.getUUID(), virtualTarget.getUUID(), new Map());
    });

  return graph;
};