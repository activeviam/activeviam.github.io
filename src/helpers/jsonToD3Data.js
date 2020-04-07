import { computeDeepness } from "./deepness";
import criticalPath from "./criticalPath";
import addClustersToNodes from "./cluster";

const indexInRetrievals = (retrievals, strId) => {
  const id = parseInt(strId, 10);
  // some retrievals might be missing so retrId != retrievals[retrId]
  return retrievals.findIndex(retrieval => retrieval.retrId === id);
};

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

/**
 * @param dependencies: dependencies of the request
 * @param retrievals: retrievals of the request
 * Returns a list of the request nodes we will later pass to D3
 * Keeps all node information from retrievals and dependencies we might need
 * Nodes are sorted by id
 */
const getNodes = (dependencies, retrievals) => {
  return retrievals
    .map(retrieval => {
      const {
        retrId,
        timingInfo,
        deepness,
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
      const yFixed = deepness * 150;
      return {
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
        clusterId: 0,
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

/**
 * @param dependencies: dependencies of the request
 * @param retrievals: retrievals of the request
 * Returns a list of the request dependencies links we will later pass to D3
 */
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

/**
 * @param data: a request object a user gave the app
 * Some nodes does not contain information for the user. In the case we do
 * not want to consider them, this funtion removes them
 */
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

/**
 * @param res: transformed query
 * @param queries: initial query
 * In order to navigate in distributed query, we need:
 *   - for each node with underlyingGraphe, the id of the graph
 *   - for each underlying graph, the id of the graph with the parent node
 */
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

/**
 * @param jsonObject: a request a user gave the app, on json format
 * @param type: how the user wants to see the graph (classic or dev)
 * Returns a transformed version of the input we will be able to manipulate and give to D3
 */
const parseJson = (jsonObject, type = "classic") => {
  const { data } = jsonObject;
  const queries = type === "dev" ? data : filterEmptyTimingInfo(data);
  computeDeepness(queries);

  const res = queries.map((query, queryId) => {
    const { planInfo, dependencies, retrievals } = query;
    const { clusterMemberId, mdxPass } = planInfo;

    const nodes = getNodes(dependencies, retrievals, queryId);
    const links = getLinks(dependencies, retrievals);
    criticalPath(query, links);
    addClustersToNodes(dependencies, nodes);
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

  findChildrenAndParents(res, queries);
  return res;
};

export default parseJson;
