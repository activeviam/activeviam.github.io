import { makeVirtualRetrieval } from "../../graphProcessors/buildGraph";
import { D3Link } from "./d3Link";
import { D3Node } from "./d3Node";

export interface D3Graph {
  nodes: D3Node[];
  links: D3Link[];
}

function splitIntoLayers(graph: D3Graph): D3Node[][] {
  const layersMap = new Map<number, D3Node[]>();
  for (const node of graph.nodes) {
    if (!layersMap.has(node.yFixed)) {
      layersMap.set(node.yFixed, []);
    }
    (layersMap.get(node.yFixed) as D3Node[]).push(node);
  }

  const sortedKeys = Array.from(layersMap.keys()).sort((l, r) => r - l); // Roots has highest Y coordinates

  const layers = sortedKeys.map((key) => layersMap.get(key) as D3Node[]);
  layers.forEach((layer) =>
    layer.sort((lhs, rhs) => {
      return (lhs.x as number) - (rhs.x as number);
    })
  );
  return layers;
}

type ShortEdgesStorage = {
  forward: Map<D3Node, D3Node[]>;
  backward: Map<D3Node, D3Node[]>;
};

function buildShortEdges(
  graph: D3Graph,
  layers: D3Node[][]
): ShortEdgesStorage {
  const forward = new Map<D3Node, D3Node[]>();
  const backward = new Map<D3Node, D3Node[]>();
  graph.nodes.forEach((v) => {
    forward.set(v, []);
    backward.set(v, []);
  });
  const layerIndex = layers
    .map((layer, idx): [number, D3Node[]] => [idx, layer])
    .reduce((map, [idx, layer]) => {
      layer.forEach((node) => map.set(node, idx));
      return map;
    }, new Map<D3Node, number>());

  const registerNode = (node: D3Node, layerIdx: number) => {
    forward.set(node, []);
    backward.set(node, []);
    layerIndex.set(node, layerIdx);
    layers[layerIdx].push(node);
  };

  const registerEdge = (from: D3Node, to: D3Node) => {
    (forward.get(from) as D3Node[]).push(to);
    (backward.get(to) as D3Node[]).push(from);
  };

  graph.links.forEach((edge) => {
    const intermediateNodes = [];
    for (
      let i = (layerIndex.get(edge.source) as number) + 1;
      i < (layerIndex.get(edge.target) as number);
      i++
    ) {
      const fakeNode: D3Node = {
        clusterId: 0,
        details: {
          elapsedTimes: [],
          metadata: makeVirtualRetrieval({
            retrievalId: -999,
            type: "VirtualNode",
          }),
          startTime: 0,
          elapsedTime: 0,
          startTimes: [],
        },
        id: 0,
        name: "",
        radius: 0,
        status: null,
        yFixed: 0,
        x: 0,
      };
      registerNode(fakeNode, i);
      intermediateNodes.push(fakeNode);
    }

    const allNodes = [edge.source, ...intermediateNodes, edge.target];
    for (let i = 1; i < allNodes.length; ++i) {
      registerEdge(allNodes[i - 1], allNodes[i]);
    }
  });

  return { forward, backward };
}

function countCrossings(
  fixedLayer: D3Node[],
  layerToReorder: D3Node[],
  edges: Map<D3Node, D3Node[]>
): number {
  const fixedLayerIndex = new Map(
    fixedLayer.map((node, idx): [D3Node, number] => [node, idx])
  );

  const count = (leftNeighbors: number[], rightNeighbors: number[]) => {
    let result = 0;
    let rightPtr = 0;

    for (const leftValue of leftNeighbors) {
      while (
        rightPtr < rightNeighbors.length &&
        rightNeighbors[rightPtr] < leftValue
      ) {
        ++rightPtr;
      }
      result += rightPtr;
    }

    return result;
  };

  let result = 0;

  const neighbors = layerToReorder.map((node) =>
    (edges.get(node) as D3Node[]).map(
      (neighbor) => fixedLayerIndex.get(neighbor) as number
    )
  );

  for (let i = 0; i < layerToReorder.length; ++i) {
    for (let j = i + 1; j < layerToReorder.length; ++j) {
      result += count(neighbors[i], neighbors[j]);
    }
  }

  return result;
}

function barycenterHeuristicCrossingMinimization(
  fixedLayer: D3Node[],
  layerToReorder: D3Node[],
  edges: Map<D3Node, D3Node[]>
) {
  const fixedLayerIndex = new Map(
    fixedLayer.map((node, idx): [D3Node, number] => [node, idx])
  );
  let crossCount = Number.MAX_SAFE_INTEGER;
  while (true) {
    const newCrossCount = countCrossings(fixedLayer, layerToReorder, edges);
    if (newCrossCount >= crossCount) {
      break;
    }
    crossCount = newCrossCount;

    const orderMap = new Map<D3Node, number>();

    for (let i = 0; i < layerToReorder.length; ++i) {
      const node = layerToReorder[i];
      let xSum = 0;
      let xCount = 0;

      for (const neighbor of edges.get(node) as D3Node[]) {
        xSum += fixedLayerIndex.get(neighbor) as number;
        xCount += 1;
      }

      orderMap.set(node, xCount === 0 ? i : xSum / xCount);
    }

    layerToReorder.sort(
      (lhs, rhs) =>
        (orderMap.get(lhs) as number) - (orderMap.get(rhs) as number)
    );
  }

  const xs = layerToReorder
    .map((node) => node.x)
    .filter((x) => x !== undefined) as number[];
  xs.push(0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs, 200);

  for (let i = 0; i < layerToReorder.length; ++i) {
    layerToReorder[i].x =
      minX + ((maxX - minX) * (i + 1)) / (layerToReorder.length + 1);
    layerToReorder[i].y = layerToReorder[i].yFixed;
  }
}

/**
 * Reorders nodes in graph to minimize edge crosses.
 *
 * The algorithm is taken from:
 * Ismaeel, Alaa. (2012). Dynamic Hierarchical Graph Drawing.
 */
export function untangle(graph: D3Graph) {
  const layers = splitIntoLayers(graph);
  const shortEdges = buildShortEdges(graph, layers);

  for (let pass = 0; pass < 10; ++pass) {
    for (let i = 1; i < layers.length; ++i) {
      barycenterHeuristicCrossingMinimization(
        layers[i - 1],
        layers[i],
        shortEdges.backward
      );
    }
    for (let i = layers.length - 1; i > 0; --i) {
      barycenterHeuristicCrossingMinimization(
        layers[i],
        layers[i - 1],
        shortEdges.forward
      );
    }
  }
}
