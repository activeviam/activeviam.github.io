import React, { Component } from "react";
import "./App.css";
import Input from "./Input/Input";
import Graph from "./Graph/Graph";
import NavBar from "./NavBar";
import parseJson from "./helpers/jsonToD3Data";
// import json from "./samples/basic-query.json";
// import json from "./samples/distributed-query.json";
// import json from "./samples/minimal-query.json";
// import json from "./samples/larger-distributed-query.json";
// import json from "./samples/larger-distribution-query2.json";

class App extends Component {
  constructor(props) {
    super(props);

    // const data = parseJson(json);
    this.state = {
      router: "input",
      allQueries: {},
      currentQueryId: 0,
      selectedNodeId: null,
      restartGraph: false
    };
  }

  passInput = event => {
    event.preventDefault();
    console.log(JSON.parse(event.target[0].value));
    this.setState({
      allQueries: parseJson(JSON.parse(event.target[0].value)),
      router: "graph"
    });
  };

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
    const { allQueries, currentQueryId, restartGraph, router } = this.state;
    const dataIsEmpty = Object.entries(allQueries).length !== 0;
    let currentNodes = [];
    let currentLinks = [];
    if (dataIsEmpty) {
      const currentQuery = allQueries[currentQueryId];
      currentNodes = currentQuery.nodes;
      currentLinks = currentQuery.links;
    }
    return (
      <>
        <NavBar navigate={dir => this.setState({ router: dir })} dataIsEmpty />
        <main role="main" className="container">
          {router === "input" && <Input passInput={this.passInput} />}
          {router === "graph" && !restartGraph && (
            <Graph
              nodes={currentNodes}
              links={currentLinks}
              clickNode={this.clickNode}
              restart={() => this.setState({ restartGraph: false })}
              changeGraph={this.changeGraph}
            />
          )}
          {router === "timeline" && <></>}
        </main>
      </>
    );
  }
}

export default App;
