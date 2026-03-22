import { Edge, Vertex } from "../dataStructures/common/graph";
import { UnionFind } from "../dataStructures/common/unionFind";
import {
  AggregateRetrieval,
  AggregateRetrievalKind,
  ARetrieval,
  RetrievalGraph,
  RetrievalVertex,
  VirtualRetrievalKind,
  PartitionCondensedRetrieval,
  PartitionCondensedRetrievalKind
} from "../dataStructures/json/retrieval";
import { TimingInfo } from "../dataStructures/json/timingInfo";
import { UUID } from "../utilities/uuid";

/**
 * Merger node types that we use to identify partition boundaries.
 */
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
 * Result of the partition condensation algorithm.
 */
export interface CondenseByPartitionsResult {
  graph: RetrievalGraph;
  retainedUUIDs: Set<UUID>;
}

/**
 * Build a bidirectional neighbor index for the graph.
 * Returns a map from each vertex UUID to the set of all neighbor UUIDs.
 */
function buildNeighborIndex(graph: RetrievalGraph): Map<UUID, Set<UUID>> {
  const neighbors = new Map<UUID, Set<UUID>>();

  // Initialize empty sets for all vertices
  for (const vertex of graph.getVertices()) {
    neighbors.set(vertex.getUUID(), new Set());
  }

  // Add both directions for each edge
  for (const vertex of graph.getVertices()) {
    for (const edge of graph.getOutgoingEdges(vertex)) {
      const beginUUID = edge.getBegin().getUUID();
      const endUUID = edge.getEnd().getUUID();
      neighbors.get(beginUUID)!.add(endUUID);
      neighbors.get(endUUID)!.add(beginUUID);
    }
  }

  return neighbors;
}

/**
 * Identify merger nodes and nodes directly connected to them.
 *
 * - Merger nodes are identified by their type (PrimitiveResultsMerger, PostProcessedResultsMerger)
 * - Nodes directly connected to mergers (one edge away) are retained (not condensed)
 * - Remaining nodes will be grouped into connected components
 */
function identifyMergerConnectedNodes(
  graph: RetrievalGraph,
  neighborIndex: Map<UUID, Set<UUID>>,
): { mergerUUIDs: Set<UUID>; retainedUUIDs: Set<UUID> } {
  const mergerUUIDs = new Set<UUID>();
  const retainedUUIDs = new Set<UUID>();

  // Find all merger nodes
  for (const vertex of graph.getVertices()) {
    if (isMergerNode(vertex.getMetadata())) {
      mergerUUIDs.add(vertex.getUUID());
    }
  }

  // Find all nodes directly connected to mergers
  for (const mergerUUID of mergerUUIDs) {
    const neighbors = neighborIndex.get(mergerUUID) || new Set();
    for (const neighborUUID of neighbors) {
      // Only add non-merger nodes to retained set
      if (!mergerUUIDs.has(neighborUUID)) {
        retainedUUIDs.add(neighborUUID);
      }
    }
  }

  return { mergerUUIDs, retainedUUIDs };
}

/**
 * Group remaining nodes (neither mergers nor retained) into connected components using UnionFind.
 * Returns a map from component representative UUID to array of member UUIDs.
 */
function groupRemainingNodes(
  graph: RetrievalGraph,
  neighborIndex: Map<UUID, Set<UUID>>,
  mergerUUIDs: Set<UUID>,
  retainedUUIDs: Set<UUID>,
): Map<UUID, UUID[]> {
  // Collect all remaining nodes (neither mergers nor retained)
  const remainingUUIDs: UUID[] = [];
  const remainingSet = new Set<UUID>();

  for (const vertex of graph.getVertices()) {
    const uuid = vertex.getUUID();
    // Exclude mergers, retained nodes, and virtual vertices from condensation
    if (
      !mergerUUIDs.has(uuid) &&
      !retainedUUIDs.has(uuid) &&
      vertex.getMetadata().$kind !== VirtualRetrievalKind
    ) {
      remainingUUIDs.push(uuid);
      remainingSet.add(uuid);
    }
  }

  // Use UnionFind to find connected components among remaining nodes
  const uf = new UnionFind<UUID>();

  for (const uuid of remainingUUIDs) {
    const neighbors = neighborIndex.get(uuid) || new Set();
    for (const neighborUUID of neighbors) {
      // Only union with other remaining nodes (not mergers, not retained)
      if (remainingSet.has(neighborUUID)) {
        uf.union(uuid, neighborUUID);
      }
    }
  }

  // Group by representative
  const groups = new Map<UUID, UUID[]>();
  for (const uuid of remainingUUIDs) {
    const representative = uf.find(uuid);
    if (!groups.has(representative)) {
      groups.set(representative, []);
    }
    groups.get(representative)!.push(uuid);
  }

  return groups;
}

/**
 * Compute combined timing info for a group of retrievals.
 */
function computeGroupTimingInfo(group: ARetrieval[]): TimingInfo {
  const startTimes = group
    .flatMap((r) => r.timingInfo.startTime)
    .filter((x) => x !== undefined) as number[];
  const elapsedTimes = group
    .flatMap((r) => r.timingInfo.elapsedTime)
    .filter((x) => x !== undefined) as number[];

  if (startTimes.length === 0 || elapsedTimes.length === 0) {
    return { startTime: undefined, elapsedTime: undefined };
  }

  const endTimes = startTimes.map(
    (startTime, idx) => startTime + elapsedTimes[idx],
  );

  const beginTime = Math.min(...startTimes);
  const endTime = Math.max(...endTimes);

  return {
    startTime: [beginTime],
    elapsedTime: [endTime - beginTime],
  };
}

