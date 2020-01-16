const parseJson = jsonObject => {
  const dependencies = jsonObject.data[0].dependencies;
  const nodes = Object.keys(dependencies).map(key => ({
    name: key,
    id: parseInt(key)
  }));
  nodes.push({
    name: "2",
    id: 2
  });
  nodes.sort((a, b) => a.id - b.id);
  const links = [];
  Object.entries(dependencies).forEach(([key, values]) =>
    values.forEach(value =>
      links.push({ source: parseInt(key) + 1, target: value + 1 })
    )
  );

  return { nodes, links };
};

export default parseJson;
