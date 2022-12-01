import { applyOnDAG } from "../dataStructures/common/graph";
import { filterAndInverse } from "./filterAndInverse";
import { VirtualRetrievalKind } from "../dataStructures/json/retrieval";

const nodeDepths = (query, selection) => {
  const { filteredGraph, virtualSource, virtualTarget } = filterAndInverse(query.graph, selection);

  return applyOnDAG(filteredGraph, virtualSource, (vertex, dependencies, acc) => {
    if (vertex === virtualTarget) {
      return -1;
    }
    return 1 + Math.max(...[...dependencies].map(dep => acc.get(dep)));
  });
};

// Set timing info to UnitTime for whole json object
const setSimulatedTimingInfo = (graph) => {
  const virtualSource = graph.getVertexByLabel("virtualSource");
  const virtualTarget = graph.getVertexByLabel("virtualTarget");

  const elapsedTime = 10;
  const startTimeMap = applyOnDAG(
    graph,
    virtualSource,
    (vertex, dependencies, startTime) => {
      if (vertex === virtualTarget) {
        return -elapsedTime;
      }
      const startTimeList = [...dependencies].map(dep => startTime.get(dep));
      return elapsedTime + Math.max(...startTimeList);
    });

  startTimeMap.forEach((startTime, node) => {
    if (node.getMetadata().$kind === VirtualRetrievalKind) {
      return;
    }
    node.getMetadata().timingInfo = {
      startTime: [startTime],
      elapsedTime: [elapsedTime]
    };
  });
};

export { nodeDepths, setSimulatedTimingInfo };