/**
 * Condense a retrieval graph based on merger node boundaries.
 *
 * This function identifies merger nodes (PrimitiveResultsMerger, PostProcessedResultsMerger)
 * and retains all nodes that are directly connected to them. The remaining nodes
 * are grouped into connected components and condensed into single
 * PartitionCondensedRetrieval nodes.
 *
 * Note: Merger nodes themselves are excluded from the result graph (they are
 * removed by the subsequent removeMergerNodes step).
 *
 * @param graph - The input retrieval graph
 * @returns An object containing:
 *   - graph: The condensed graph (excluding merger nodes)
 *   - retainedUUIDs: Set of UUIDs of retained (non-condensed) nodes
 */
export function condenseByPartitions(
  graph: RetrievalGraph,
): CondenseByPartitionsResult {
  const neighborIndex = buildNeighborIndex(graph);
  const { mergerUUIDs, retainedUUIDs } = identifyMergerConnectedNodes(
    graph,
    neighborIndex,
  );
  const groups = groupRemainingNodes(
    graph,
    neighborIndex,
    mergerUUIDs,
    retainedUUIDs,
  );

  // Build mapping from original UUIDs to new vertices
  const vertexMapping = new Map<UUID, RetrievalVertex>();

  // Create condensed vertices for each group
  let condensedId = -1;
  for (const [, members] of groups) {
    const underlyingRetrievals = members.map((uuid) =>
      graph.getVertexByUUID(uuid).getMetadata(),
    );

    // Collect unique partitioning values from all members
    const partitionings = new Set<string>();
    for (const retrieval of underlyingRetrievals) {
      if (retrieval.$kind === AggregateRetrievalKind) {
        const partitioning = (retrieval as AggregateRetrieval).partitioning;
        if (partitioning) {
          partitionings.add(partitioning);
        }
      }
    }

    // Use first partitioning if only one, "mixed" if multiple, empty string if none
    const partitioningArray = Array.from(partitionings);
    let partitioning: string;
    if (partitioningArray.length === 1) {
      partitioning = partitioningArray[0];
    } else if (partitioningArray.length > 1) {
      partitioning = "mixed";
    } else {
      partitioning = "";
    }

    const condensedRetrieval: PartitionCondensedRetrieval = {
      $kind: PartitionCondensedRetrievalKind,
      retrievalId: condensedId--,
      timingInfo: computeGroupTimingInfo(underlyingRetrievals),
      type: "PartitionCondensedRetrieval",
      underlyingRetrievals,
      partitioning,
    };

    const condensedVertex = new Vertex(condensedRetrieval as ARetrieval);

    // Map all members to this condensed vertex
    for (const uuid of members) {
      vertexMapping.set(uuid, condensedVertex);
    }
  }

  // Retained vertices map to themselves
  for (const uuid of retainedUUIDs) {
    vertexMapping.set(uuid, graph.getVertexByUUID(uuid));
  }

  // Merger vertices map to themselves (will be removed by removeMergerNodes later)
  for (const uuid of mergerUUIDs) {
    vertexMapping.set(uuid, graph.getVertexByUUID(uuid));
  }

  // Virtual vertices map to themselves (needed for graph structure)
  for (const vertex of graph.getVertices()) {
    if (vertex.getMetadata().$kind === VirtualRetrievalKind) {
      vertexMapping.set(vertex.getUUID(), vertex);
    }
  }

  // Build the new graph
  const newGraph = new RetrievalGraph();

  // Add all vertices (deduplicated)
  const addedVertices = new Set<RetrievalVertex>();
  for (const vertex of vertexMapping.values()) {
    if (!addedVertices.has(vertex)) {
      newGraph.addVertex(vertex);
      addedVertices.add(vertex);
    }
  }

  // Add edges, deduplicating and removing self-loops
  const addedEdges = new Set<string>();
  for (const vertex of graph.getVertices()) {
    for (const edge of graph.getOutgoingEdges(vertex)) {
      const beginUUID = edge.getBegin().getUUID();
      const endUUID = edge.getEnd().getUUID();

      const newBegin = vertexMapping.get(beginUUID)!;
      const newEnd = vertexMapping.get(endUUID)!;

      // Skip self-loops
      if (newBegin === newEnd) {
        continue;
      }

      // Deduplicate edges
      const edgeKey = `${newBegin.getUUID()}->${newEnd.getUUID()}`;
      if (addedEdges.has(edgeKey)) {
        continue;
      }
      addedEdges.add(edgeKey);

      newGraph.addEdge(new Edge({ criticalScore: 1 }, newBegin, newEnd));
    }
  }

  // Copy labels if vertices exist in new graph
  try {
    const virtualSource = graph.getVertexByLabel("virtualSource");
    if (vertexMapping.has(virtualSource.getUUID())) {
      newGraph.labelVertex(
        vertexMapping.get(virtualSource.getUUID())!.getUUID(),
        "virtualSource",
      );
    }
  } catch {
    // Label doesn't exist, skip
  }

  try {
    const virtualTarget = graph.getVertexByLabel("virtualTarget");
    if (vertexMapping.has(virtualTarget.getUUID())) {
      newGraph.labelVertex(
        vertexMapping.get(virtualTarget.getUUID())!.getUUID(),
        "virtualTarget",
      );
    }
  } catch {
    // Label doesn't exist, skip
  }

  return {
    graph: newGraph,
    retainedUUIDs,
  };
}
