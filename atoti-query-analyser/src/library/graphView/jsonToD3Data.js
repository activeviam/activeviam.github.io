import { nodeDepths } from "../graphProcessors/fillTimingInfo";
import { criticalPath } from "../graphProcessors/criticalPath";
import { addClustersToNodes } from "../graphProcessors/cluster";
import { abbreviation } from "../utilities/textUtils";
import { AggregateRetrievalKind, VirtualRetrievalKind } from "../dataStructures/json/retrieval";

/**
 * @param elapsed: the elapsed time of a node
 * Returns the radius the node should be displayed with
 */
const computeRadius = elapsed => {
  if (elapsed < 5) return 20;
  if (elapsed < 20) return 35;
  if (elapsed < 100) return 50;
  return 65;
};

const getNodes = (graph, info, depths) => {
  // Creates a Set containing all nodes present in the dependencies, then converts
  // it to an array and map each node number to its node object.

  const virtualSource = graph.getVertexByLabel("virtualSource");
  const leaves = new Set([...graph.getOutgoingEdges(virtualSource)].map(edge => edge.getEnd()));
  const roots = new Set(
    [...graph.getVertices()].filter(vertex => [...graph.getOutgoingEdges(vertex)].length === 0)
  );

  return [...graph.getVertices()]
    .filter(vertex => info.selection.has(vertex.getUUID()) && vertex.getMetadata().$kind !== VirtualRetrievalKind)
    .map(vertex => {
      const metadata = vertex.getMetadata();

      const childrenIds = metadata.childrenIds || [];
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
      const yFixed = depths.get(vertex) * 150;
      const name = kind === AggregateRetrievalKind ? `${retrievalId}` : `${abbreviation(kind)}#${retrievalId}`;
      return {
        id: vertex.getUUID(),
        name,
        childrenIds,
        isSelected: false,
        details: {
          startTime: realStart,
          elapsedTime: realElapsed,
          startTimes: startTime,
          elapsedTimes: elapsedTime,
          metadata
        },
        clusterId: -1, // Set later when computing clusters
        radius,
        yFixed,
        status: leaves.has(vertex)
          ? "leaf"
          : roots.has(vertex)
            ? "root"
            : null
      };
    });
};

const getLinks = (graph, info) => {
  const filteredGraph = graph.filterVertices(vertex => vertex.getMetadata().$kind !== VirtualRetrievalKind && info.selection.has(vertex.getUUID()));

  const links = [];
  [...filteredGraph.getVertices()]
    .forEach((source) => [...filteredGraph.getOutgoingEdges(source)]
      .forEach(edge => {
        const target = edge.getEnd();
        links.push({
          source: source.getUUID(),
          target: target.getUUID(),
          id: `${source.getUUID()}#${target.getUUID()}`,
          critical: false // Set later when computing the critical path
        });
      }));
  return links;
};

const findChildrenAndParents = (res, queries) => {
  const resIndexByName = new Map(res.map(queryInfo => ([queryInfo.name, queryInfo])));

  queries.forEach((query, queryId) => {
    const { graph } = query;
    [...graph.getVertices()].forEach(vertex => {
      const underlyingDataNodes = vertex.getMetadata().underlyingDataNodes;

      if (underlyingDataNodes === undefined) {
        return;
      }

      vertex.getMetadata().childrenIds = underlyingDataNodes.map(
        name => resIndexByName.get(name).id
      );

      // give its children their parentId
      underlyingDataNodes.forEach(name => {
        resIndexByName.get(name).parentId = queryId;
      });
    });
  });
};

const normalizeIds = ({ nodes, links }) => {
  const idMap = new Map(nodes.map((node, index) => ([node.id, index])));

  nodes.forEach((node, index) => {
    node.id = index;
  });

  links.forEach(link => {
    link.source = idMap.get(link.source);
    link.target = idMap.get(link.target);
    link.id = `${link.source}-${link.target}`;
  });

  return { nodes, links };
};

const buildD3 = (query, selection) => {
  const info = { selection };
  const { graph } = query;
  const depths = nodeDepths(graph, selection);
  const nodes = getNodes(graph, info, depths);
  const links = getLinks(graph, info);
  const criticalLinks = criticalPath(graph, selection);
  links.forEach(link => {
    link.critical = criticalLinks.has(link.id);
  });
  const clusters = addClustersToNodes(query, info.selection);
  nodes.forEach(node => {
    node.clusterId = clusters.get(node.id);
  });

  return normalizeIds({ nodes, links });
};

const parseJson = (data, selections) => {
  const res = data.map((query, queryId) => {
    const { planInfo } = query;
    const { clusterMemberId, mdxPass } = planInfo;

    const passInfo = (mdxPass || "Select_0").split("_");
    const passNumber = parseInt(passInfo[1], 10);
    return {
      id: queryId,
      parentId: null,
      passType: passInfo[0],
      pass: passNumber,
      name: clusterMemberId
    };
  });

  findChildrenAndParents(res, data);
  return res;
};

export default parseJson;
export { buildD3 };
