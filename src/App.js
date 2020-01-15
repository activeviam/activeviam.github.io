import React, { Component } from "react";
import "./App.css";
import Graph from "./Graph";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: {
        nodes: [
          { name: "fruit", id: 1 },
          { name: "apple", id: 2 },
          { name: "orange", id: 3 },
          { name: "banana", id: 4 }
        ],
        links: [
          { source: 1, target: 2 },
          { source: 1, target: 3 }
        ]
      }
    };
  }

  render() {
    return (
      <div className="graphContainer">
        <Graph data={this.state.data} />
      </div>
    );
  }
}

export default App;
