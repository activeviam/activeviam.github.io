export const filterAndInverse = (graph, selection) => {
  const virtualSource = graph.getVertexByLabel("virtualSource");
  const virtualTarget = graph.getVertexByLabel("virtualTarget");

  const virtualVertices = new Set([virtualSource, virtualTarget]);

  const filteredGraph = graph.filterVertices((vertex) => !virtualVertices.has(vertex) && selection.has(vertex.getUUID()));
  const invGraph = filteredGraph.inverse();

  const sources = new Set();
  const sinks = new Set();

  [...filteredGraph.getVertices()].forEach(vertex => {
    const isSink = [...filteredGraph.getOutgoingEdges(vertex)].length === 0;
    const isSource = [...invGraph.getOutgoingEdges(vertex)].length === 0;

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
  ].forEach(({graph, sources, sinks}) => {
    graph.addVertex(virtualSource);
    graph.addVertex(virtualTarget);
    graph.labelVertex(virtualSource.getUUID(), "virtualSource");
    graph.labelVertex(virtualTarget.getUUID(), "virtualTarget");

    sources.forEach(vertex => graph.createEdge(virtualSource.getUUID(), vertex.getUUID(), new Map()));
    sinks.forEach(vertex => graph.createEdge(vertex.getUUID(), virtualTarget.getUUID(), new Map()));
  });


  return { virtualSource, virtualTarget, invGraph, filteredGraph };
};

