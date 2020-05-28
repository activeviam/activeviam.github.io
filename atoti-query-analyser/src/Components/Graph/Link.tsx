import React, { Component } from "react";
import ReactDOM from "react-dom";
import * as d3 from "d3";
import { enterLink, updateLink } from "../../helpers/graphHelpers";

type LinkProps = {
  link: any
}

class Link extends Component<LinkProps, any> {
  d3Link: any;

  componentDidMount() {
    this.d3Link = d3
      .select(ReactDOM.findDOMNode(this))
      .datum(this.props.link)
      .call(enterLink);
  }

  componentDidUpdate() {
    this.d3Link.datum(this.props.link).call(updateLink);
  }

  render() {
    return <line className="link" />;
  }
}

export default Link;
