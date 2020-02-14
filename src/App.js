import React, { Component } from "react";
import "./App.css";
import Graph from "./Graph/Graph";
import NavBar from "./NavBar";
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
      restartGraph: false
    };
  }

  changeGraph = childId => {
    this.clickNode(this.state.selectedNodeId); // Easy way to un-click the current clicked node to prevent bug
    this.setState({ currentQueryId: childId, restartGraph: true });
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

  // getDetail = () => {
  //   const { currentQueryId, selectedNodeId } = this.state;
  //   Return the first retrieval with retrId === id of selected node
  //   TODO: fix id (currentQueryId) and replace by name for uniqueness
  //   return json.data[currentQueryId].retrievals.find(
  //     retrieval => retrieval.retrId === selectedNodeId
  //   );
  // };

  render() {
    const { allQueries, currentQueryId, restartGraph } = this.state;
    const currentQuery = allQueries[currentQueryId];
    const { nodes: currentNodes, links: currentLinks } = currentQuery;
    return (
      <>
        <NavBar />
        <main role="main" className="container">
          <h1>Bootstrap starter template</h1>
          {!restartGraph && (
            <Graph
              nodes={currentNodes}
              links={currentLinks}
              clickNode={this.clickNode}
              restart={() => this.setState({ restartGraph: false })}
              changeGraph={this.changeGraph}
            />
          )}
        </main>
      </>
    );
  }
}

export default App;
