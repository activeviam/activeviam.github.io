import React, { Component } from "react";
import ReactDOM from "react-dom";
import * as d3 from "d3";
import Link from "./Link";
import Node from "./Node";
import { updateGraph } from "../helpers/graphHelpers";

const width = 700;
const height = 520;

class Graph extends Component {
  componentDidMount() {
    this.d3Graph = d3
      .select(ReactDOM.findDOMNode(this))
      .attr("width", width)
      .attr("height", height);

    const force = d3
      .forceSimulation(this.props.data.nodes)
      .force("charge", d3.forceManyBody().strength(-500))
      .force("link", d3.forceLink(this.props.data.links).distance(90))
      .force(
        "center",
        d3
          .forceCenter()
          .x(width / 2)
          .y(height / 2)
      )
      .force("collide", d3.forceCollide([5]).iterations([5]));

    function dragStarted(d) {
      if (!d3.event.active) force.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragging(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragEnded(d) {
      if (!d3.event.active) force.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    d3.selectAll("g.node").call(
      d3
        .drag()
        .on("start", dragStarted)
        .on("drag", dragging)
        .on("end", dragEnded)
    );

    // TODO: fix zoom
    // this.d3Graph.call(
    //   d3
    //     .zoom()
    //     .on("zoom", () => d3.selectAll("g").attr("transform", d3.event.transform))
    // );

    force.on("tick", () => {
      this.d3Graph.call(updateGraph);
    });
  }

  render() {
    const nodes = this.props.data.nodes.map(node => (
      <Node
        data={node}
        name={node.name}
        key={node.id}
        clickNode={this.props.clickNode}
      />
    ));
    const links = this.props.data.links.map(link => (
      <Link key={link.id} data={link} href="/" />
    ));

    return (
      <svg
        className="graph"
        style={{ marginTop: "2em", backgroundColor: "#d1d1ff" }}
      >
        <g>{links}</g>
        <g>{nodes}</g>
      </svg>
    );
  }
}

export default Graph;
