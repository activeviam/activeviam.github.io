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

const getNodes = (dependencies, retrievals) => {
  // Creates a Set containing all nodes present in the dependencies, then converts
  // it to an array and map each node number to its node object. Finally sorts nodes by
  // their id because the links are order dependant.
  return retrievals
    .map(retrieval => {
      const {
        retrId,
        timingInfo,
        fakeStartTime,
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
        // id: `${queryId}-${retrId}`, // TODO: see if nodes need a different id
        id: retrId,
        name: retrId.toString(),
        childrenIds: [],
        isSelected: false,
        details: {
          startTime: realStart,
          elapsedTime: realElapsed,
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

const getLinks = (dependencies, retrievals) => {
  const links = [];
  Object.entries(dependencies).forEach(([key, values]) => {
    if (key !== "-1") {
      values.forEach(value => {
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
    const {
      planInfo,
      dependencies: dependenciesToFilter,
      retrievals: retrievalsToFilter
    } = query;

    const retrIdToRemove = retrievalsToFilter
      .filter(retrieval => Object.entries(retrieval.timingInfo).length === 0)
      .map(retrieval => retrieval.retrId);

    const retrievals = retrievalsToFilter.filter(
      retrieval => Object.entries(retrieval.timingInfo).length > 0
    );
    const dependencies = Object.fromEntries(
      Object.entries(dependenciesToFilter).map(([key, values]) => [
        key,
        values.filter(value => !retrIdToRemove.includes(value))
      ])
    );

    return { planInfo, dependencies, retrievals };
  });
};

const parseJson = (jsonObject, type = "fillTimingInfo") => {
  const { data } = jsonObject;
  const queries = type === "dev" ? data : filterEmptyTimingInfo(data);
  fillTimingInfo(queries);

  const res = queries.map((query, queryId) => {
    const { planInfo, dependencies, retrievals } = query;
    const { clusterMemberId, mdxPass } = planInfo;

    const nodes = getNodes(dependencies, retrievals, queryId);
    const links = getLinks(dependencies, retrievals);
    criticalPath(query, links);
    addClustersToNodes(query, nodes);

    let passNumber = 0;
    try {
      passNumber = parseInt(mdxPass.split("_")[1], 10);
    } catch {
      // pass number is not present in mdxPass
    }

    return {
      id: queryId,
      parentId: null,
      pass: passNumber,
      name: clusterMemberId,
      nodes,
      links
    };
  });
  // Now take care of distributed queries
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

      underlyingDataNodes.forEach(
        // eslint-disable-next-line no-return-assign
        name => (res.find(x => x.name === name).parentId = queryId)
      );
    });
  });
  return res;
};

export default parseJson;
