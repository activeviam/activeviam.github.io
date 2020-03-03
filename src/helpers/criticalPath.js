import { nodesDeepness, invertDependencies } from "./fillTimingInfo";

const findTime = (query, node) => {
  const nodeId = parseInt(node, 10);
  const elapsed = Math.max(
    ...query.retrievals.find(x => x.retrId === nodeId).timingInfo.elapsedTime
  );
  return elapsed;
};

const invertDeepness = nodes2deep => {
  const deep2nodes = {};
  Object.keys(nodes2deep).forEach(node => {
    const deep = nodes2deep[node];
    if (deep2nodes[deep]) {
      deep2nodes[deep].push(node);
    } else {
      deep2nodes[deep] = [node];
    }
  });
  return deep2nodes;
};

const criticalPath = (query, links) => {
  const nodes2deep = nodesDeepness(query);
  const deep2nodes = invertDeepness(nodes2deep);
  const invDep = invertDependencies(query.dependencies);
  const critical = {};
  let maxTime = 0;
  let maxNode = null;
  Object.keys(deep2nodes)
    .sort()
    .forEach(deep => {
      deep2nodes[deep].forEach(node => {
        if (invDep[node]) {
          // node has parents so critical = elapsedTime + max critical of parents
          const elapsed = findTime(query, node);
          let maxParentCritical = 0;
          let parent = null;
          invDep[node].forEach(parentNode => {
            if (critical[parentNode].time >= maxParentCritical) {
              maxParentCritical = critical[parentNode].time;
              parent = parentNode;
            }
          });
          critical[node] = {
            parent,
            time: elapsed + maxParentCritical
          };
          if (elapsed + maxParentCritical > maxTime) {
            maxTime = elapsed + maxParentCritical;
            maxNode = node;
          }
        } else {
          // node has no parent so critical = elapsedTime
          const elapsed = findTime(query, node);
          critical[node] = {
            parent: null,
            time: elapsed
          };
        }
      });
    });
  while (critical[maxNode].parent !== null) {
    const source = critical[maxNode].parent;
    const target = maxNode;
    const linkId = `${source}-${target}`;
    links.find(l => l.id === linkId).critical = true;
    maxNode = critical[maxNode].parent;
  }
};

export default criticalPath;
