import { BaseType, Selection } from "d3-selection";
import { D3Node } from "../dataStructures/d3/d3Node";
import { D3Link } from "../dataStructures/d3/d3Link";

function getChildrenIds(d: D3Node): number[] {
  if ("childrenIds" in d.details.metadata) {
    return (d.details.metadata.childrenIds || []) as number[];
  }
  return [];
}

/**
 * @param d: a D3 node
 * Return the color of the border of the node according to its state
 */
function outlineColor(d: D3Node) {
  if (getChildrenIds(d).length === 0) {
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

function insideColor(d: D3Node) {
  return NODE_COLOR_MAP.get(d.details.metadata.type) || "grey";
}

// enter functions are called when node or link is created
// update functions allows to modify node or links graphic characteritics
// updateGraph is called when D3 clock ticks, and unpdate nodes and links

function enterLink(
  selection: Selection<SVGLineElement, D3Link, null | BaseType, unknown>
) {
  selection
    .attr("stroke-width", 6)
    .style("stroke", (d) => (d.critical ? "#b30000" : "#1B1978"))
    .style("opacity", ".8");
}

function updateLink(
  selection: Selection<SVGLineElement, D3Link, null | BaseType, unknown>
) {
  selection
    .attr("x1", (d) => `${d.source.x || 0}`)
    .attr("y1", (d) => `${d.source.y || 0}`)
    .attr("x2", (d) => `${d.target.x || 0}`)
    .attr("y2", (d) => `${d.target.y || 0}`);
}

function computeRadius(d: D3Node) {
  return Math.max(Math.sqrt(d.radius) * 4, 10);
}

function enterNode(
  selection: Selection<SVGGElement, D3Node, null | BaseType, unknown>
) {
  selection
    .select<SVGCircleElement>("circle")
    .attr("r", computeRadius)
    .style("fill", (d) => insideColor(d))
    .style("--node-stroke", (d) => outlineColor(d));
  selection
    .select<SVGRectElement>("rect")
    .attr("width", (d) => 2 * computeRadius(d))
    .attr("height", (d) => 2 * computeRadius(d))
    .attr("rx", "3")
    .style("fill", (d) => insideColor(d))
    .style("--node-stroke", (d) => outlineColor(d));

  selection
    .select<SVGTextElement>("text")
    .attr("dy", ".35em")
    .attr("dx", "-0.65em");
}

function rectTranslate(d: D3Node) {
  const r = computeRadius(d);
  return `translate(${(d.x || 0) - r} ${(d.y || 0) - r})`;
}

function updateNode(
  selection: Selection<SVGGElement, D3Node, null | BaseType, unknown>
) {
  selection
    .select<SVGCircleElement>("circle")
    .attr("transform", (d) => `translate(${d.x || 0} ${d.y || 0})`)
    .style("--node-stroke", (d) => outlineColor(d));

  selection
    .select<SVGRectElement>("rect")
    .attr("transform", rectTranslate)
    .style("--node-stroke", (d) => outlineColor(d));

  selection
    .select<SVGTextElement>("text")
    .attr("transform", (d) => `translate(${d.x || 0} ${d.y || 0})`);
}

function updateGraph(
  selection: Selection<SVGSVGElement, undefined, null, undefined>
) {
  selection.selectAll<SVGGElement, D3Node>(".node").call(updateNode);
  selection.selectAll<SVGLineElement, D3Link>(".link").call(updateLink);
}

export { updateGraph, enterLink, updateLink, enterNode, updateNode };
