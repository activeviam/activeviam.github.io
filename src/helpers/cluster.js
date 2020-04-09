import { invertDependencies } from "./fillTimingInfo";
import { filterDependencies } from "./selection";
import * as iterators from "./iterators";

const nodeCluster = (node, clust) => {
  return iterators.forEach(clust.entries(), ([cl, nodes]) =>
    nodes.includes(node) ? cl : undefined
  );
};

const computeClusters = (dependencies, selection) => {
  if (dependencies[-1] === undefined) return new Map();

  const deps = filterDependencies(dependencies, selection);
  const invDep = invertDependencies(deps);
  const clusters = new Map();
  const todo = invDep.get(-1).reduce((acc, node, index) => {
    clusters.set(index, [node]);
    acc.push(node);
    return acc;
  }, []);
  while (todo.length !== 0) {
    const node = todo.shift();
    const clust1 = nodeCluster(node, clusters);
    const nodeDeps = invDep.get(node);
    if (nodeDeps) {
      nodeDeps.forEach(parent => {
        const clust2 = nodeCluster(parent, clusters);
        if (clust2 === undefined) {
          clusters.get(clust1).push(parent);
          todo.push(parent);
        } else if (clust1 !== clust2) {
          clusters.get(clust1).push(...clusters.get(clust2));
          clusters.delete(clust2);
        }
      });
    }
  }

  return clusters;
};

const addClustersToNodes = (query, info) => {
  const clusters = computeClusters(query.dependencies, info.selection);
  // Reverse the mapping
  return iterators.reduce(
    clusters.entries(),
    (acc, [id, ns]) => {
      return ns.reduce((store, node) => {
        return store.set(node, id);
      }, acc);
    },
    new Map()
  );
};

export default addClustersToNodes;
