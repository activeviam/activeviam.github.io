import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import * as d3 from "d3";
import Popover from "react-bootstrap/Popover";
import Overlay from "react-bootstrap/Overlay";
import { nodeType } from "../types";
import { enterNode, updateNode } from "../helpers/graphHelpers";

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

  handle() {
    const {
      node: { id: nodeId },
      clickNode
    } = this.props;
    console.log(`${nodeId} been clicked`);
    clickNode(nodeId);
  }

  render() {
    const { node, changeGraph } = this.props;
    const { details, name, childrenIds, isSelected } = node;
    const {
      type,
      startTime,
      elapsedTime,
      measureProvider,
      measures,
      partitioning
    } = details;
    const popover = (
      <Popover id="popover-basic">
        <Popover.Title as="h3">{`${type} (#${name})`}</Popover.Title>
        <Popover.Content>
          <ul>
            <li>Start: {startTime}</li>
            <li>Elapsed: {elapsedTime}</li>
            <li>Measures provider: {measureProvider}</li>
            <li>
              Measures:
              <ul>
                {measures.map((m, key) => (
                  <li key={key}>{m}</li>
                ))}
              </ul>
            </li>
            <li>Partitioning: {partitioning}</li>
          </ul>
          {childrenIds.map(childId => (
            <button
              key={childId}
              type="button"
              className="btn btn-primary"
              onClick={() => changeGraph(childId)}
            >
              Enter sub-query {childId}.
            </button>
          ))}
        </Popover.Content>
      </Popover>
    );
    return (
      <>
        <g className="node">
          <circle ref={this.myRef} onClick={this.handle.bind(this)} />
          <text onClick={this.handle.bind(this)}>{name}</text>
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
