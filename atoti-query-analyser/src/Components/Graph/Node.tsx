import React, { Component } from "react";
import ReactDOM from "react-dom";
import * as d3 from "d3";
import {Popover} from 'antd';

import { enterNode, updateNode } from "../../helpers/graphHelpers";
import Details from "../Details/Details";

type NodeProps = {
  node: any,
  clickNode: any,
  changeGraph: any
}

class Node extends Component<NodeProps, any> {
  myRef: any;
  d3Node: any;

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
    const title = `${type} (#${name})`;
    const content = (
      <>
        <Details
          startTime={startTimes}
          elapsedTime={elapsedTimes}
          measures={measures}
          location={location}
          partitioning={partitioning}
          partition={0}
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
      </>
    );

    const nodeElem = status === "leaf" ? "rect" : "circle";
    return (
      <Popover placement="right" title={title} content={content} trigger="click">
        <g className="node">
          {React.createElement(nodeElem, {
            ref: this.myRef,
            onClick: this.handle.bind(this)
          })}
          <text>{name}</text>
        </g>
      </Popover>
    );
  }
}

export default Node;
