import React, { Component } from "react";
import Input from "./Components/Input/Input";
import Graph from "./Components/Graph/Graph";
import Timeline from "./Components/Timeline/Timeline";
import NavBar from "./Components/NavBar/NavBar";
import parseJson from "./helpers/jsonToD3Data";
import { parseV1, convertToV2 } from "./helpers/v1tov2";
import queryServer from "./helpers/server";
import goParentQueryButton from "./Components/NavBar/GoBackToParentQueryButton";
import passChooser from "./Components/NavBar/PassChooser";

class App extends Component {
  constructor(props) {
    super(props);

    const defaultPage = "input";
    this.state = {
      router: defaultPage,
      allQueries: [],
      currentQueryId: 0,
      currentPassId: 0,
      selectedNodeId: null,
      restartGraph: false,
      lastInput: ""
    };
  }

  passInput = async (mode, type, input) => {
    let data;
    let json;
    if (mode === "json") {
      json = JSON.parse(input);
      // data = parseJson(json, type);
    } else if (mode === "url") {
      json = await queryServer(input);
      // data = parseJson(json, type);
    } else if (mode === "v1") {
      const v1Structure = await parseV1(input, () => {});
      json = { data: convertToV2(v1Structure) };
      // data = parseJson(json);
    }
    data = [];

    this.setState({
      allQueries: data,
      // currentQueryId: data
      //   .filter(query => query.pass === 0)
      //   .find(query => query.parentId === null).id,
      currentQueryId: 0,
      router: "timeline",
      json: json.data,
      lastInput: input
    });
  };

  changeGraph = childId => {
    this.clickNode(this.state.selectedNodeId); // Easy way to un-click the current clicked node to prevent bug
    this.setState({ currentQueryId: childId, restartGraph: true });
  };

  changePass = passId => {
    const { allQueries } = this.state;
    const newQueryId = allQueries
      .filter(query => query.pass === passId)
      .find(query => query.parentId === null).id;
    this.changeGraph(newQueryId);
    this.setState({ currentPassId: passId });
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

  render() {
    const {
      allQueries,
      currentQueryId,
      currentPassId,
      restartGraph,
      router,
      lastInput
    } = this.state;
    const {
      nodes: currentNodes = [],
      links: currentLinks = [],
      parentId: currentParentId = null
    } = allQueries[currentQueryId] || {};

    return (
      <>
        <NavBar
          navigate={dir => this.setState({ router: dir })}
          dataIsEmpty
          goBackButton={goParentQueryButton(currentParentId, this.changeGraph)}
          passChooser={passChooser(allQueries, currentPassId, this.changePass)}
        />
        <main role="main" className="container-fluid px-0">
          {router === "input" && (
            <Input passInput={this.passInput} lastInput={lastInput} />
          )}
          {router === "graph" && !restartGraph && (
            <Graph
              className="my-0"
              nodes={currentNodes}
              links={currentLinks}
              clickNode={this.clickNode}
              restart={() => this.setState({ restartGraph: false })}
              changeGraph={this.changeGraph}
            />
          )}
          {router === "timeline" && (
            <Timeline plan={this.state.json[currentQueryId || 0]} />
          )}
        </main>
      </>
    );
  }
}

export default App;
