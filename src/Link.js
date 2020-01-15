import React, { Component } from "react";
import ReactDOM from 'react-dom';
import * as d3 from "d3";

const enterLink = selection => {
  selection
    .attr("stroke-width", 2)
    .style("stroke", "yellow")
    .style("opacity", ".2");
};

const updateLink = selection => {
  selection
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);
};

class Link extends Component {
  componentDidMount() {
    this.d3Link = d3
      .select(ReactDOM.findDOMNode(this))
      .datum(this.props.data)
      .call(enterLink);
  }

  componentDidUpdate() {
    this.d3Link.datum(this.props.data).call(updateLink);
  }

  render() {
    return <line className="link" />;
  }
}

export default Link;
