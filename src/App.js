import React, { Component } from "react";
import "./App.css";
import Graph from "./Graph";
import parseJson from "./helpers/jsonToD3Data";
import basic from "./samples/basic-query";
import minimal from "./samples/minimal-query";

class App extends Component {
  constructor(props) {
    super(props);
    const data = parseJson(minimal);
    this.state = { data };
    // this.state = {
    //   data: {
    //     nodes: [
    //       { name: "fruit", id: 1 },
    //       { name: "apple", id: 2 },
    //       { name: "orange", id: 3 },
    //       { name: "banana", id: 4 }
    //     ],
    //     links: [
    //       { source: 1, target: 2 },
    //       { source: 1, target: 3 }
    //     ]
    //   }
    // };

    // console.log(this.state.data);
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
