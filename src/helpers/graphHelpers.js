// Node border is a different color if it has subqueries
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

// Node color varies
// yellow if node depends on no one
// orange if is output
// blue otherwise
// Colors from https://observablehq.com/@d3/color-schemes
const nodeColors = new Map([
  ["DistributedAggregatesRetrieval", "#549ce8"],
  ["DistributedPostProcessedRetrieval", "#f28e2c"],
  ["JITPrimitiveAggregatesRetrieval", "#e15759"],
  ["NoOpPrimitiveAggregatesRetrieval", "#76b7b2"],
  ["PostProcessedAggregatesRetrieval", "#59a14f"],
  ["PostProcessedResultsMerger", "#edc949"],
  ["PrimitiveResultsMerger", "#af7aa1"],
  ["RangeSharingPrimitiveAggregatesRetrieval", "#ff9da7"],
  ["RangeSharingLinearPostProcessorAggregatesRetrieval", "#9c755f"],
  ["RangeSharingLinearPostProcessorAggregatesRetrieval", "#bab0ab"]
]);

const insideColor = d => nodeColors.get(d.details.type) || "grey";
// d.status === "root" ? "#FFD500" : d.status === "leaf" ? "#FC5400" : "#3A83C0";

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

const computeRadius = d => Math.max(Math.sqrt(d.radius) * 4, 10);

const enterNode = selection => {
  selection
    .select("circle")
    .attr("r", computeRadius)
    .style("fill", d => insideColor(d))
    .style("stroke-width", d => (d.isSelected ? 3 : 1))
    .style("stroke", d => outlineColor(d));
  selection
    .select("rect")
    .attr("width", d => 2 * computeRadius(d))
    .attr("height", d => 2 * computeRadius(d))
    .attr("rx", "3")
    .style("fill", d => insideColor(d))
    .style("stroke-width", d => (d.isSelected ? 3 : 1))
    .style("stroke", d => outlineColor(d))
    .style("transform", d => {
      const r = computeRadius(d);
      return `translate(-${r}px, -${r}px)`;
    });

  selection
    .select("text")
    .attr("dy", ".35em")
    .attr("dx", "-0.65em");
};

const updateNode = selection => {
  selection
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .select("circle")
    .style("stroke-width", d => (d.isSelected ? 3 : 1))
    .style("stroke", d => outlineColor(d));

  selection
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .select("rect")
    .style("stroke-width", d => (d.isSelected ? 3 : 1))
    .style("stroke", d => outlineColor(d));
};

const updateGraph = selection => {
  selection.selectAll(".node").call(updateNode);
  selection.selectAll(".link").call(updateLink);
};

export { updateGraph, enterLink, updateLink, enterNode, updateNode };
