import { Edge } from "../dataStructures/common/graph";
import {
  ARetrieval,
  RetrievalEdgeMetadata,
  RetrievalGraph,
  RetrievalVertex,
  VirtualRetrievalKind,
} from "../dataStructures/json/retrieval";
import { UUID } from "../utilities/uuid";

const MERGER_TYPES = new Set([
  "PrimitiveResultsMerger",
  "PostProcessedResultsMerger",
]);

/**
 * Check if a retrieval is a merger node.
 */
function isMergerNode(retrieval: ARetrieval): boolean {
  return MERGER_TYPES.has(retrieval.type);
}

/**
 * Follow a chain of mergers to find the final non-merger successor.
 * Returns the merger node itself if we want to store it in the edge metadata.
 */
function findNonMergerSuccessors(
  graph: RetrievalGraph,
  vertex: RetrievalVertex,
  visited: Set<UUID>,
): { vertex: RetrievalVertex; merger: ARetrieval }[] {
  const results: { vertex: RetrievalVertex; merger: ARetrieval }[] = [];

  for (const edge of graph.getOutgoingEdges(vertex)) {
    const successor = edge.getEnd();
    const successorUUID = successor.getUUID();

    if (visited.has(successorUUID)) {
      continue;
    }

    if (isMergerNode(successor.getMetadata())) {
      // Follow the chain recursively
      visited.add(successorUUID);
      const furtherResults = findNonMergerSuccessors(graph, successor, visited);
      // Use the current vertex's metadata as the hidden merger for all results
      for (const result of furtherResults) {
        results.push({ vertex: result.vertex, merger: vertex.getMetadata() });
      }
    } else {
      // Found a non-merger successor
      results.push({ vertex: successor, merger: vertex.getMetadata() });
    }
  }

  return results;
}

/**
 * Result of the merger removal algorithm.
 */
export interface RemoveMergerNodesResult {
  graph: RetrievalGraph;
}

/**
 * Remove merger nodes (PrimitiveResultsMerger, PostProcessedResultsMerger) from the graph.
 *
 * For each merger node removed, its predecessors are directly connected to its successors.
 * The removed merger is stored in the edge's `hiddenMerger` metadata field.
 *
 * @param graph - The input retrieval graph
 * @returns An object containing the new graph without merger nodes
 */
export function removeMergerNodes(
  graph: RetrievalGraph,
): RemoveMergerNodesResult {
  // Identify merger and non-merger vertices
  const mergerVertices = new Set<UUID>();
  const nonMergerVertices: RetrievalVertex[] = [];

  for (const vertex of graph.getVertices()) {
    if (isMergerNode(vertex.getMetadata())) {
      mergerVertices.add(vertex.getUUID());
    } else {
      nonMergerVertices.push(vertex);
    }
  }

  // If no mergers, return the original graph
  if (mergerVertices.size === 0) {
    return { graph };
  }

  // Build the new graph
  const newGraph = new RetrievalGraph();

  // Add all non-merger vertices
  for (const vertex of nonMergerVertices) {
    newGraph.addVertex(vertex);
  }

  // Track added edges to avoid duplicates
  const addedEdges = new Set<string>();

  // Add edges from original graph (non-merger to non-merger)
  for (const vertex of graph.getVertices()) {
    if (mergerVertices.has(vertex.getUUID())) {
      continue;
    }

    for (const edge of graph.getOutgoingEdges(vertex)) {
      const successor = edge.getEnd();

      if (!mergerVertices.has(successor.getUUID())) {
        // Direct edge between non-mergers: keep it as is
        const edgeKey = `${vertex.getUUID()}->${successor.getUUID()}`;
        if (!addedEdges.has(edgeKey)) {
          addedEdges.add(edgeKey);
          newGraph.addEdge(
            new Edge(
              { criticalScore: edge.getMetadata().criticalScore },
              vertex,
              successor,
            ),
          );
        }
      } else {
        // Edge goes to a merger: find the non-merger successors through the chain
        const visited = new Set<UUID>();
        visited.add(successor.getUUID());
        const finalSuccessors = findNonMergerSuccessors(
          graph,
          successor,
          visited,
        );

        for (const { vertex: finalSuccessor, merger } of finalSuccessors) {
          // Skip if destination is VirtualRetrieval or same as source
          if (
            finalSuccessor.getMetadata().$kind === VirtualRetrievalKind ||
            finalSuccessor.getUUID() === vertex.getUUID()
          ) {
            continue;
          }

          const edgeKey = `${vertex.getUUID()}->${finalSuccessor.getUUID()}`;
          if (!addedEdges.has(edgeKey)) {
            addedEdges.add(edgeKey);
            const metadata: RetrievalEdgeMetadata = {
              criticalScore: edge.getMetadata().criticalScore,
              hiddenMerger: merger,
            };
            newGraph.addEdge(new Edge(metadata, vertex, finalSuccessor));
          }
        }
      }
    }
  }

  // Copy labels if vertices exist in new graph
  try {
    const virtualSource = graph.getVertexByLabel("virtualSource");
    if (!mergerVertices.has(virtualSource.getUUID())) {
      newGraph.labelVertex(virtualSource.getUUID(), "virtualSource");
    }
  } catch {
    // Label doesn't exist, skip
  }

  try {
    const virtualTarget = graph.getVertexByLabel("virtualTarget");
    if (!mergerVertices.has(virtualTarget.getUUID())) {
      newGraph.labelVertex(virtualTarget.getUUID(), "virtualTarget");
    }
  } catch {
    // Label doesn't exist, skip
  }

  return { graph: newGraph };
}
