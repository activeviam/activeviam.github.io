import { fillTimingInfo } from "./fillTimingInfo";

const runTime = retrievals =>
  // Returns the biggest elapsed time in the graph, ie the total runtime of the graph
  Math.max(
    ...retrievals.map(retrieval => {
      const { fakeStartTime, timingInfo } = retrieval;
      if (fakeStartTime !== undefined) return retrieval.fakeStartTime + 1;
      const { elapsedTime = [0], startTime = [0] } = timingInfo;
      return elapsedTime[0] + startTime[0];
    })
  );

const indexInRetrievals = (retrievals, strId) => {
  const id = parseInt(strId, 10);
  // some retrievals might be missing so retrId != retrievals[retrId]
  return retrievals.findIndex(retrieval => retrieval.retrId === id);
};

const getNodes = (dependencies, retrievals) => {
  // ratio of the total runtime of the graph and the height of the SGV
  const ratio = 500 / runTime(retrievals);
  const margin = 10;
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
        partitioning
      } = retrieval;
      const { elapsedTime = [0], startTime = [0] } = timingInfo;
      const realStart = Math.min(...startTime);
      const realElapsed = Math.max(...elapsedTime);

      const start = fakeStartTime !== undefined ? fakeStartTime : realStart;
      const elapsed = fakeStartTime !== undefined ? 1 : realElapsed;

      const radius = (elapsed * ratio) / 2;
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
          partitioning
        },
        radius,
        yFixed: (start + elapsed / 2) * ratio + margin,
        status: dependencies[-1].includes(retrId)
          ? "root"
          : dependencies[retrId]
          ? null
          : "leaf"
      };
    })
    .sort((a, b) => a.id - b.id);
};

const getLinks = (dependencies, retrievals) => {
  const links = [];
  Object.entries(dependencies).forEach(([key, values]) =>
    values.forEach(value => {
      if (key !== "-1") {
        links.push({
          source: indexInRetrievals(retrievals, key),
          target: indexInRetrievals(retrievals, value),
          id: `${key}-${value}`
        });
      }
    })
  );
  return links;
};

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

const parseJson = (jsonObject, type = "default") => {
  const { data } = jsonObject;
  const queries = type === "dev" ? data : filterEmptyTimingInfo(data);
  if (type === "fillTimingInfo" || type === "dev") fillTimingInfo(queries);

  const res = queries.map((query, queryId) => {
    const { planInfo, dependencies, retrievals } = query;

    const nodes = getNodes(dependencies, retrievals, queryId);
    const links = getLinks(dependencies, retrievals);
    return {
      id: queryId,
      parentId: null,
      name: planInfo.clusterMemberId,
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
