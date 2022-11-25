import { filterAndInverse } from "./filterAndInverse";
import { UnionFind } from "../dataStructures/unionFind";
import { Dictionary } from "../dataStructures/dictionary";

const addClustersToNodes = (query, info) => {
  const { invGraph, virtualSource } = filterAndInverse(query.graph, info.selection);
  const unionFind = new UnionFind();

  const vertices = [...invGraph.getVertices()].filter(vertex => vertex !== virtualSource);
  vertices
    .forEach(vertex => [...invGraph.getOutgoingEdges(vertex)]
      .forEach(edge => {
        unionFind.union(edge.getBegin(), edge.getEnd());
      }));

  const dict = new Dictionary();
  const result = new Map();
  vertices.forEach(vertex => {
    const clusterIndex = dict.index(unionFind.find(vertex));
    result.set(vertex.getUUID(), clusterIndex);
  });

  return result;
};

export default addClustersToNodes;
