import React, { Component } from "react";
import "./App.css";
import Graph from "./Graph/Graph";
import NavBar from "./NavBar";
import NodeDetail from "./Graph/NodeDetail";
import parseJson from "./helpers/jsonToD3Data";
// import json from "./samples/basic-query.json";
import json from "./samples/distributed-query.json";
// import json from "./samples/minimal-query.json";

class App extends Component {
  constructor(props) {
    super(props);

    const data = parseJson(json);
    this.state = {
      allQueries: data,
      currentQueryId: 0,
      selectedNodeId: null,
      killGraph: false
    };
  }

  clickButton = childId => {
    this.clickNode(this.state.selectedNodeId);
    this.setState({ currentQueryId: childId, killGraph: true });
  };

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
      return { selectedNodeId };
    });
  };

  getDetail = () => {
    const { currentQueryId, selectedNodeId } = this.state;
    // Return the first retrieval with retrId === id of selected node
    // TODO: fix id (currentQueryId) and replace by name for uniqueness
    return json.data[currentQueryId].retrievals.filter(
      retrieval => retrieval.retrId === selectedNodeId
    )[0];
  };

  render() {
    const { allQueries, currentQueryId, selectedNodeId, killGraph } = this.state;
    return (
      <>
        <NavBar />
        <main role="main" className="container">
          <h1>Bootstrap starter template</h1>
          <div className="row">
            <div className="col-sm-8">
              {!killGraph && (
                <Graph
                  data={allQueries[currentQueryId]}
                  clickNode={this.clickNode}
                  restart={() => this.setState({ killGraph: false })}
                />
              )}
            </div>
            <div className="col-sm-4">
              {selectedNodeId !== null && (
                <NodeDetail details={this.getDetail()} />
              )}
              {selectedNodeId !== null &&
                allQueries[currentQueryId].nodes
                  .find(node => node.isSelected)
                  .childrenIds.map(childId => (
                    <button
                      key={childId}
                      type="button"
                      className="btn btn-primary"
                      onClick={() => this.clickButton(childId)}
                    >
                      Enter sub-query {childId}.
                    </button>
                  ))}
            </div>
          </div>
        </main>
      </>
    );
  }
}

export default App;
