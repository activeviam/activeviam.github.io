import {
  AggregateRetrievalKind,
  ExternalRetrievalKind,
  VirtualRetrievalKind,
  RetrievalGraph,
  ARetrieval,
  AggregateRetrieval,
  ExternalRetrieval,
  RetrievalVertex,
} from "../dataStructures/json/retrieval";

function getNodeMeasures(retrieval: ARetrieval): string[] {
  if (retrieval.$kind === AggregateRetrievalKind)
    return (retrieval as AggregateRetrieval).measures;
  if (retrieval.$kind === ExternalRetrievalKind)
    return (retrieval as ExternalRetrieval).joinedMeasure;
  return [];
}

function isGeneratedNode(retrieval: ARetrieval): boolean {
  const measures = getNodeMeasures(retrieval);
  return measures.length > 0 && measures.every((m) => m.includes("_#_"));
}

function visitAndTagParentMeasures(
  graph: RetrievalGraph,
  vertex: RetrievalVertex,
  parentMeasures: string[],
): void {
  const retrieval = vertex.getMetadata();

  let measuresForChildren: string[];

  if (retrieval.$kind === VirtualRetrievalKind) {
    measuresForChildren = parentMeasures;
  } else if (isGeneratedNode(retrieval)) {
    // Copy parentMeasures from parent onto this node
    const existing: string[] = Reflect.get(retrieval, "parentMeasures") ?? [];
    const existingSet = new Set(existing);
    const newMeasures = parentMeasures.filter((m) => !existingSet.has(m));
    if (newMeasures.length === 0) return; // nothing new — stop here
    const merged = [...existing, ...newMeasures];
    Reflect.set(retrieval, "parentMeasures", merged);
    measuresForChildren = merged;
  } else {
    // Non-generated node — its own measures become the parentMeasures for children
    measuresForChildren = getNodeMeasures(retrieval).filter(
      (m) => !m.includes("_#_"),
    );
  }

  for (const edge of graph.getOutgoingEdges(vertex)) {
    visitAndTagParentMeasures(graph, edge.getEnd(), measuresForChildren);
  }
}

/**
 * Top-down DFS: propagate parent measure names downward through the graph.
 * Each node's effective parentMeasures is either its own measures (if non-generated)
 * or the parentMeasures inherited from above (if generated).
 * On generated child nodes, we copy parentMeasures from the parent.
 * Early termination: if all measures are already present, skip subtree.
 */
export function computeParentMeasures(graph: RetrievalGraph): void {
  const virtualSource = graph.getVertexByLabel("virtualSource");
  visitAndTagParentMeasures(graph, virtualSource, []);
}
