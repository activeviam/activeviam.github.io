const UnitTime = {
  startTime: [0],
  elapsedTime: [1]
};

// Set timing info to UnitTime for all retrievals
const setTimeToUnit = query => {
  query.retrievals.forEach(retr => {
    retr.timingInfo = { ...UnitTime };
  });
};

const nodesDeepness = query => {
  const invDep = {};
  Object.keys(query.dependencies).forEach(X => {
    const x = parseInt(X, 10);
    if (x !== -1) {
      query.dependencies[x].forEach(y => {
        if (invDep[y]) {
          invDep[y].push(x);
        } else {
          invDep[y] = [x];
        }
      });
    }
  });
  const deep = {};
  let nodes = Object.values(query.dependencies).flat(2);
  nodes = nodes.filter((a, b) => nodes.indexOf(a) === b);
  let next = [];
  query.dependencies[-1].forEach(x => {
    nodes = nodes.filter(y => y !== x);
    deep[x] = 0;
    next.push(...query.dependencies[x]);
  });
  nodes = nodes.filter(x => !next.includes(x));

  let i = 1;
  let temp = [];
  while (next.length !== 0) {
    temp = [];
    const isPb = node => {
      const X = invDep[node].filter(y => next.includes(y)).length === 0
      const Y = invDep[node].filter(y => nodes.includes(y)).length === 0
      return X && Y;
    }
    next.forEach(n => {
      if (isPb(n)) {
        temp.push(n);
      }
    });
    next = next.filter(x => !temp.includes(x));
    // console.log(next)
    temp.forEach(x => {
      deep[x] = i;
      if (query.dependencies[x]) {
        next.push(...query.dependencies[x]);
      }
    });
    nodes = nodes.filter(x => !next.includes(x));
    i += 1;
  }
  return deep;
};

// Set timing info to UnitTime for whole json object
const fillTimingInfo = data => {
  data.forEach(query => setTimeToUnit(query));
  data.forEach(query => {
    const deepness = nodesDeepness(query);
    query.retrievals.forEach(retr => {
      retr.timingInfo.startTime = [deepness[retr.retrId]];
    });
  });
};

export { fillTimingInfo, setTimeToUnit };
