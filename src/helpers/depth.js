/**
 * @param dependencies: nodes dependencies, as found in querry
 * In a query, dependencies list for each nodes, the nodes it depends on
 * Returns invDep, which list for each nodes, the nodes that depends on it
 */
const invertDependencies = dependencies => {
  const invDep = {};
  const temp = [...dependencies[-1]];
  const done = [];
  while (temp.length !== 0) {
    const son = temp.shift();
    done.push(son);
    if (dependencies[son]) {
      dependencies[son].forEach(parent => {
        if (!done.includes(parent) && !temp.includes(parent)) temp.push(parent);
        try {
          invDep[parent].push(son);
        } catch {
          invDep[parent] = [son];
        }
      });
    } else {
      try {
        invDep[-1].push(son);
      } catch {
        invDep[-1] = [son];
      }
    }
  }
  return invDep;
};

/**
 * @param query: a query contining dependencies and retrievals
 * Depth of a node: a node must be depth than the nodes it depends on
 * Nodes that depend on no other (roots) are at a 0 depth
 * Returns a dict of depth, key is depth and value nodes at this depth
 */
const nodesDepth = query => {
  const { dependencies, retrievals } = query;
  if (retrievals.length === 0) return null;
  const invDependencies = invertDependencies(dependencies);
  const depth = {
    0: [...invDependencies[-1]]
  };
  // list of nodes we gave a depth
  const done = [...invDependencies[-1]];
  // list of children of nodes we just gave depth
  let toDo = [...new Set(done.map(parent => invDependencies[parent]).flat(2))];
  let currentDepth = 0;
  while (toDo.length !== 0) {
    currentDepth += 1;
    depth[currentDepth] = [];
    // list of nodes that will be at depth currentDepth
    const almostDone = [];
    for (let nodeId = 0; nodeId < toDo.length; nodeId += 1) {
      const node = toDo[nodeId];
      // Check that each parent has depth. In this case we can say that node
      // is at depth currentDepth
      if (dependencies[node].every(parent => done.includes(parent))) {
        depth[currentDepth].push(node);
        almostDone.push(node);
      }
    }
    // remove nodes we just classified and put them in done, add their children in toDo,
    // remove duplicates and false nodes
    toDo = toDo.filter(node => !almostDone.includes(node));
    toDo.push(...almostDone.map(parent => invDependencies[parent]).flat(2));
    toDo = toDo.filter(node => node !== undefined);
    toDo = [...new Set(toDo)];
    done.push(...almostDone);
  }
  return depth;
};

/**
 * @param data: a list of query the user gave the app
 * For each query of data, compute the depth of each node
 * The graph displays nodes according to their depth, the y coordinate
 * of each node will be propotional to the depth
 */
const computeDepth = data => {
  data.forEach(query => {
    if (query.retrievals.length === 0) return;
    const depth = nodesDepth(query);
    // Take care of id being sometine int or str due to input format
    Object.keys(depth).forEach(d => {
      depth[d] = depth[d].map(id => parseInt(id, 10));
    });
    query.retrievals.forEach(retr => {
      retr.depth = Object.keys(depth).filter(d =>
        depth[d].includes(retr.retrId)
      );
    });
  });
};

export { computeDepth, nodesDepth, invertDependencies };
