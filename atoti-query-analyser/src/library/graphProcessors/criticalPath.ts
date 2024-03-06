import {
  AGraphObserver,
  applyOnDAG,
  dfs,
  IGraph,
} from "../dataStructures/common/graph";
import {
  ARetrieval,
  RetrievalEdge,
  RetrievalEdgeMetadata,
  RetrievalGraph,
  RetrievalVertex,
  VirtualRetrievalKind,
} from "../dataStructures/json/retrieval";
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
  criticalScore: number;
  parent: RetrievalVertex | null;
}

/**
 * Find a critical path in the graph.
 *
 * We define critical path as follows. First, we select a retrieval that has
 * maximal end time among all selected retrievals. Next, we take all its
 * selected dependencies and take the last computed retrieval. We continue this
 * process until current retrieval has dependencies.
 *
 * The resulting sequence of retrievals shows which retrievals have the most
 * significant effect on computation time.
 */
export function criticalPath(
  graph: RetrievalGraph,
  selection: VertexSelection
) {
  const virtualSource = graph.getVertexByLabel("virtualSource");
  const filteredGraph = graph.filterVertices(
    (vertex) =>
      vertex.getMetadata().$kind === VirtualRetrievalKind ||
      selection.has(vertex.getUUID())
  );

  // We define criticalScore(node) as elapsedTime(node) + max([criticalScore(dependency) for dependency in graph.getOutgoingEdges(node)])

  const criticalScoreCalculator = (
    node: RetrievalVertex,
    children: Set<RetrievalVertex>,
    childrenValues: (child: RetrievalVertex) => CriticalScore
  ): CriticalScore => {
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
      parent,
    };
  };

  const criticalScore = applyOnDAG(
    filteredGraph,
    virtualSource,
    criticalScoreCalculator
  );

  // Recreate path going up from the node with worst critical and collect link ids
  let maxNode = requireNonNull(criticalScore.get(virtualSource)).parent;
  const criticalLinks = new Set<string>();
  while (
    maxNode &&
    requireNonNull(criticalScore.get(maxNode)).parent !== null
  ) {
    const source = requireNonNull(criticalScore.get(maxNode))
      .parent as RetrievalVertex;
    const target = maxNode;
    criticalLinks.add(`${target.getUUID()}#${source.getUUID()}`);
    maxNode = source;
  }

  return criticalLinks;
}

/**
 * Assigns critical score to the edges.
 * */
export function computeEdgeCriticalScore(graph: RetrievalGraph) {
  const virtualSource = graph.getVertexByLabel("virtualSource");

  const vertexCriticalScore = applyOnDAG(
    graph,
    virtualSource,
    (vertex, children, childrenValues: (child: RetrievalVertex) => number) => {
      const elapsedTime = findElapsedTime(vertex);

      return (
        elapsedTime +
        Array.from(children)
          .map((child) => childrenValues(child))
          .reduce((acc, x) => Math.max(acc, x), 0)
      );
    }
  );

  graph.getVertices().forEach((vertex) => {
    const edges = Array.from(graph.getOutgoingEdges(vertex)).sort(
      (lhs, rhs) =>
        requireNonNull(vertexCriticalScore.get(lhs.getEnd())) -
        requireNonNull(vertexCriticalScore.get(rhs.getEnd()))
    );

    if (edges.length <= 1) {
      edges.forEach((edge) => (edge.getMetadata().criticalScore = 1));
    } else {
      edges.forEach(
        (edge, idx) =>
          (edge.getMetadata().criticalScore = (idx + 1) / edges.length)
      );
    }
  });
}

/**
 * Selects vertices from the graph that are reachable from "virtualSource" after deleting edges with low criticalScore.
 */
export function selectCriticalSubgraph(
  graph: RetrievalGraph,
  minCriticalScore: number
): VertexSelection {
  const result: VertexSelection = new Set();

  class FilteredGraph
    implements
      IGraph<ARetrieval, RetrievalEdgeMetadata, RetrievalVertex, RetrievalEdge>
  {
    constructor(private underlying: RetrievalGraph) {}

    getOutgoingEdges(vertex: RetrievalVertex): Set<RetrievalEdge> {
      return new Set(
        Array.from(this.underlying.getOutgoingEdges(vertex)).filter(
          (edge) => edge.getMetadata().criticalScore >= minCriticalScore
        )
      );
    }

    getVertexCount(): number {
      return this.underlying.getVertexCount();
    }

    getVertices(): Set<RetrievalVertex> {
      return this.underlying.getVertices();
    }
  }

  class VertexCollector extends AGraphObserver<
    ARetrieval,
    RetrievalEdgeMetadata,
    RetrievalVertex,
    RetrievalEdge,
    FilteredGraph
  > {
    onVertexEnter(vertex: RetrievalVertex) {
      if (vertex.getMetadata().$kind !== "VirtualRetrieval") {
        result.add(vertex.getUUID());
      }
    }
  }

  dfs(
    new FilteredGraph(graph),
    graph.getVertexByLabel("virtualSource"),
    new VertexCollector()
  );

  return result;
}
