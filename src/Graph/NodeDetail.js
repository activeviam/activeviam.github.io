import React, { Component } from "react";

class NodeDetail extends Component {
  render() {
    const {
      type,
      retrId,
      measureProvider,
      measures,
      partitioning
    } = this.props.details;
    return (
      <div>
        <b>
          {`${type} (#${retrId})`}
        </b>
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
