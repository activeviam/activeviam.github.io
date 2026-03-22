import { BaseType, Selection } from "d3-selection";
import { D3Node } from "../dataStructures/d3/d3Node";
import { D3Link } from "../dataStructures/d3/d3Link";

/**
 * Gets list of query children ids.
 * */
function getChildrenIds(d: D3Node): number[] {
  if ("childrenIds" in d.details.metadata) {
    return (d.details.metadata.childrenIds || []) as number[];
  }
  return [];
}

/**
 * Node outline color.
 * @param d - a D3 node
 * @returns the color of the border of the node according to its state
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
  ["CondensedRetrieval", "#ffff00"],
  ["PartitionCondensedRetrieval", "#999999"],
]);

/**
 * Node background color.
 * */
function backgroundColor(d: D3Node) {
  return NODE_COLOR_MAP.get(d.details.metadata.type) || "grey";
}

// enter functions are called when node or link is created
// update functions allows to modify node or links graphic characteristics
// updateGraph is called when D3 clock ticks, and update nodes and links

function linkColor(d: D3Link, minCriticalScore: number) {
  const normalizedCriticalScore =
    minCriticalScore === 1
      ? 1
      : (d.criticalScore - minCriticalScore) / (1 - minCriticalScore);
  return `hsl(${120 * (1 - normalizedCriticalScore)}, 100%, 40%)`;
}

/**
 * Setup properties of the SVG element corresponding to the graph edge.
 * */
function enterLink(
  selection: Selection<SVGLineElement, D3Link, null | BaseType, unknown>,
  minCriticalScore: number,
) {
  selection
    .attr("stroke-width", 6)
    .style("stroke", (d) => linkColor(d, minCriticalScore))
    .style("opacity", ".8");
}

/**
 * Update properties of the SVG element corresponding to the graph edge.
 * */
function updateLink(
  selection: Selection<SVGLineElement, D3Link, null | BaseType, unknown>,
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

/**
 * Setup properties of the SVG element corresponding to the graph vertex.
 * */
function enterNode(
  selection: Selection<SVGGElement, D3Node, null | BaseType, unknown>,
) {
  selection
    .select<SVGCircleElement>("circle")
    .attr("r", computeRadius)
    .style("fill", (d) => backgroundColor(d))
    .style("--node-stroke", (d) => outlineColor(d));
  selection
    .select<SVGRectElement>("rect")
    .attr("width", (d) => 2 * computeRadius(d))
    .attr("height", (d) => 2 * computeRadius(d))
    .attr("rx", "3")
    .style("fill", (d) => backgroundColor(d))
    .style("--node-stroke", (d) => outlineColor(d));

  selection
    .select<SVGTextElement>("text")
    .attr("dy", ".35em")
    .attr("dx", "-0.65em");
}

/**
 * Curried version of enterNode that accepts a custom color function.
 * @param colorFn - Function to determine node fill color
 * @returns An enter function for D3 selections
 */
function enterNodeWithColor(colorFn: (d: D3Node) => string) {
  return (
    selection: Selection<SVGGElement, D3Node, null | BaseType, unknown>,
  ) => {
    selection
      .select<SVGCircleElement>("circle")
      .attr("r", computeRadius)
      .style("fill", colorFn)
      .style("--node-stroke", (d) => outlineColor(d));
    selection
      .select<SVGRectElement>("rect")
      .attr("width", (d) => 2 * computeRadius(d))
      .attr("height", (d) => 2 * computeRadius(d))
      .attr("rx", "3")
      .style("fill", colorFn)
      .style("--node-stroke", (d) => outlineColor(d));

    selection
      .select<SVGTextElement>("text")
      .attr("dy", ".35em")
      .attr("dx", "-0.65em");
  };
}

function rectTranslate(d: D3Node) {
  const r = computeRadius(d);
  return `translate(${(d.x || 0) - r} ${(d.y || 0) - r})`;
}

/**
 * Update properties of the SVG element corresponding to the graph vertex.
 * */
function updateNode(
  selection: Selection<SVGGElement, D3Node, null | BaseType, unknown>,
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
    .select<SVGPolygonElement>("polygon")
    .attr("transform", (d) => `translate(${d.x || 0} ${d.y || 0})`)
    .style("--node-stroke", (d) => outlineColor(d));

  selection
    .select<SVGTextElement>("text")
    .attr("transform", (d) => `translate(${d.x || 0} ${d.y || 0})`);
}

/**
 * Update properties of SVG elements representing the graph.
 * */
function updateGraph(
  selection: Selection<SVGSVGElement, unknown, null, undefined>,
) {
  selection.selectAll<SVGGElement, D3Node>(".node").call(updateNode);
  selection.selectAll<SVGLineElement, D3Link>(".link").call(updateLink);
}

/**
 * Compute the points for a hexagon SVG polygon.
 * @param radius - The radius of the hexagon (distance from center to vertex)
 * @returns A string suitable for SVG polygon points attribute
 */
function computeHexagonPoints(radius: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2; // Start from top
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(" ");
}

/**
 * Setup properties of the SVG element corresponding to a hexagon graph vertex.
 */
function enterHexagonNode(
  selection: Selection<SVGGElement, D3Node, null | BaseType, unknown>,
) {
  selection
    .select<SVGPolygonElement>("polygon")
    .attr("points", (d) => computeHexagonPoints(computeRadius(d)))
    .style("fill", (d) => backgroundColor(d))
    .style("--node-stroke", (d) => outlineColor(d));

  selection
    .select<SVGTextElement>("text")
    .attr("dy", ".35em")
    .attr("dx", "-0.65em");
}

/**
 * Curried version of enterHexagonNode that accepts a custom color function.
 * @param colorFn - Function to determine node fill color
 * @returns An enter function for D3 selections
 */
function enterHexagonNodeWithColor(colorFn: (d: D3Node) => string) {
  return (
    selection: Selection<SVGGElement, D3Node, null | BaseType, unknown>,
  ) => {
    selection
      .select<SVGPolygonElement>("polygon")
      .attr("points", (d) => computeHexagonPoints(computeRadius(d)))
      .style("fill", colorFn)
      .style("--node-stroke", (d) => outlineColor(d));

    selection
      .select<SVGTextElement>("text")
      .attr("dy", ".35em")
      .attr("dx", "-0.65em");
  };
}

/**
 * Update properties of the SVG element corresponding to a hexagon graph vertex.
 */
function updateHexagonNode(
  selection: Selection<SVGGElement, D3Node, null | BaseType, unknown>,
) {
  selection
    .select<SVGPolygonElement>("polygon")
    .attr("transform", (d) => `translate(${d.x || 0} ${d.y || 0})`)
    .style("--node-stroke", (d) => outlineColor(d));

  selection
    .select<SVGTextElement>("text")
    .attr("transform", (d) => `translate(${d.x || 0} ${d.y || 0})`);
}

export {
  updateGraph,
  enterLink,
  updateLink,
  enterNode,
  enterNodeWithColor,
  updateNode,
  computeHexagonPoints,
  enterHexagonNode,
  enterHexagonNodeWithColor,
  updateHexagonNode,
};
