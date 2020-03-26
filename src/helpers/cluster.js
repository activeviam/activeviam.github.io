import { invertDependencies } from "./fillTimingInfo";

const nodeCluster = (node, clust) => {
  return Object.keys(clust).find(cl => clust[cl].includes(node));
};

const clusters = dependencies => {
  if (dependencies[-1] === undefined) return {};
  const invDep = invertDependencies(dependencies);
  const clust = {};
  const todo = [];
  invDep[-1].forEach((node, index) => {
    clust[index] = [node];
    todo.push(node);
  });
  while (todo.length !== 0) {
    const node = todo.shift();
    const clust1 = nodeCluster(node, clust);
    if (invDep[node]) {
      invDep[node].forEach(parent => {
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

const addClustersToNodes = (query, nodes) => {
  const clust = clusters(query.dependencies);
  Object.keys(clust).forEach((cl, id) => {
    clust[cl].forEach(node => {
      nodes.find(n => n.id === node).clusterId = id;
    });
  });
};

export default addClustersToNodes;
