/**
 * @param d: a D3 node
 * Return the color of the border of the node according to its state
 */
const outlineColor = d => {
  if (d.isSelected) {
    return "#2E2E2E";
  }
  if (d.childrenIds.length === 0) {
    return "#BFBFBF";
  }
  // node has subqueries
  return "#E0281C";
};

/**
 * @param d: a D3 node
 * Returns the color of the node
 * yellow if node depends on no one
 * orange if is output
 * blue otherwise
 */
const insideColor = d =>
  d.status === "root" ? "#FFD500" : d.status === "leaf" ? "#FC5400" : "#3A83C0";

// enter functions are called when node or link is created
// update functions allows to modify node or links graphic characteritics
// updateGraph is called when D3 clock ticks, and unpdate nodes and links

const enterLink = selection => {
  selection
    .attr("stroke-width", 6)
    .style("stroke", d => (d.critical ? "#b30000" : "#1B1978"))
    .style("opacity", ".8");
};

const updateLink = selection => {
  selection
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);
};

const enterNode = selection => {
  selection
    .select("circle")
    .attr("r", d => Math.max(Math.sqrt(d.radius) * 4, 10))
    .style("fill", d => insideColor(d))
    .style("stroke-width", d => (d.isSelected ? 3 : 1))
    .style("stroke", d => outlineColor(d));

  selection
    .select("text")
    .attr("dy", ".35em")
    .style("transform", "translateX(-50%,-70%");
};

const updateNode = selection => {
  selection
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .select("circle")
    .style("stroke-width", d => (d.isSelected ? 3 : 1))
    .style("stroke", d => outlineColor(d));
};

const updateGraph = selection => {
  selection.selectAll(".node").call(updateNode);
  selection.selectAll(".link").call(updateLink);
};

export { updateGraph, enterLink, updateLink, enterNode, updateNode };
