import React, { useState } from "react";
import { PassGraph } from "./components/PassGraph/PassGraph";
import { OverlayContainer } from "./hooks/overlayContainer";
import { NotificationWrapper } from "./components/Notification/NotificationWrapper";
import { NavBar } from "./components/NavBar/NavBar";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { Input, InputMode, InputType } from "./components/Input/Input";
import { VertexSelection } from "./library/dataStructures/processing/selection";
import { queryServer, ServerInput } from "./library/inputProcessors/server";
import { GoBackToParentQueryButton } from "./components/NavBar/GoBackToParentQueryButton";
import { convertToV2, parseV1 } from "./library/inputProcessors/v1tov2";
import {
  preprocessQueryPlan,
  QueryPlan,
} from "./library/dataStructures/processing/queryPlan";
import {
  extractMetadata,
  QueryPlanMetadata,
} from "./library/graphProcessors/extractMetadata";
import { buildDefaultSelection } from "./library/graphProcessors/selection";
import { PassChooser } from "./components/NavBar/PassChooser";
import { Summary } from "./components/Summary/Summary";
import { Graph } from "./components/Graph/Graph";
import { Timeline } from "./components/Timeline/Timeline";
import { validateString } from "./library/dataStructures/json/validatingUtils";

/**
 * The root React component.
 * <br/>
 * Tasks:
 * * Manage sections of the application (Input, Summary, Graph, Timeline);
 * * Application data storage;
 * * Manage the selection of the current pass and of the request within that pass.
 * */
export function App(): JSX.Element {
  const [route, setRoute] = useState("input");
  const [selections, setSelections] = useState<VertexSelection[]>([]);
  const [queryMetadata, setQueryMetadata] = useState<QueryPlanMetadata[]>([]);
  const [currentQueryId, setCurrentQueryId] = useState(0);
  const [currentPassId, setCurrentPassId] = useState(0);
  const [lastInput, setLastInput] = useState("");
  const [queryPlans, setQueryPlans] = useState<QueryPlan[]>();

  const findRootQuery = (
    metadata: QueryPlanMetadata[],
    passId: number
  ): number | undefined => {
    return metadata
      .filter((q) => q.pass === passId)
      ?.find((q) => q.parentId === null)?.id;
  };

  const processInput = async (
    mode: InputMode,
    type: InputType,
    input: string | ServerInput,
    showError: (error: Error) => void
  ) => {
    let rawJson: unknown;
    if (mode === InputMode.JSON) {
      var parsedJson = JSON.parse(validateString(input));
      rawJson = parsedJson.hasOwnProperty('data') ? parsedJson.data : parsedJson;
    } else if (mode === InputMode.URL) {
      if (typeof input !== "object") {
        throw new Error(
          `Bad arguments: ${JSON.stringify({ mode, type, input })}`
        );
      }
      rawJson = await queryServer(input);
    } else if (mode === InputMode.V1) {
      const { errors, result } = convertToV2(
        await parseV1(validateString(input), () => {})
      );
      rawJson = [result];
      errors.forEach(showError);
    }

    const queryPlan = preprocessQueryPlan(rawJson);

    const defaultSelections = buildDefaultSelection(queryPlan);
    const metadata = extractMetadata(queryPlan);

    setSelections(defaultSelections);
    setQueryMetadata(metadata);
    setCurrentQueryId(findRootQuery(metadata, 0) || 0);
    setRoute("summary");
    setQueryPlans(queryPlan);
    setLastInput(typeof input === "string" ? input : input.query);
  };

  const changeGraph = (childId: number) => {
    setCurrentQueryId(childId);
  };

  const changePass = (passId: number) => {
    const newQueryId = findRootQuery(queryMetadata, passId) || 0;
    changeGraph(newQueryId);
    setCurrentPassId(passId);
  };

  const renderPassChooser = () => {
    if (route !== "input") {
      return (
        <PassChooser
          allQueries={queryMetadata}
          currentPassId={currentPassId}
          callback={changePass}
        />
      );
    }
    return null;
  };

  const renderInput = () => (
    <Input passInput={processInput} lastInput={lastInput} />
  );

  const renderStub = () => <h1>Load a query plan first!</h1>;

  const renderPassGraph = () =>
    queryPlans ? <PassGraph metadata={queryMetadata} /> : renderStub();

  const renderSummary = () =>
    queryPlans ? (
      <Summary
        queries={queryPlans}
        currentQuery={currentQueryId}
        info={queryMetadata}
      />
    ) : (
      renderStub()
    );

  const renderGraph = () =>
    queryPlans ? (
      <Graph
        query={queryPlans[currentQueryId]}
        selection={selections[currentQueryId]}
        changeGraph={changeGraph}
      />
    ) : (
      renderStub()
    );

  const renderTimeline = () =>
    queryPlans ? <Timeline plan={queryPlans[currentQueryId]} /> : renderStub();

  return (
    <OverlayContainer>
      <NotificationWrapper>
        <NavBar
          navigate={(dir) => setRoute(dir)}
          goBackButton={GoBackToParentQueryButton(
            queryMetadata[currentQueryId]?.parentId || null,
            changeGraph
          )}
          passChooser={renderPassChooser()}
        />
        <ErrorBoundary>
          <main role="main" className="container-fluid px-0">
            {route === "input" && renderInput()}
            {route === "passGraph" && renderPassGraph()}
            {route === "summary" && renderSummary()}
            {route === "graph" && renderGraph()}
            {route === "timeline" && renderTimeline()}
          </main>
        </ErrorBoundary>
      </NotificationWrapper>
    </OverlayContainer>
  );
}
