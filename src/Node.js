import React, { Component } from "react";
import ReactDOM from 'react-dom';
import * as d3 from "d3";

const color = d3.scaleOrdinal(d3.schemeCategory10);

const enterNode = selection => {
  selection
    .select("circle")
    .attr("r", 30)
    .style("fill", function(d) {
      return color(d.name);
    });

  selection
    .select("text")
    .attr("dy", ".35em")
    .style("transform", "translateX(-50%,-50%");
};

const updateNode = selection => {
  selection.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
};

class Node extends Component {
  componentDidMount() {
    this.d3Node = d3
      .select(ReactDOM.findDOMNode(this))
      .datum(this.props.data)
      .call(enterNode);
  }

  componentDidUpdate() {
    this.d3Node.datum(this.props.data).call(updateNode);
  }

  handle(e) {
    console.log(this.props.data.id + " been clicked");
  }

  render() {
    return (
      <g className="node">
        <circle ref="dragMe" onClick={this.handle.bind(this)} />
        <text>{this.props.data.name}</text>
      </g>
    );
  }
}

export default Node;
