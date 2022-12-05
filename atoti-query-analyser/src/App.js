import React, { Component } from "react";
import Graph from "./Components/Graph/Graph";
import { Timeline } from "./Components/Timeline/Timeline";
import Summary from "./Components/Summary/Summary";
import NavBar from "./Components/NavBar/NavBar";
import { applySelection } from "./library/graphProcessors/selection";
import { parseV1, convertToV2 } from "./library/inputProcessors/v1tov2";
import { queryServer } from "./library/inputProcessors/server";
import goParentQueryButton from "./Components/NavBar/GoBackToParentQueryButton";
import passChooser from "./Components/NavBar/PassChooser";
import { preprocessQueryPlan } from "./library/dataStructures/processing/queryPlan";
import { parseJson } from "./library/graphView/parseJson";
import Input from "./Components/Input/Input";
import { NotificationWrapper } from "./Components/Notification/NotificationWrapper";

class App extends Component {
  constructor(props) {
    super(props);

    const defaultPage = "input";
    this.state = {
      selections: new Set(),
      router: defaultPage,
      allQueries: [],
      currentQueryId: 0,
      currentPassId: 0,
      restartGraph: false,
      lastInput: "",
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

    const queryPlan = preprocessQueryPlan(json);

    const selections = applySelection(queryPlan);
    const data = parseJson(queryPlan);

    this.setState({
      selections,
      allQueries: data,
      currentQueryId: data
        .filter((query) => query.pass === 0)
        .find((query) => query.parentId === null).id,
      router: "summary",
      json: queryPlan,
      lastInput: input,
    });
  };

  changeGraph = (childId) => {
    this.setState({ currentQueryId: childId, restartGraph: true });
  };

  changePass = (passId) => {
    const { allQueries } = this.state;
    const newQueryId = allQueries
      .filter((query) => query.pass === passId)
      .find((query) => query.parentId === null).id;
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
        className="my-0"
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
    const { allQueries, currentQueryId, restartGraph, router, lastInput } =
      this.state;
    const { parentId: currentParentId = null } =
      allQueries[currentQueryId] || {};

    return (
      <NotificationWrapper>
        <NavBar
          navigate={(dir) => this.setState({ router: dir })}
          dataIsEmpty
          goBackButton={goParentQueryButton(currentParentId, this.changeGraph)}
          passChooser={this.renderPassChooser()}
        />
        <main role="main" className="container-fluid px-0">
          {router === "input" && (
            <Input passInput={this.passInput} lastInput={lastInput} />
          )}
          {router === "summary" && this.renderSummary()}
          {router === "graph" && !restartGraph && this.renderGraph()}
          {router === "timeline" && this.renderTimeline()}
        </main>
      </NotificationWrapper>
    );
  }
}

export default App;
