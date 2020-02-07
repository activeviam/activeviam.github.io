import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import * as d3 from "d3";
import { enterLink, updateLink } from "../helpers/graphHelpers";

class Link extends Component {
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

Link.propTypes = {
  link: PropTypes.any.isRequired
};

export default Link;
