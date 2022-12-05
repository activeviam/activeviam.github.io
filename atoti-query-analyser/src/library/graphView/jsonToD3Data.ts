import { nodeDepths } from "../graphProcessors/fillTimingInfo";
import { criticalPath } from "../graphProcessors/criticalPath";
import { addClustersToNodes } from "../graphProcessors/cluster";
import { abbreviation } from "../utilities/textUtils";
import {
  AggregateRetrievalKind,
  RetrievalGraph,
  RetrievalVertex,
  VirtualRetrievalKind,
} from "../dataStructures/json/retrieval";
import { QueryPlan } from "../dataStructures/processing/queryPlan";
import { VertexSelection } from "../dataStructures/processing/selection";
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

function getNodes(
  graph: RetrievalGraph,
  info: { selection: VertexSelection },
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
      (vertex) => Array.from(graph.getOutgoingEdges(vertex)).length === 0
    )
  );

  return Array.from(graph.getVertices())
    .filter(
      (vertex) =>
        info.selection.has(vertex.getUUID()) &&
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
        isSelected: false,
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

function getLinks(
  graph: RetrievalGraph,
  info: { selection: VertexSelection }
): IntermediateD3Link[] {
  const filteredGraph = graph.filterVertices(
    (vertex) =>
      vertex.getMetadata().$kind !== VirtualRetrievalKind &&
      info.selection.has(vertex.getUUID())
  );

  const links: IntermediateD3Link[] = [];
  filteredGraph.getVertices().forEach((source) =>
    filteredGraph.getOutgoingEdges(source).forEach((edge) => {
      const target = edge.getEnd();
      links.push({
        source: source.getUUID(),
        target: target.getUUID(),
        id: `${source.getUUID()}#${target.getUUID()}`,
        critical: false, // Set later when computing the critical path
      });
    })
  );
  return links;
}

function normalizeIds(
  nodes: IntermediateD3Node[],
  links: IntermediateD3Link[]
): D3Graph {
  const idMap = new Map(nodes.map((node, index) => [node.id, index]));

  const normalizedNodes: D3Node[] = nodes.map((node, index) => ({
    ...node,
    id: index,
  }));

  const normalizedLinks: D3Link[] = links.map((link) => {
    const source = requireNonNull(idMap.get(link.source));
    const target = requireNonNull(idMap.get(link.target));
    return {
      ...link,
      source,
      target,
      id: `${source}-${target}`,
    };
  });

  return { nodes: normalizedNodes, links: normalizedLinks };
}

export function buildD3(query: QueryPlan, selection: VertexSelection) {
  const info = { selection };
  const { graph } = query;
  const depths = nodeDepths(graph, selection);
  const nodes = getNodes(graph, info, depths);
  const links = getLinks(graph, info);
  const criticalLinks = criticalPath(graph, selection);
  links.forEach((link) => {
    link.critical = criticalLinks.has(link.id);
  });
  const clusters = addClustersToNodes(query, info.selection);
  nodes.forEach((node) => {
    node.clusterId = requireNonNull(clusters.get(node.id));
  });

  return normalizeIds(nodes, links);
}
