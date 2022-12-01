import { RetrievalGraph, RetrievalVertex } from "../dataStructures/json/retrieval";
import { VertexSelection } from "../dataStructures/processing/selection";

export function filterAndInverse(graph: RetrievalGraph, selection: VertexSelection) {
  const virtualSource = graph.getVertexByLabel("virtualSource");
  const virtualTarget = graph.getVertexByLabel("virtualTarget");

  const virtualVertices = new Set([virtualSource, virtualTarget]);

  const filteredGraph = graph.filterVertices((vertex) => !virtualVertices.has(vertex) && selection.has(vertex.getUUID()));
  const invGraph = filteredGraph.inverse();

  const sources = new Set<RetrievalVertex>();
  const sinks = new Set<RetrievalVertex>();

  filteredGraph.getVertices().forEach(vertex => {
    const isSink = filteredGraph.getOutgoingEdges(vertex).size === 0;
    const isSource = invGraph.getOutgoingEdges(vertex).size === 0;

    if (isSource) {
      sources.add(vertex);
    }
    if (isSink) {
      sinks.add(vertex);
    }
  });

  [
    { graph: filteredGraph, sources, sinks },
    { graph: invGraph, sources: sinks, sinks: sources }
  ].forEach(({ graph, sources, sinks }) => {
    graph.addVertex(virtualSource);
    graph.addVertex(virtualTarget);
    graph.labelVertex(virtualSource.getUUID(), "virtualSource");
    graph.labelVertex(virtualTarget.getUUID(), "virtualTarget");

    sources.forEach(vertex => graph.createEdge(virtualSource.getUUID(), vertex.getUUID(), undefined));
    sinks.forEach(vertex => graph.createEdge(vertex.getUUID(), virtualTarget.getUUID(), undefined));
  });


  return { virtualSource, virtualTarget, invGraph, filteredGraph };
}

