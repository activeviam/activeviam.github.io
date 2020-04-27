import { nodeDepths } from "./fillTimingInfo";
import { filterDependencies } from "./selection";

/**
 * @param query: query with the list of retrievals with timing info
 * @param node: a node id (int or str depending of input format)
 * Returns the max of all elapsed time of the node
 */
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

const criticalPath = (query, info) => {
  if (info.selection.size < 2) return new Set();

  const deep2nodes = nodeDepths(query, info.selection);
  const invDep = filterDependencies(query.dependencies, info.selection);
  const critical = {};
  let maxTime = 0;
  let maxNode = null;

  // We compute a critical score for each node, going down from depth == 0
  deep2nodes.forEach(nodes => {
    if (nodes === undefined) return;

    nodes.forEach(node => {
      const deps = invDep.get(node);
      if (deps) {
        // node has parents so critical = elapsedTime + max critical of parents
        const elapsed = findTime(query, node);
        let maxParentCritical = 0;
        let parent = null;
        deps.forEach(parentNode => {
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

  // Recreate path going up from the node with worst critical and collect link ids
  const criticalLinks = new Set();
  while (critical[maxNode].parent !== null) {
    const source = critical[maxNode].parent;
    const target = maxNode;
    criticalLinks.add(`${target}-${source}`);
    maxNode = critical[maxNode].parent;
  }

  return criticalLinks;
};

export default criticalPath;
