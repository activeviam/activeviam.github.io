import { fillTimingInfo } from "./fillTimingInfo";
import criticalPath from "./criticalPath";
import addClustersToNodes from "./cluster";

const indexInRetrievals = (retrievals, strId) => {
  const id = parseInt(strId, 10);
  // some retrievals might be missing so retrId != retrievals[retrId]
  return retrievals.findIndex(retrieval => retrieval.retrId === id);
};

const computeRadius = elapsed => {
  if (elapsed < 5) return 20;
  if (elapsed < 20) return 35;
  if (elapsed < 100) return 50;
  return 65;
};

const getNodes = (dependencies, retrievals, queryId, info) => {
  // Creates a Set containing all nodes present in the dependencies, then converts
  // it to an array and map each node number to its node object. Finally sorts nodes by
  // their id because the links are order dependant.
  return retrievals
    .filter(r => info.selection.has(r.retrId))
    .map(retrieval => {
      const fakeStartTime = info.starts.get(retrieval.retrId);
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
      const yFixed = fakeStartTime * 150;
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
  const links = [];
  Object.entries(dependencies).forEach(([key, values]) => {
    if (key !== "-1" && info.selection.has(key)) {
      values
        .filter(value => info.selection.has(value))
        .forEach(value => {
          const target = indexInRetrievals(retrievals, value);
          if (target !== -1) {
            // The target may have been filtered (NoOp)
            links.push({
              source: indexInRetrievals(retrievals, key),
              target,
              id: `${key}-${value}`,
              critical: false
            });
          }
        });
    }
  });
  return links;
};

// Remove nodes without timing info
const filterEmptyTimingInfo = data => {
  return data.map(query => {
    const { retrievals: retrievalsToFilter } = query;

    const selectedIds = retrievalsToFilter
      .filter(retrieval => Object.entries(retrieval.timingInfo).length > 0)
      .map(retrieval => retrieval.retrId);
    return new Set(selectedIds);
  });
};

const findChildrenAndParents = (res, queries) => {
  queries.forEach((query, queryId) => {
    const { retrievals } = query;
    retrievals.forEach(retrieval => {
      const { retrId, underlyingDataNodes } = retrieval;
      res
        .find(r => r.id === queryId) // find the good query
        .nodes.find(
          node => node.id === retrId // find the good node
        ).childrenIds = underlyingDataNodes.map(
        // give it its childrenIds
        name => res.find(x => x.name === name).id
      );

      // give its children their parentId
      underlyingDataNodes.forEach(
        // eslint-disable-next-line no-return-assign
        name => (res.find(x => x.name === name).parentId = queryId)
      );
    });
  });
};

const parseJson = ({ data }, type = "fillTimingInfo") => {
  const selections =
    type === "dev"
      ? new Set(data.map(({ retrievals }) => retrievals.map(r => r.retrId)))
      : filterEmptyTimingInfo(data);
  const graphInfo = selections.map(selection => ({ selection }));
  fillTimingInfo(data, graphInfo);

  const res = data.map((query, queryId) => {
    const { planInfo, dependencies, retrievals } = query;
    const { clusterMemberId, mdxPass } = planInfo;
    const info = graphInfo[queryId];

    const nodes = getNodes(dependencies, retrievals, queryId, info);
    const links = getLinks(dependencies, retrievals, info);
    criticalPath(query, links, info);
    addClustersToNodes(query, nodes, info);
    const passNumber = parseInt((mdxPass || "_0").split("_")[1], 10);

    return {
      id: queryId,
      parentId: null,
      pass: passNumber,
      name: clusterMemberId,
      nodes,
      links
    };
  });

  findChildrenAndParents(res, data, graphInfo);
  return res;
};

export default parseJson;
