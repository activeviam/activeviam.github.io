const runTime = retrievals =>
  // Returns the biggest elapsed time in the graph, ie the total runtime of the graph
  Math.max(...retrievals.map(x => x.timingInfo.elapsedTime[0]));

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
        type,
        measureProvider,
        measures,
        partitioning
      } = retrieval;
      const start = Math.min(...timingInfo.startTime);
      const elapsed = Math.max(...timingInfo.elapsedTime);
      const radius = ((elapsed - start) * ratio) / 2;
      return {
        // id: `${queryId}-${retrId}`, // TODO: see if nodes need a different id
        id: retrId,
        name: retrId.toString(),
        childrenIds: [],
        isSelected: false,
        details: {
          startTime: start,
          elapsedTime: elapsed,
          type,
          measureProvider,
          measures,
          partitioning
        },
        radius,
        yFixed: ((start + elapsed) / 2) * ratio + margin,
        status: dependencies[-1].includes(retrId)
          ? "root"
          : dependencies[retrId]
          ? null
          : "leaf"
      };
    })
    .sort((a, b) => a.id - b.id);
};

const getLinks = dependencies => {
  const links = [];
  Object.entries(dependencies).forEach(([key, values]) =>
    values.forEach(value => {
      if (key !== "-1") {
        links.push({
          source: parseInt(key, 10),
          target: value,
          id: `${key}-${value}`
        });
      }
    })
  );
  return links;
};

const parseJson = jsonObject => {
  const { data: queries } = jsonObject;
  const res = queries.map((query, queryId) => {
    const { planInfo, dependencies, retrievals } = query;
    const nodes = getNodes(dependencies, retrievals, queryId);
    const links = getLinks(dependencies);
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
