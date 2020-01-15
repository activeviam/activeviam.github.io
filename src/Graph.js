import React, { Component } from "react";
import ReactDOM from 'react-dom';
import * as d3 from "d3";
import Link from "./Link";
import Node from "./Node";

const updateGraph = selection => {
  selection.selectAll(".node").call(updateNode);
  selection.selectAll(".link").call(updateLink);
};

const updateLink = selection => {
  selection
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);
};

const updateNode = selection => {
  selection.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
};


const width = 1080;
const height = 250;

class Graph extends Component {
  componentDidMount() {
    this.d3Graph = d3.select(ReactDOM.findDOMNode(this));

    let force = d3
      .forceSimulation(this.props.data.nodes)
      .force("charge", d3.forceManyBody().strength(-50))
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

    const node = d3.selectAll("g.node").call(
      d3
        .drag()
        .on("start", dragStarted)
        .on("drag", dragging)
        .on("end", dragEnded)
    );

    force.on("tick", () => {
      this.d3Graph.call(updateGraph);
    });
  }

  render() {
    let nodes = this.props.data.nodes.map(node => {
      return <Node data={node} name={node.name} key={node.id} />;
    });
    let links = this.props.data.links.map((link, i) => {
      return <Link key={link.target + i} data={link} />;
    });
    return (
      <svg className="graph" width={width} height={height}>
        <g>{nodes}</g>
        <g>{links}</g>
      </svg>
    );
  }
}

export default Graph;
