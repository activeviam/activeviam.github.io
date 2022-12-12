import { applyOnDAG } from "../dataStructures/common/graph";
import { filterAndInverse } from "./filterAndInverse";
import {
  RetrievalGraph,
  RetrievalVertex,
  VirtualRetrievalKind,
} from "../dataStructures/json/retrieval";
import { VertexSelection } from "../dataStructures/processing/selection";

/**
 * Given a DAG, for each vertex find length of the longest path from the vertex
 * to any of the accessible sinks (i.e. vertices without children).
 * */
export function nodeDepths(graph: RetrievalGraph, selection: VertexSelection) {
  const {
    filteredGraph,
    virtualSource,
    virtualTarget,
  }: {
    filteredGraph: RetrievalGraph;
    virtualSource: RetrievalVertex;
    virtualTarget: RetrievalVertex;
  } = filterAndInverse(graph, selection);

  return applyOnDAG(
    filteredGraph,
    virtualSource,
    (
      vertex,
      dependencies,
      childrenValues: (child: RetrievalVertex) => number
    ) => {
      if (vertex === virtualTarget) {
        return -1;
      }
      return 1 + Math.max(...Array.from(dependencies).map(childrenValues));
    }
  );
}

// Set timing info to UnitTime for whole json object
/**
 * Given a DAG, assign synthetic start time to all retrievals w.r.t.
 * dependencies between retrievals.
 */
export function setSimulatedTimingInfo(graph: RetrievalGraph) {
  const virtualSource = graph.getVertexByLabel("virtualSource");
  const virtualTarget = graph.getVertexByLabel("virtualTarget");

  const elapsedTime = 10;
  const startTimeMap = applyOnDAG(
    graph,
    virtualSource,
    (
      vertex,
      dependencies,
      childrenValues: (child: RetrievalVertex) => number
    ): number => {
      if (vertex === virtualTarget) {
        return -elapsedTime;
      }
      const startTimeList = Array.from(dependencies).map(childrenValues);
      return elapsedTime + Math.max(...startTimeList);
    }
  );

  startTimeMap.forEach((startTime, node) => {
    if (node.getMetadata().$kind === VirtualRetrievalKind) {
      return;
    }
    node.getMetadata().timingInfo = {
      startTime: [startTime],
      elapsedTime: [elapsedTime],
    };
  });
}
