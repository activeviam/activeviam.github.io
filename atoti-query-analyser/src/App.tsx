import React, { Component } from "react";

import { Layout } from 'antd';


import Input from "./Components/Input/Input";
import Graph from "./Components/Graph/Graph";
import Timeline from "./Components/Timeline/Timeline";
import Summary from "./Components/Summary/Summary";
import NavBar from "./Components/NavBar/NavBar";
import parseJson from "./helpers/jsonToD3Data";
import { applySelection } from "./helpers/selection";
import { parseV1, convertToV2 } from "./helpers/v1tov2";
import queryServer from "./helpers/server";
import goParentQueryButton from "./Components/NavBar/GoBackToParentQueryButton";
import passChooser from "./Components/NavBar/PassChooser";

const { Content } = Layout;

class App extends Component<any, any> {
  constructor(props: any) {
    super(props);

    const defaultPage = "input";
    this.state = {
      selections: new Set(),
      router: defaultPage,
      allQueries: [],
      currentQueryId: 0,
      currentPassId: 0,
      restartGraph: false,
      lastInput: ""
    };
  }

  passInput = async (mode, type, input) => {
    let json;
    if (mode === "json") {
      json = JSON.parse(input).data;
    } else if (mode === "url") {
      json = await queryServer(input);
    } else if (mode === "v1") {
      const v1Structure = await parseV1(input, () => {});
      json = convertToV2(v1Structure);
    }

    const selections = applySelection(json, type);
    const data = parseJson(json, selections);

    this.setState({
      selections,
      allQueries: data,
      currentQueryId: data
        .filter(query => query.pass === 0)
        .find(query => query.parentId === null).id,
      router: "summary",
      json,
      lastInput: input
    });
  };

  changeGraph = childId => {
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

  renderSummary() {
    if (!this.state.json) {
      return <p>Load a query plan first!</p>;
    }

    const { currentQueryId, allQueries, json } = this.state;

    return (
      <Summary info={allQueries} queries={json} currentQuery={currentQueryId} />
    );
  }

  renderGraph() {
    if (!this.state.json) {
      return <p>Load a query plan first!</p>;
    }

    const { currentQueryId, allQueries, selections } = this.state;
    const query = this.state.json[currentQueryId];

    return (
      <Graph
        selection={selections[currentQueryId]}
        query={query}
        details={allQueries[currentQueryId]}
        restart={() => this.setState({ restartGraph: false })}
        changeGraph={this.changeGraph}
      />
    );
  }

  renderTimeline() {
    if (!this.state.json) {
      return <p>Load a query plan first!</p>;
    }

    const { currentQueryId } = this.state;

    return <Timeline plan={this.state.json[currentQueryId || 0]} />;
  }

  renderPassChooser() {
    const { allQueries, currentPassId, router } = this.state;
    if (router === "graph" || router === "timeline") {
      return passChooser(allQueries, currentPassId, this.changePass);
    }
    return null;
  }

  render() {
    const {
      allQueries,
      currentQueryId,
      restartGraph,
      router,
      lastInput
    } = this.state;
    const { parentId: currentParentId = null } =
      allQueries[currentQueryId] || {};

    return (
      <Layout className="layout">
        <NavBar
          navigate={dir => this.setState({ router: dir })}
          goBackButton={goParentQueryButton(currentParentId, this.changeGraph)}
          passChooser={this.renderPassChooser()}
        />
        <Content style={{ padding: '0 50px' }}>
          {router === "input" && (
            <Input passInput={this.passInput} lastInput={lastInput} />
          )}
          {router === "summary" && this.renderSummary()}
          {router === "graph" && !restartGraph && this.renderGraph()}
          {router === "timeline" && this.renderTimeline()}
        </Content>
      </Layout>
    );
  }
}

export default App;
