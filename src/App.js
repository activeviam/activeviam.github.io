import React, { Component } from "react";
import "./App.css";
import { NavDropdown } from "react-bootstrap";
import Input from "./Input/Input";
import Graph from "./Graph/Graph";
import NavBar from "./NavBar";
import parseJson from "./helpers/jsonToD3Data";
import { parseV1, convertToV2 } from "./helpers/v1tov2";

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
    let data = [];
    if (mode === "json") {
      const json = JSON.parse(input);
      data = parseJson(json, type);
    } else if (mode === "v1") {
      const v1Structure = await parseV1(input, () => {});
      data = parseJson({ data: convertToV2(v1Structure) });
    }
    this.setState({
      allQueries: data,
      currentQueryId: data
        .filter(query => query.pass === 0)
        .find(query => query.parentId === null).id,
      router: "graph",
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

  goBackToParentQueryButton = currentParentId => {
    if (currentParentId !== null) {
      return (
        <input
          className="btn btn-outline-light ml-3"
          type="button"
          value="Go Back To Parent Query"
          onClick={() => this.changeGraph(currentParentId)}
        />
      );
    }
    return <></>;
  };

  passChooser = (allQueries, currentPassId) => {
    const allPassIds = [...new Set(allQueries.map(query => query.pass))].sort(
      (a, b) => a - b
    );
    if (allPassIds.length > 1) {
      return (
        <NavDropdown title="Pass number" id="basic-nav-dropdown" alignRight>
          {allPassIds.map(passId => (
            <NavDropdown.Item
              as="button"
              active={passId === currentPassId}
              onClick={() => this.changePass(passId)}
            >
              {passId}
            </NavDropdown.Item>
          ))}
        </NavDropdown>
      );
    }
    return <></>;
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
          goBackButton={this.goBackToParentQueryButton(currentParentId)}
          passChooser={this.passChooser(allQueries, currentPassId)}
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
          {router === "timeline" && <></>}
        </main>
      </>
    );
  }
}

export default App;
