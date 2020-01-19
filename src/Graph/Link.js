import React, { Component } from "react";
import ReactDOM from "react-dom";
import * as d3 from "d3";
import { enterLink, updateLink } from "../helpers/graphHelpers";

class Link extends Component {
  componentDidMount() {
    this.d3Link = d3
      .select(ReactDOM.findDOMNode(this))
      .datum(this.props.data)
      .call(enterLink)
      .style("stroke", "#000000")
      .style("stroke-width", 7)
      .style("opacity", 0.8);
  }

  componentDidUpdate() {
    this.d3Link.datum(this.props.data).call(updateLink);
  }

  render() {
    return <line className="link" />;
  }
}

export default Link;
