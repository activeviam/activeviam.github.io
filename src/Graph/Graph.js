import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import * as d3 from "d3";
import { nodeType, linkType } from "../types";
import Link from "./Link";
import Node from "./Node";
import { updateGraph } from "../helpers/graphHelpers";

const width = 1080;
const height = 5200;

class Graph extends Component {
  componentDidMount() {
    const { nodes, links } = this.props;

    const d3Graph = d3
      .select(ReactDOM.findDOMNode(this))
      .attr("width", width)
      .attr("height", height);

    const force = d3
      .forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(-500))
      .force("link", d3.forceLink(links).distance(90))
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
      d3Graph.call(updateGraph);
    });
  }

  componentWillUnmount() {
    this.props.restart();
  }

  render() {
    const { nodes, links, clickNode, changeGraph } = this.props;
    const Nodes = nodes.map(node => (
      <Node
        node={node}
        key={node.id}
        clickNode={clickNode}
        changeGraph={changeGraph}
      />
    ));
    const Links = links.map(link => (
      <Link key={link.id} link={link} href="/" />
    ));

    return (
      <svg
        className="graph"
        style={{ marginTop: "2em", backgroundColor: "#d1d1ff" }}
      >
        <g>{Links}</g>
        <g>{Nodes}</g>
      </svg>
    );
  }
}

Graph.propTypes = {
  nodes: PropTypes.arrayOf(nodeType).isRequired,
  links: PropTypes.arrayOf(linkType).isRequired,
  clickNode: PropTypes.func.isRequired,
  restart: PropTypes.func.isRequired,
  changeGraph: PropTypes.func.isRequired
};

export default Graph;
