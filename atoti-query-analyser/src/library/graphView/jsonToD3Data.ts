import { nodeDepths } from "../graphProcessors/fillTimingInfo";
import { addClustersToNodes } from "../graphProcessors/cluster";
import { abbreviation } from "../utilities/textUtils";
import {
  AggregateRetrievalKind,
  RetrievalEdge,
  RetrievalGraph,
  RetrievalVertex,
  VirtualRetrievalKind,
} from "../dataStructures/json/retrieval";
import { QueryPlan } from "../dataStructures/processing/queryPlan";
import {
  EdgeSelection,
  VertexSelection,
} from "../dataStructures/processing/selection";
import { requireNonNull } from "../utilities/util";
import { D3Node } from "../dataStructures/d3/d3Node";
import { D3Link } from "../dataStructures/d3/d3Link";
import { UUID } from "../utilities/uuid";
import { D3Graph } from "../dataStructures/d3/d3Graph";

/**
 * @param elapsed: the elapsed time of a node
 * Returns the radius the node should be displayed with
 */
function computeRadius(elapsed: number): number {
  if (elapsed < 5) return 20;
  if (elapsed < 20) return 35;
  if (elapsed < 100) return 50;
  return 65;
}

type IntermediateD3Node = Omit<D3Node, "id"> & { id: UUID };
type IntermediateD3Link = Omit<Omit<D3Link, "source">, "target"> & {
  source: UUID;
  target: UUID;
};

/**
 * Builds d3js representation of graph nodes.
 * */
function getNodes(
  graph: RetrievalGraph,
  info: { vertexSelection: VertexSelection; edgeSelection: EdgeSelection },
  depths: Map<RetrievalVertex, number>
): IntermediateD3Node[] {
  // Creates a Set containing all nodes present in the dependencies, then converts
  // it to an array and map each node number to its node object.

  const virtualSource = graph.getVertexByLabel("virtualSource");
  const leaves = new Set(
    Array.from(graph.getOutgoingEdges(virtualSource)).map((edge) =>
      edge.getEnd()
    )
  );
  const roots = new Set(
    Array.from(graph.getVertices()).filter(
      (vertex) =>
        Array.from(graph.getOutgoingEdges(vertex)).filter(
          (edge) => edge.getEnd().getMetadata().$kind !== VirtualRetrievalKind
        ).length === 0
    )
  );

  return Array.from(graph.getVertices())
    .filter(
      (vertex) =>
        info.vertexSelection.has(vertex.getUUID()) &&
        vertex.getMetadata().$kind !== VirtualRetrievalKind
    )
    .map((vertex) => {
      const metadata = vertex.getMetadata();

      // const childrenIds = [];
      const timingInfo = metadata.timingInfo;
      const retrievalId = metadata.retrievalId;
      const kind = metadata.$kind;

      const { elapsedTime = [0], startTime = [0] } = timingInfo;
      const realStart = Math.min(...startTime);
      const realEnd = Math.max(
        ...startTime.map((start, i) => start + elapsedTime[i])
      );
      const realElapsed = realEnd - realStart;

      const radius = computeRadius(realElapsed);
      const yFixed = requireNonNull(depths.get(vertex)) * 150;
      const name =
        kind === AggregateRetrievalKind
          ? `${retrievalId}`
          : `${abbreviation(kind)}#${retrievalId}`;
      return {
        id: vertex.getUUID(),
        name,
        // childrenIds,
        details: {
          startTime: realStart,
          elapsedTime: realElapsed,
          startTimes: startTime,
          elapsedTimes: elapsedTime,
          metadata,
        },
        clusterId: -1, // Set later when computing clusters
        radius,
        yFixed,
        status: leaves.has(vertex) ? "leaf" : roots.has(vertex) ? "root" : null,
      };
    });
}

function linkId(edge: RetrievalEdge) {
  return `${edge.getBegin().getUUID()}#${edge.getEnd().getUUID()}`;
}

/**
 * Builds d3js representation of graph edges.
 * */
function getLinks(
  graph: RetrievalGraph,
  info: { vertexSelection: VertexSelection; edgeSelection: EdgeSelection }
): IntermediateD3Link[] {
  const edgeSelectionTree = new Map<UUID, Set<UUID>>();
  for (const edge of Array.from(info.edgeSelection)) {
    if (!edgeSelectionTree.has(edge.source)) {
      edgeSelectionTree.set(edge.source, new Set<UUID>());
    }
    (edgeSelectionTree.get(edge.source) as Set<UUID>).add(edge.target);
  }
  const isEdgeSelected = (source: UUID, target: UUID) => {
    const subTree = edgeSelectionTree.get(source);
    return Boolean(subTree && subTree.has(target));
  };

  const filteredGraph = graph.filterVertices(
    (vertex) =>
      vertex.getMetadata().$kind !== VirtualRetrievalKind &&
      info.vertexSelection.has(vertex.getUUID())
  );

  const links: IntermediateD3Link[] = [];
  filteredGraph.getVertices().forEach((source) =>
    filteredGraph.getOutgoingEdges(source).forEach((edge) => {
      const target = edge.getEnd();
      if (!isEdgeSelected(source.getUUID(), target.getUUID())) {
        return;
      }
      links.push({
        source: source.getUUID(),
        target: target.getUUID(),
        id: linkId(edge),
        criticalScore: edge.getMetadata().criticalScore,
      });
    })
  );
  return links;
}

/**
 * Replaces UUIDs with numeric ids.
 * */
function normalizeIds(
  nodes: IntermediateD3Node[],
  links: IntermediateD3Link[]
): D3Graph {
  const idMap = new Map(nodes.map((node, index) => [node.id, index]));

  const normalizedNodes: D3Node[] = nodes.map((node, index) => ({
    ...node,
    id: index,
  }));

  const normalizedLinks: D3Link[] = links.map((link): D3Link => {
    const source = requireNonNull(idMap.get(link.source));
    const target = requireNonNull(idMap.get(link.target));
    return {
      ...link,
      source: normalizedNodes[source],
      target: normalizedNodes[target],
      id: `${source}-${target}`,
    };
  });

  return { nodes: normalizedNodes, links: normalizedLinks };
}

/**
 * Given a query plan, build data for d3js.
 */
export function buildD3(
  query: QueryPlan,
  vertexSelection: VertexSelection,
  edgeSelection: EdgeSelection
) {
  const info = { vertexSelection, edgeSelection };
  const { graph } = query;
  const depths = nodeDepths(graph, vertexSelection);
  const nodes = getNodes(graph, info, depths);
  const links = getLinks(graph, info);
  const clusters = addClustersToNodes(query, vertexSelection);
  nodes.forEach((node) => {
    node.clusterId = requireNonNull(clusters.get(node.id));
  });

  return normalizeIds(nodes, links);
}
