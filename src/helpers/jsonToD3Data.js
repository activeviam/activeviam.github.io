const getNodes = dependencies => {
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
