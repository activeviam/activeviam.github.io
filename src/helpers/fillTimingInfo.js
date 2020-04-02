import { filterDependencies } from "./selection";

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
  const invDep = new Map();
  const temp = [...dep.get(-1)];
  const done = [];
  while (temp.length !== 0) {
    const son = temp.shift();
    done.push(son);
    if (dep.has(son)) {
      dep.get(son).forEach(parent => {
        if (!done.includes(parent) && !temp.includes(parent)) temp.push(parent);
        try {
          invDep.get(parent).push(son);
        } catch {
          invDep.set(parent, [son]);
        }
      });
    } else {
      try {
        invDep.get(-1).push(son);
      } catch {
        invDep.set(-1, [son]);
      }
    }
  }
  return invDep;
};

const nodeDepths = (query, selection) => {
  if (selection.size === 0) return null;

  const dependencies = filterDependencies(query.dependencies, selection);
  const invDependencies = invertDependencies(dependencies);
  const depth = [[...invDependencies.get(-1)]];
  const done = [...invDependencies.get(-1)];
  let toDo = [
    ...new Set(done.map(parent => invDependencies.get(parent)).flat(2))
  ];
  let currentDepth = 0;
  while (toDo.length !== 0) {
    currentDepth += 1;
    depth[currentDepth] = [];
    const almostDone = [];
    for (let nodeId = 0; nodeId < toDo.length; nodeId += 1) {
      const node = toDo[nodeId];
      if (dependencies.get(node).every(parent => done.includes(parent))) {
        depth[currentDepth].push(node);
        almostDone.push(node);
      }
    }
    toDo = toDo.filter(node => !almostDone.includes(node));
    toDo.push(...almostDone.map(parent => invDependencies.get(parent)).flat(2));
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

      const depth = nodeDepths(query, info.selection).map(rs =>
        rs.map(id => parseInt(id, 10))
      );
      query.retrievals
        .filter(r => info.selection.has(r.retrId))
        .forEach(r => {
          starts.set(
            r.retrId,
            depth.filter(rs => rs.includes(r.retrId)).map((_, d) => d)
          );
        });

      info.starts = starts;
    }
  });
};

export { fillTimingInfo, setTimeToUnit, nodeDepths, invertDependencies };
