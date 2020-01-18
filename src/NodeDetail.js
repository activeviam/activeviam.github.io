import React, { Component } from "react";


class NodeDetail extends Component {
  render() {
    return <div>
    <b>{this.props.details.type} (#{this.props.details.retrId})</b>
      <ul>
        <li>Measures provider: {this.props.details.measureProvider}</li>
        <li>Measures:
          <ul> 
           {this.props.details.measures.map((m, key) => <li key={key}>{m}</li>)}
          </ul>
        </li>
        <li>Partitioning: {this.props.details.partitioning}</li>
      </ul>
    </div>
  }
}

export default NodeDetail;