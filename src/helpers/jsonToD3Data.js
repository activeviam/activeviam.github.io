const runTime = retrievals =>
  // Returns the biggest elapsed time in the graph, ie the total runtime of the graph
  Math.max(...retrievals.map(x => x.timingInfo.elapsedTime[0]));

const getNodes = (dependencies, retrievals) => {
  // ratio of the total runtime of the graph and the height of the SGV
  const ratio = 500 / runTime(retrievals);
  const margin = 10;
  // Creates a Set containing all nodes present in the dependencies, then converts it to an array and map each
  // node number to its node object. Finally sorts nodes by their id because the links are order dependant.
  return [
    ...new Set(
      Object.entries(dependencies)
        .map(x => x[1])
        .flat(1)
        .map(x => parseInt(x, 10))
    )
  ]
    .map(x => {
      const retr = retrievals.filter(r => r.retrId === x)[0];
      const start = Math.min(...retr.timingInfo.startTime);
      const elapsed = Math.max(...retr.timingInfo.elapsedTime);
      return {
        name: x.toString(),
        id: x,
        isSelected: false,
        radius: ((elapsed - start) * ratio) / 2,
        yFixed: ((start + elapsed) / 2) * ratio + margin,
        isRoot: dependencies[-1].includes(x),
        isLeaf: !dependencies[x]
      };
    })
    .sort((a, b) => a.id - b.id);
};

const getLinks = dependencies => {
  const links = [];
  Object.entries(dependencies).forEach(([key, values]) =>
    values.forEach((value, index) => {
      if (key !== "-1") {
        links.push({
          source: parseInt(key, 10),
          target: value,
          id: index
        });
      }
    })
  );
  return links;
};

const parseJson = jsonObject => {
  const dependencies = jsonObject.data[0].dependencies;
  const retrievals = jsonObject.data[0].retrievals;

  const nodes = getNodes(dependencies, retrievals);
  const links = getLinks(dependencies);

  return { nodes, links };
};

export default parseJson;
