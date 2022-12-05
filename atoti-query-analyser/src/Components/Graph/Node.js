import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import * as d3 from "d3";
import Popover from "react-bootstrap/Popover";
import Overlay from "react-bootstrap/Overlay";
import Button from "react-bootstrap/Button";
import { FaTimes } from "react-icons/fa";
import { nodeType } from "../../types";
import { enterNode, updateNode } from "../../library/graphView/graphHelpers";
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
      clickNode,
    } = this.props;
    clickNode(nodeId);
  };

  render() {
    const { node, changeGraph, clickNode } = this.props;
    const { details, childrenIds, isSelected, status } = node;
    const { startTimes, elapsedTimes, metadata } = details;
    const { type } = metadata;
    const fullName = `${metadata.$kind}#${metadata.retrievalId}`;
    const label = node.name;

    const popover = (
      <Popover style={{ maxWidth: "800px" }}>
        <Popover.Header>
          <div className="d-flex">
            <span>{`${type} (${fullName})`}</span>
            <Button
              variant="outline-danger"
              className="ms-auto py-0"
              size="sm"
              aria-label="Close"
              onClick={() => clickNode(null)}
            >
              <FaTimes fontSize="small" />
            </Button>
          </div>
        </Popover.Header>
        <Popover.Body>
          <Details
            startTime={startTimes}
            elapsedTime={elapsedTimes}
            metadata={metadata}
          />
          {childrenIds
            ? childrenIds.map((childId) => (
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
              ))
            : null}
        </Popover.Body>
      </Popover>
    );

    const nodeElem = status === "leaf" ? "rect" : "circle";
    return (
      <>
        <g className="node">
          {React.createElement(nodeElem, {
            ref: this.myRef,
            onClick: this.handle.bind(this),
          })}
          <text onClick={this.handle}>{label}</text>
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
  changeGraph: PropTypes.func.isRequired,
};

export default Node;
