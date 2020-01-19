const getNodes = dependencies => {
  // Creates a Set containing all nodes present in the dependencies, then converts it to an array and map each
  // node number to its node object. Finally sorts nodes by their id because the links are order dependant.
  return [
    ...new Set(
      Object.entries(dependencies)
        .flat(2)
        .map(x => parseInt(x))
    )
  ]
    .map(x => ({ name: x.toString(), id: x, isSelected: false }))
    .sort((a, b) => a.id - b.id);
};

const getLinks = dependencies => {
  const links = [];
  Object.entries(dependencies).forEach(([key, values]) =>
    values.forEach(value =>
      // Since there is a '-1' node, the node of key 0 will actually have an index of 1 in the 'nodes' array (ie +1).
      links.push({ source: parseInt(key) + 1, target: value + 1 })
    )
  );
  return links;
};

const parseJson = jsonObject => {
  const dependencies = jsonObject.data[0].dependencies;
  const nodes = getNodes(dependencies);
  const links = getLinks(dependencies);
  return { nodes, links };
};

export default parseJson;
