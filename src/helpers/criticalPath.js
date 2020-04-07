import { nodesDeepness } from "./deepness";

/**
 * @param retrievals: a list of retrievals with timing info
 * @param node: a node id (int or str depending of input format)
 * Returns the max of all elapsed time of the node
 */
const findTime = (retrievals, node) => {
  const nodeId = parseInt(node, 10);
  let elapsed = 0;
  try {
    elapsed = Math.max(
      ...retrievals.find(x => x.retrId === nodeId).timingInfo.elapsedTime
    );
  } catch {
    // timingInfo is likely to be empty
  }
  return elapsed;
};

/**
 * @param query: a query contining dependencies and retrievals
 * @param links: a list of the dependencies links in our graph
 * Compute the critical path of the graph from the dependancies and retrievals
 * For each link of links that is in the critical path, sets critical to true
 */
const criticalPath = (query, links) => {
  const { dependencies, retrievals } = query;
  if (retrievals.length < 2) return;
  const deep2nodes = nodesDeepness(query);
  const critical = {};
  let maxTime = 0;
  let maxNode = null;

  // We compute a critical score for each node, going down from
  // deepness = 0
  Object.keys(deep2nodes)
    .sort()
    .forEach(deep => {
      deep2nodes[deep].forEach(node => {
        if (dependencies[node]) {
          // node has parents so critical = elapsedTime + max critical of parents
          const elapsed = findTime(retrievals, node);
          let maxParentCritical = 0;
          let parent = null;
          dependencies[node].forEach(parentNode => {
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
          const elapsed = findTime(retrievals, node);
          critical[node] = {
            parent: null,
            time: elapsed
          };
        }
      });
    });

  // Recreate path going up from the node with worst critical
  // Set link critical attribute to true if it is in the critical path
  while (critical[maxNode].parent !== null) {
    const source = critical[maxNode].parent;
    const target = maxNode;
    const linkId = `${target}-${source}`;
    links.find(l => l.id === linkId).critical = true;
    maxNode = critical[maxNode].parent;
  }
};

export default criticalPath;
