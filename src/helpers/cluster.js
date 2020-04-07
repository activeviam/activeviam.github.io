import { invertDependencies } from "./deepness";

/**
 * @param nodeId
 * @param clusters: a dict {clusterId: [nodesId]}
 * Returns a clusterId the node belongs to, or undefined if node has no cluster yet
 */
const nodeCluster = (nodeId, clusters) => {
  return Object.keys(clusters).find(cl => clusters[cl].includes(nodeId));
};

/**
 * @param dependencies: the dependencies relations, as found in a query
 * Returns a repartition of the nodes in dependencies clusters. Two nodes are
 * in the same cluster if the are connected by dependecies
 */
const computeClusters = dependencies => {
  if (dependencies[-1] === undefined) return {};
  const invDep = invertDependencies(dependencies);
  const clust = {};
  const todo = []; // Will contain nodes that havr been given a cluster
  // We first consider that each root of the graph belong to a different cluster
  invDep[-1].forEach((node, index) => {
    clust[index] = [node];
    todo.push(node);
  });
  while (todo.length !== 0) {
    const node = todo.shift();
    const clust1 = nodeCluster(node, clust);
    // if node has children, they should be in clust1
    if (invDep[node]) {
      invDep[node].forEach(parent => {
        // Check if children alredy in cluster. If children in a different cluster,
        // then merge the two clusters beause they are the same
        const clust2 = nodeCluster(parent, clust);
        if (clust2 === undefined) {
          clust[clust1].push(parent);
          todo.push(parent);
        } else if (clust1 !== clust2) {
          clust[clust1].push(...clust[clust2]);
          delete clust[clust2];
        }
      });
    }
  }

  return clust;
};

/**
 * @param dependencies: the dependencies relations, as found in a query
 * @param nodes: the list of nodes we want to attribute cluster to
 * Calcutate a cluster for each nodes, and then set the clusterId attribute
 * for each node in the nodes list
 */
const addClustersToNodes = (dependencies, nodes) => {
  const clust = computeClusters(dependencies);
  Object.keys(clust).forEach((cl, id) => {
    clust[cl].forEach(node => {
      try {
        nodes.find(n => n.id === parseInt(node, 10)).clusterId = id;
      } catch {
        // node in dependencies but not in retrievals...
      }
    });
  });
};

export default addClustersToNodes;
