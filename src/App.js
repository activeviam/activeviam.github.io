import React, { Component } from "react";
import "./App.css";
import Graph from "./Graph/Graph";
import NavBar from "./NavBar";
import NodeDetail from "./Graph/NodeDetail";
import parseJson from "./helpers/jsonToD3Data";
import basic from "./samples/basic-query";
// import minimal from "./samples/minimal-query";
// import distributed from "./samples/distributed-query";

class App extends Component {
  constructor(props) {
    super(props);

    const data = parseJson(basic);
    const selectedNode = null;
    this.state = { data, selectedNode };

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

  clickNode = id => {
    this.setState(prevState => {
      const selectedNode = id === this.state.selectedNode ? null : id;
      let data = prevState.data;
      data.nodes.forEach(node => {
        if (node.id === id) {
          node.isSelected = !node.isSelected;
        } else {
          node.isSelected = false;
        }
      });
      return { data, selectedNode };
    });
  };

  getDetail = () => {
    const nodeId = this.state.selectedNode;
    // Return the first retrieval with retrId === id of selected node
    return basic.data[0].retrievals.filter(node => node.retrId === nodeId)[0];
  };

  render() {
    return (
      <>
        <NavBar />
        <main role="main" className="container">
          <h1>Bootstrap starter template</h1>
          <div className="row">
            <div className="col-sm-8">
              <Graph data={this.state.data} clickNode={this.clickNode} />
            </div>
            <div className="col-sm-4">
              {this.state.selectedNode !== null && (
                <NodeDetail details={this.getDetail()} />
              )}
            </div>
          </div>
        </main>
      </>
    );
  }
}

export default App;
