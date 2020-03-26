const setTimeToUnit = query => {
  query.retrievals.forEach(retr => {
    retr.fakeStartTime = 0;
  });
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

const nodesDeepness = query => {
  if (query.retrievals.length === 0) return null;
  const { dependencies } = query;
  const invDependencies = invertDependencies(dependencies);
  const deepness = {
    0: [...invDependencies[-1]]
  };
  const done = [...invDependencies[-1]];
  let toDo = [...new Set(done.map(parent => invDependencies[parent]).flat(2))];
  let currentDeepness = 0;
  while (toDo.length !== 0) {
    currentDeepness += 1;
    deepness[currentDeepness] = [];
    const almostDone = [];
    for (let nodeId = 0; nodeId < toDo.length; nodeId += 1) {
      const node = toDo[nodeId];
      if (dependencies[node].every(parent => done.includes(parent))) {
        deepness[currentDeepness].push(node);
        almostDone.push(node);
      }
    }
    toDo = toDo.filter(node => !almostDone.includes(node));
    toDo.push(...almostDone.map(parent => invDependencies[parent]).flat(2));
    toDo = toDo.filter(node => node !== undefined);
    toDo = [...new Set(toDo)];
    done.push(...almostDone);
  }
  return deepness;
};

// Set timing info to UnitTime for whole json object
const fillTimingInfo = data => {
  data.forEach(query => setTimeToUnit(query));
  data.forEach(query => {
    if (query.retrievals.length > 0) {
      const deepness = nodesDeepness(query);
      query.retrievals.forEach(retr => {
        retr.fakeStartTime = Object.keys(deepness).filter(d =>
          deepness[d].includes(retr.retrId)
        );
      });
    }
  });
};

export { fillTimingInfo, setTimeToUnit, nodesDeepness, invertDependencies };
