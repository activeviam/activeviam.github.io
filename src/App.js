import React, {Component, Fragment} from "react";
import "./App.css";
import Graph from "./Graph/Graph";
import NavBar from "./NavBar";
import parseJson from "./helpers/jsonToD3Data";
// import basic from "./samples/basic-query";
// import minimal from "./samples/minimal-query";
import distributed from "./samples/distributed-query"

class App extends Component {
  constructor(props) {
    super(props);

    const data = parseJson(distributed);
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
  }

  render() {
    // return (
    //   <div className="graphContainer">
    //     <Graph data={this.state.data} />
    //   </div>
    // );
    return (
      <Fragment>
        <NavBar/>
        <Graph data={this.state.data} />
      </Fragment>
    );
  }
}

export default App;
