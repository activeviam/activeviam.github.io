import { BaseType, Selection } from "d3-selection";

/**
 * @param d: a D3 node
 * Return the color of the border of the node according to its state
 */
function outlineColor(d: any) {
  if (d.isSelected) {
    return "#2E2E2E";
  }
  if ((d.childrenIds || []).length === 0) {
    return "#BFBFBF";
  }
  // node has subqueries
  return "#E0281C";
}

// Node color varies
// yellow if node depends on no one
// orange if is output
// blue otherwise
// Colors from https://observablehq.com/@d3/color-schemes
const NODE_COLOR_MAP = new Map([
  ["DistributedAggregatesRetrieval", "#549ce8"],
  ["DistributedPostProcessedRetrieval", "#f28e2c"],
  ["JITPrimitiveAggregatesRetrieval", "#e15759"],
  ["NoOpPrimitiveAggregatesRetrieval", "#76b7b2"],
  ["PostProcessedAggregatesRetrieval", "#59a14f"],
  ["PostProcessedResultsMerger", "#edc949"],
  ["PrimitiveResultsMerger", "#af7aa1"],
  ["RangeSharingPrimitiveAggregatesRetrieval", "#ff9da7"],
  ["RangeSharingLinearPostProcessorAggregatesRetrieval", "#9c755f"],
  ["RangeSharingLinearPostProcessorAggregatesRetrieval", "#bab0ab"],
]);

function insideColor(d: any) {
  return NODE_COLOR_MAP.get(d.details.metadata.type) || "grey";
}

// enter functions are called when node or link is created
// update functions allows to modify node or links graphic characteritics
// updateGraph is called when D3 clock ticks, and unpdate nodes and links

function enterLink(selection: Selection<any, any, any, any>) {
  selection
    .attr("stroke-width", 6)
    .style("stroke", (d) => (d.critical ? "#b30000" : "#1B1978"))
    .style("opacity", ".8");
}

function updateLink(selection: Selection<BaseType, any, BaseType, any>) {
  selection
    .attr("x1", (d) => d.source.x)
    .attr("y1", (d) => d.source.y)
    .attr("x2", (d) => d.target.x)
    .attr("y2", (d) => d.target.y);
}

function computeRadius(d: { radius: number }) {
  return Math.max(Math.sqrt(d.radius) * 4, 10);
}

function enterNode(selection: Selection<BaseType, any, HTMLElement, any>) {
  selection
    .select("circle")
    .attr("r", computeRadius)
    .style("fill", (d) => insideColor(d))
    .style("stroke-width", (d) => (d.isSelected ? 3 : 1))
    .style("stroke", (d) => outlineColor(d));
  selection
    .select("rect")
    .attr("width", (d) => 2 * computeRadius(d))
    .attr("height", (d) => 2 * computeRadius(d))
    .attr("rx", "3")
    .style("fill", (d) => insideColor(d))
    .style("stroke-width", (d) => (d.isSelected ? 3 : 1))
    .style("stroke", (d) => outlineColor(d))
    .style("transform", (d) => {
      const r = computeRadius(d);
      return `translate(-${r}px, -${r}px)`;
    });

  selection.select("text").attr("dy", ".35em").attr("dx", "-0.65em");
}

function updateNode(selection: Selection<BaseType, any, BaseType, unknown>) {
  selection
    .attr("transform", (d) => `translate(${d.x},${d.y})`)
    .select("circle")
    .style("stroke-width", (d) => (d.isSelected ? 3 : 1))
    .style("stroke", (d) => outlineColor(d));

  selection
    .attr("transform", (d) => `translate(${d.x},${d.y})`)
    .select("rect")
    .style("stroke-width", (d) => (d.isSelected ? 3 : 1))
    .style("stroke", (d) => outlineColor(d));
}

function updateGraph(
  selection: Selection<BaseType, unknown, HTMLElement, any>
) {
  selection.selectAll(".node").call(updateNode);
  selection.selectAll(".link").call(updateLink);
}

export { updateGraph, enterLink, updateLink, enterNode, updateNode };
