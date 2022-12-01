import { applyOnDAG } from "../dataStructures/common/graph";
import { RetrievalGraph, RetrievalVertex } from "../dataStructures/json/retrieval";
import { VertexSelection } from "../dataStructures/processing/selection";
import { requireNonNull } from "../utilities/util";

function findElapsedTime(node: RetrievalVertex): number {
  const { timingInfo } = node.getMetadata();
  if (timingInfo === undefined) {
    return 0;
  }
  if (timingInfo.elapsedTime === undefined) {
    return 0;
  }
  return Math.max(...timingInfo.elapsedTime);
}

interface CriticalScore {
  criticalScore: number,
  parent: RetrievalVertex | null
}

export function criticalPath(graph: RetrievalGraph, selection: VertexSelection) {
  const virtualSource = graph.getVertexByLabel("virtualSource");
  const filteredGraph = graph.filterVertices((vertex) => selection.has(vertex.getUUID()));

  // We define criticalScore(node) as elapsedTime(node) + max([criticalScore(dependency) for dependency in graph.getOutgoingEdges(node)])

  const criticalScoreCalculator = (node: RetrievalVertex, children: Set<RetrievalVertex>, childrenValues: (child: RetrievalVertex) => CriticalScore): CriticalScore => {
    const elapsed = findElapsedTime(node);

    let maxParentCritical = 0;
    let parent = null;

    children.forEach((dep: RetrievalVertex) => {
      const parentCritical = childrenValues(dep).criticalScore;
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
  let maxNode = requireNonNull(criticalScore.get(virtualSource)).parent;
  const criticalLinks = new Set<string>();
  while (maxNode && requireNonNull(criticalScore.get(maxNode)).parent !== null) {
    const source = requireNonNull(criticalScore.get(maxNode)).parent as RetrievalVertex;
    const target = maxNode;
    criticalLinks.add(`${target.getUUID()}#${source.getUUID()}`);
    maxNode = source;
  }

  return criticalLinks;
}
