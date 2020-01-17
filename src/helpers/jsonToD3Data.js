import {dependencies} from "d3/dist/package";

const getNodes = dependencies => {
  const nodes = Object.keys(dependencies).map(key => ({
    name: key,
    id: parseInt(key)
  }));
  nodes.push({
    name: "2",
    id: 2
  });
  nodes.sort((a, b) => a.id - b.id);
  return nodes;
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
