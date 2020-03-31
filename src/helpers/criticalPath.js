import { nodeDepths } from "./fillTimingInfo";

const findTime = (query, node) => {
  const nodeId = parseInt(node, 10);
  let elapsed = 0;
  try {
    elapsed = Math.max(
      ...query.retrievals.find(x => x.retrId === nodeId).timingInfo.elapsedTime
    );
  } catch {
    // timingInfo is likely to be empty
  }
  return elapsed;
};

const criticalPath = (query, links, info) => {
  if (info.selection.size < 2) return;
  const deep2nodes = nodeDepths(query);
  const invDep = query.dependencies;
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
          if (elapsed + maxParentCritical >= maxTime) {
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
    const linkId = `${target}-${source}`;
    links.find(l => l.id === linkId).critical = true;
    maxNode = critical[maxNode].parent;
  }
};

export default criticalPath;
