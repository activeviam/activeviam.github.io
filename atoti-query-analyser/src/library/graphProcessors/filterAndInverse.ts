import {
  RetrievalGraph,
  RetrievalVertex,
} from "../dataStructures/json/retrieval";
import { VertexSelection } from "../dataStructures/processing/selection";

export function filterAndInverse(
  graph: RetrievalGraph,
  selection: VertexSelection
) {
  const virtualSource = graph.getVertexByLabel("virtualSource");
  const virtualTarget = graph.getVertexByLabel("virtualTarget");

  const virtualVertices = new Set([virtualSource, virtualTarget]);

  const filteredGraph = graph.filterVertices(
    (vertex) => !virtualVertices.has(vertex) && selection.has(vertex.getUUID())
  );
  const invGraph = filteredGraph.inverse();

  const originalSources = new Set<RetrievalVertex>();
  const originalSinks = new Set<RetrievalVertex>();

  filteredGraph.getVertices().forEach((vertex) => {
    const isSink = filteredGraph.getOutgoingEdges(vertex).size === 0;
    const isSource = invGraph.getOutgoingEdges(vertex).size === 0;

    if (isSource) {
      originalSources.add(vertex);
    }
    if (isSink) {
      originalSinks.add(vertex);
    }
  });

  [
    { gr: filteredGraph, sources: originalSources, sinks: originalSinks },
    { gr: invGraph, sources: originalSinks, sinks: originalSources },
  ].forEach(({ gr, sources, sinks }) => {
    gr.addVertex(virtualSource);
    gr.addVertex(virtualTarget);
    gr.labelVertex(virtualSource.getUUID(), "virtualSource");
    gr.labelVertex(virtualTarget.getUUID(), "virtualTarget");

    sources.forEach((vertex) =>
      gr.createEdge(virtualSource.getUUID(), vertex.getUUID(), undefined)
    );
    sinks.forEach((vertex) =>
      gr.createEdge(vertex.getUUID(), virtualTarget.getUUID(), undefined)
    );
  });

  return { virtualSource, virtualTarget, invGraph, filteredGraph };
}