import { applyOnDAG } from "../dataStructures/common/graph";

const findTime = (vertex) => {
  const timingInfo = vertex.getMetadata().timingInfo;
  if (timingInfo === undefined) {
    return 0;
  }
  if (timingInfo.elapsedTime === undefined) {
    console.log(vertex);
  }
  return Math.max(...timingInfo.elapsedTime);
};

const criticalPath = (query, info) => {
  const { graph } = query;
  const { selection } = info;
  const virtualSource = graph.getVertexByLabel("virtualSource");
  const filteredGraph = graph.filterVertices((vertex) => selection.has(vertex.getUUID()));

  // We define criticalScore(node) as elapsedTime(node) + max([criticalScore(dependency) for dependency in graph.getOutgoingEdges(node)])

  const criticalScoreCalculator = (node, dependencies, accumulator) => {
    const elapsed = findTime(node);

    let maxParentCritical = 0;
    let parent = null;

    dependencies.forEach(dep => {
      const parentCritical = accumulator.get(dep).criticalScore;
      if (parentCritical > maxParentCritical) {
        maxParentCritical = parentCritical;
        parent = dep;
      }
    });

    return {
      criticalScore: maxParentCritical + elapsed,
      parent
    };
  };

  const criticalScore = applyOnDAG(filteredGraph, virtualSource, criticalScoreCalculator);

  // Recreate path going up from the node with worst critical and collect link ids
  let maxNode = criticalScore.get(virtualSource).parent;
  const criticalLinks = new Set();
  while (maxNode && criticalScore.get(maxNode).parent !== null) {
    const source = criticalScore.get(maxNode).parent;
    const target = maxNode;
    criticalLinks.add(`${target.getUUID()}#${source.getUUID()}`);
    maxNode = source;
  }

  return criticalLinks;
};

export default criticalPath;
