import { applyOnDAG } from "../dataStructures/graph";
import { filterAndInverse } from "./filterAndInverse";

const setTimeToUnit = (query, graphInfo) => {
  return [...query.graph.getVertices()]
    .map(vertex => vertex.getUUID())
    .filter(vertexId => graphInfo.selection.has(vertexId))
    .reduce((acc, vertexId) => {
      acc.set(vertexId, 0);
      return acc;
    }, new Map());
};

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
const fillTimingInfo = (data, graphInfo) => {
  data.forEach((query, i) => {
    const info = graphInfo[i];
    if (info.selection.size > 0) {
      const starts = setTimeToUnit(query, info);

      const depthMap = nodeDepths(query, info.selection);
      [...query.graph.getVertices()]
        .map(vertex => vertex.getUUID())
        .filter(vertexId => info.selection.has(vertexId))
        .forEach(vertexId => {
          starts.set(vertexId, depthMap.get(vertexId) - 1);
        });

      info.starts = starts;
    }
  });
};

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
    if (node.getMetadata().get("$kind") === "Virtual") {
      return;
    }
    node.getMetadata().set("timingInfo", {
      startTime: [startTime],
      elapsedTime: [elapsedTime]
    });
  });
};

export { fillTimingInfo, setTimeToUnit, nodeDepths, setSimulatedTimingInfo };
