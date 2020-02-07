// TODO : add prop types
import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import * as d3 from "d3";
import { enterNode, updateNode } from "../helpers/graphHelpers";

class Node extends Component {
  componentDidMount() {
    this.d3Node = d3
      .select(ReactDOM.findDOMNode(this))
      .datum(this.props.node)
      .call(enterNode);
  }

  componentDidUpdate() {
    this.d3Node
      .call(updateNode)
      .style("stroke-width", this.props.node.isSelected ? 2 : 0);
  }

  handle() {
    const { key: nodeId, clickNode } = this.props;
    console.log(`${nodeId} been clicked`);
    clickNode(nodeId);
  }

  render() {
    return (
      <g className="node">
        <circle
          ref="dragMe"
          onClick={this.handle.bind(this)}
          onDoubleClick={() => console.log("hello")}
        />
        <text onClick={this.handle.bind(this)}>{this.props.node.name}</text>
      </g>
    );
  }
}

Node.propTypes = {
  node: PropTypes.any.isRequired,
  key: PropTypes.any,
  clickNode: PropTypes.any
};

export default Node;
