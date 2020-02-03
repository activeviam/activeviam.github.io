import React, { Component } from "react";
import "./App.css";
import Graph from "./Graph/Graph";
import NavBar from "./NavBar";
import NodeDetail from "./Graph/NodeDetail";
import parseJson from "./helpers/jsonToD3Data";
import basic from "./samples/basic-query.json";
// import minimal from "./samples/minimal-query";
// import distributed from "./samples/distributed-query";

class App extends Component {
  constructor(props) {
    super(props);

    const data = parseJson(basic);
    this.state = {
      allQueries: data,
      currentQueryId: 0,
      selectedNodeId: null
    };
  }

  clickNode = id => {
    this.setState(prevState => {
      const selectedNodeId = id === prevState.selectedNodeId ? null : id;
      const { allQueries, currentQueryId } = prevState;
      allQueries[currentQueryId].nodes.forEach(node => {
        if (node.id === id) {
          node.isSelected = !node.isSelected;
        } else {
          node.isSelected = false;
        }
      });
      return { allQueries, selectedNodeId };
    });
  };

  getDetail = () => {
    const { currentQueryId, selectedNodeId } = this.state;
    // Return the first retrieval with retrId === id of selected node
    // TODO: fix id (currentQueryId) and replace by name for uniqueness
    return basic.data[currentQueryId].retrievals.filter(
      retrieval => retrieval.retrId === selectedNodeId
    )[0];
  };

  render() {
    const { allQueries, currentQueryId } = this.state;
    return (
      <>
        <NavBar />
        <main role="main" className="container">
          <h1>Bootstrap starter template</h1>
          <div className="row">
            <div className="col-sm-8">
              <Graph
                data={allQueries[currentQueryId]}
                clickNode={this.clickNode}
              />
            </div>
            <div className="col-sm-4">
              {this.state.selectedNodeId !== null && (
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
