import { fillTimingInfo, nodeDepths } from "./fillTimingInfo";
import criticalPath from "./criticalPath";
import addClustersToNodes from "./cluster";
import { filterDependencies } from "./selection";
import * as its from "./iterators";

const computeRadius = elapsed => {
  if (elapsed < 5) return 20;
  if (elapsed < 20) return 35;
  if (elapsed < 100) return 50;
  return 65;
};

const getNodes = (dependencies, retrievals, queryId, info, depths) => {
  // Creates a Set containing all nodes present in the dependencies, then converts
  // it to an array and map each node number to its node object. Finally sorts nodes by
  // their id because the links are order dependant.
  return retrievals
    .filter(r => info.selection.has(r.retrId))
    .map(retrieval => {
      const {
        retrId,
        timingInfo,
        type,
        measureProvider,
        measures,
        partitioning,
        location
      } = retrieval;

      const { elapsedTime = [0], startTime = [0] } = timingInfo;
      const realStart = Math.min(...startTime);
      const realEnd = Math.max(
        ...startTime.map((start, i) => start + elapsedTime[i])
      );
      const realElapsed = realEnd - realStart;

      const radius = computeRadius(realElapsed);
      const yFixed = depths.get(retrId) * 150;
      return {
        id: retrId,
        name: retrId.toString(),
        childrenIds: [],
        isSelected: false,
        details: {
          startTime: realStart,
          elapsedTime: realElapsed,
          startTimes: startTime,
          elapsedTimes: elapsedTime,
          type,
          measureProvider,
          measures,
          partitioning,
          location
        },
        clusterId: -1, // Set later when computing clusters
        radius,
        yFixed,
        status: dependencies[-1].includes(retrId)
          ? "leaf"
          : dependencies[retrId]
          ? null
          : "root"
      };
    })
    .sort((a, b) => a.id - b.id);
};

const getLinks = (dependencies, retrievals, info) => {
  const filtered = filterDependencies(dependencies, info.selection);
  const retrIdxs = retrievals
    .filter(r => info.selection.has(r.retrId))
    .reduce((acc, r, i) => acc.set(r.retrId, i), new Map());
  return its.reduce(
    filtered.entries(),
    (result, [key, values]) => {
      if (key === -1) return result;

      const source = retrIdxs.get(key);
      return values.reduce((links, value) => {
        const target = retrIdxs.get(value);
        // The target may have been filtered (NoOp)
        links.push({
          source,
          target,
          id: `${key}-${value}`,
          critical: false // Set later when computing the critical path
        });
        return links;
      }, result);
    },
    []
  );
};

const findChildrenAndParents = (res, queries) => {
  queries.forEach((query, queryId) => {
    const { retrievals } = query;
    retrievals.forEach(retrieval => {
      const { retrId, underlyingDataNodes } = retrieval;
      const node = res
        .find(r => r.id === queryId) // find the good query
        .nodes.find(
          n => n.id === retrId // find the good node
        );
      if (node) {
        node.childrenIds = underlyingDataNodes.map(
          // give it its childrenIds
          name => res.find(x => x.name === name).id
        );
      }

      // give its children their parentId
      underlyingDataNodes.forEach(
        // eslint-disable-next-line no-return-assign
        name => (res.find(x => x.name === name).parentId = queryId)
      );
    });
  });
};

const parseJson = (data, selections) => {
  const graphInfo = selections.map(selection => ({ selection }));
  fillTimingInfo(data, graphInfo);

  const res = data.map((query, queryId) => {
    const { planInfo, dependencies, retrievals } = query;
    const { clusterMemberId, mdxPass } = planInfo;
    const info = graphInfo[queryId];

    const passNumber = parseInt((mdxPass || "_0").split("_")[1], 10);
    const ds = nodeDepths(query, info.selection);
    const depths = ds.reduce((acc, ids, d) => {
      return ids.reduce((store, id) => store.set(id, d), acc);
    }, new Map());
    const nodes = getNodes(dependencies, retrievals, queryId, info, depths);
    const links = getLinks(dependencies, retrievals, info);
    const criticalLinks = criticalPath(query, info);
    links.forEach(link => {
      link.critical = criticalLinks.has(link.id);
    });
    const clusters = addClustersToNodes(query, info);
    nodes.forEach(node => {
      node.clusterId = clusters.get(node.id);
    });

    return {
      id: queryId,
      parentId: null,
      pass: passNumber,
      name: clusterMemberId,
      nodes,
      links,
      info
    };
  });

  findChildrenAndParents(res, data);
  return res;
};

export default parseJson;
