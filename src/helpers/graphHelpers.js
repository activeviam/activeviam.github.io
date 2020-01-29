const updateGraph = selection => {
  selection.selectAll(".node").call(updateNode);
  selection.selectAll(".link").call(updateLink);
};

const enterLink = selection => {
  selection
    .attr("stroke-width", 6)
    .style("stroke", "#1B1978")
    .style("opacity", ".8");
};

const updateLink = selection => {
  selection
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.yFixed)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.yFixed);
};

const enterNode = selection => {
  selection
    .select("circle")
    .attr("r", d => d.radius)
    .style("fill", d => d.isRoot ? "#FFD500" : d.isLeaf ? "#FC5400" : "#3A83C0")
    .style("stroke-width", d => (d.isSelected ? 3 : 1))
    .style("stroke", d => (d.isSelected ? "#2E2E2E" : "#BFBFBF"));

  selection
    .select("text")
    .attr("dy", ".35em")
    .style("transform", "translateX(-50%,-70%");
};

const updateNode = selection => {
  selection
    .attr("transform", d => "translate(" + d.x + "," + d.yFixed + ")")
    .select("circle")
    .style("stroke-width", d => d.isSelected ? 3 : 1)
    .style("stroke", d => d.isSelected ? "#2E2E2E" : "#BFBFBF");
};

export { updateGraph, enterLink, updateLink, enterNode, updateNode };
