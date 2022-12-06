import React, { Component, useLayoutEffect } from "react";
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
import { OverlayContainer } from "./hooks/overlayContainer";
import { GraphV2 } from "./Components/Graph/GraphV2";
import { useErrorMessage } from "./Components/Notification/notificationHooks";
import { Button } from "react-bootstrap";

function Fallback({ error, resetError }) {
  const { showError } = useErrorMessage();
  useLayoutEffect(() => {
    showError(error, true);
  }, []);
  return (
    <div>
      <h1>Oops!</h1>
      <br />
      <h2>{error.message}</h2>
      <ul>
        {error.stack
          .toString()
          .split("\n")
          .map((line) => (
            <li key={line}>{line}</li>
          ))}
      </ul>
      <Button variant="primary" onClick={resetError}>
        Reset
      </Button>
    </div>
  );
}

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
      lastInput: "",
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
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
    this.setState({ currentQueryId: childId });
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
      <GraphV2
        className="my-0"
        selection={selections[currentQueryId]}
        query={query}
        details={allQueries[currentQueryId]}
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
    if (router !== "input") {
      return passChooser(allQueries, currentPassId, this.changePass);
    }
    return null;
  }

  render() {
    const { allQueries, currentQueryId, router, lastInput, error } = this.state;
    const { parentId: currentParentId = null } =
      allQueries[currentQueryId] || {};

    return (
      <OverlayContainer>
        <NotificationWrapper>
          <NavBar
            navigate={(dir) => this.setState({ router: dir })}
            dataIsEmpty
            goBackButton={goParentQueryButton(
              currentParentId,
              this.changeGraph
            )}
            passChooser={this.renderPassChooser()}
          />
          {error ? (
            <Fallback
              error={error instanceof Error ? error : new Error(`${error}`)}
              resetError={() => this.setState({ error: null })}
            />
          ) : (
            <main role="main" className="container-fluid px-0">
              {router === "input" && (
                <Input passInput={this.passInput} lastInput={lastInput} />
              )}
              {router === "summary" && this.renderSummary()}
              {router === "graph" && this.renderGraph()}
              {router === "timeline" && this.renderTimeline()}
            </main>
          )}
        </NotificationWrapper>
      </OverlayContainer>
    );
  }
}

export default App;
