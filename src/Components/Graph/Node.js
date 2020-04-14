import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import * as d3 from "d3";
import Popover from "react-bootstrap/Popover";
import Overlay from "react-bootstrap/Overlay";
import { nodeType } from "../../types";
import { enterNode, updateNode } from "../../helpers/graphHelpers";
import Details from "../Details/Details";

class Node extends Component {
  constructor(props) {
    super(props);
    this.myRef = React.createRef();
  }

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

  handle = () => {
    const {
      node: { id: nodeId },
      clickNode
    } = this.props;
    clickNode(nodeId);
  };

  render() {
    const { node, changeGraph, clickNode } = this.props;
    const { details, name, childrenIds, isSelected, status } = node;
    const {
      type,
      startTimes,
      elapsedTimes,
      measures,
      partitioning,
      location
    } = details;
    const popover = (
      <Popover style={{ maxWidth: "800px" }}>
        <Popover.Title as="h3">
          {`${type} (#${name})`}
          <button
            type="button"
            className="close"
            aria-label="Close"
            onClick={() => clickNode(null)}
            value="&times;"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </Popover.Title>
        <Popover.Content>
          <Details
            startTime={startTimes}
            elapsedTime={elapsedTimes}
            measures={measures}
            location={location}
            partitioning={partitioning}
          />
          {childrenIds.map(childId => (
            <>
              <button
                key={childId}
                type="button"
                className="btn btn-primary"
                onClick={() => changeGraph(childId)}
              >
                Enter sub-query {childId}.
              </button>{" "}
            </>
          ))}
        </Popover.Content>
      </Popover>
    );

    const nodeElem = status === "leaf" ? "rect" : "circle";
    return (
      <>
        <g className="node">
          {React.createElement(nodeElem, {
            ref: this.myRef,
            onClick: this.handle.bind(this)
          })}
          <text onClick={this.handle}>{name}</text>
        </g>
        <Overlay show={isSelected} placement="auto" target={this.myRef.current}>
          {popover}
        </Overlay>
      </>
    );
  }
}

Node.propTypes = {
  node: nodeType.isRequired,
  clickNode: PropTypes.func.isRequired,
  changeGraph: PropTypes.func.isRequired
};

export default Node;
