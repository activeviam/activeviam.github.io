const setTimeToUnit = (query, graphInfo) => {
  return query.retrievals
    .filter(r => graphInfo.selection.has(r.retrId))
    .reduce((acc, retr) => {
      acc.set(retr.retrId, 0);
      return acc;
    }, new Map());
};

// dependencies is a dict {son: parents}
// the function returns {parent: sons}
const invertDependencies = dep => {
  const invDep = {};
  const temp = [...dep[-1]];
  const done = [];
  while (temp.length !== 0) {
    const son = temp.shift();
    done.push(son);
    if (dep[son]) {
      dep[son].forEach(parent => {
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

const nodeDepths = query => {
  if (query.retrievals.length === 0) return null;
  const { dependencies } = query;
  const invDependencies = invertDependencies(dependencies);
  const depth = {
    0: [...invDependencies[-1]]
  };
  const done = [...invDependencies[-1]];
  let toDo = [...new Set(done.map(parent => invDependencies[parent]).flat(2))];
  let currentDepth = 0;
  while (toDo.length !== 0) {
    currentDepth += 1;
    depth[currentDepth] = [];
    const almostDone = [];
    for (let nodeId = 0; nodeId < toDo.length; nodeId += 1) {
      const node = toDo[nodeId];
      if (dependencies[node].every(parent => done.includes(parent))) {
        depth[currentDepth].push(node);
        almostDone.push(node);
      }
    }
    toDo = toDo.filter(node => !almostDone.includes(node));
    toDo.push(...almostDone.map(parent => invDependencies[parent]).flat(2));
    toDo = toDo.filter(node => node !== undefined);
    toDo = [...new Set(toDo)];
    done.push(...almostDone);
  }
  return depth;
};

// Set timing info to UnitTime for whole json object
const fillTimingInfo = (data, graphInfo) => {
  data.forEach((query, i) => {
    const info = graphInfo[i];
    if (info.selection.size > 0) {
      const starts = setTimeToUnit(query, info);

      const depth = nodeDepths(query);
      Object.keys(depth).forEach(d => {
        depth[d] = depth[d].map(id => parseInt(id, 10));
      });
      query.retrievals
        .filter(r => info.selection.has(r.retrId))
        .forEach(r => {
          starts.set(
            r.retrId,
            Object.keys(depth).filter(d => depth[d].includes(r.retrId))
          );
        });

      info.starts = starts;
    }
  });
};

export { fillTimingInfo, setTimeToUnit, nodeDepths, invertDependencies };
