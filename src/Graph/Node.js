import React, { Component } from "react";
import ReactDOM from "react-dom";
import * as d3 from "d3";
import { enterNode, updateNode } from "../helpers/graphHelpers";

class Node extends Component {
  componentDidMount() {
    this.d3Node = d3
      .select(ReactDOM.findDOMNode(this))
      .datum(this.props.data)
      .call(enterNode)
  }

  componentDidUpdate() {
    this.d3Node
      .call(updateNode)
      .style("stroke-width", this.props.data.isSelected ? 2 : 0);
  }

  handle(e) {
    console.log(this.props.data.id + " been clicked");
    this.props.clickNode(this.props.data.id);
  }

  render() {
    return (
      <g className="node">
        <circle ref="dragMe" onClick={this.handle.bind(this)} onDoubleClick={() => console.log('hello')} />
        <text onClick={this.handle.bind(this)}>{this.props.data.name}</text>
      </g>
    );
  }
}

export default Node;
