import React, { Component } from "react";

class NodeDetail extends Component {
  render() {
    const { details } = this.props;
    if (!details) return null;
    const { type, retrId, measureProvider, measures, partitioning } = details;
    return (
      <div>
        <b>{`${type} (#${retrId})`}</b>
        <ul>
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
      </div>
    );
  }
}

export default NodeDetail;
