import { RetrievalGraph } from "../dataStructures/json/retrieval";
import { filterAndInverse } from "./filterAndInverse";
import { UnionFind } from "../dataStructures/common/unionFind";
import { Dictionary } from "../dataStructures/common/dictionary";
import { UUID } from "../utilities/uuid";
import { VertexSelection } from "../dataStructures/processing/selection";

/**
 * Find connectivity components and mark each node with component id.
 * @returns Map from vertex id to component id.
 * */
export function addClustersToNodes(
  graph: RetrievalGraph,
  selection: VertexSelection
): Map<UUID, number> {
  const { invGraph, virtualSource } = filterAndInverse(graph, selection);
  const unionFind = new UnionFind();

  const vertices = Array.from(invGraph.getVertices()).filter(
    (vertex) => vertex !== virtualSource
  );
  vertices.forEach((vertex) =>
    invGraph.getOutgoingEdges(vertex).forEach((edge) => {
      unionFind.union(edge.getBegin(), edge.getEnd());
    })
  );

  const dict = new Dictionary();
  const result = new Map();
  vertices.forEach((vertex) => {
    const clusterIndex = dict.index(unionFind.find(vertex));
    result.set(vertex.getUUID(), clusterIndex);
  });

  return result;
}
