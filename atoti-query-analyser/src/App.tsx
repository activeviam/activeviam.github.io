import React, { useState } from "react";
import { OverlayContainer } from "./hooks/overlayContainer";
import { NotificationWrapper } from "./Components/Notification/NotificationWrapper";
import { NavBar } from "./Components/NavBar/NavBar";
import { ErrorBoundary } from "./Components/ErrorBoundary/ErrorBoundary";
import { Input, InputMode, InputType } from "./Components/Input/Input";
import { VertexSelection } from "./library/dataStructures/processing/selection";
import { queryServer, ServerInput } from "./library/inputProcessors/server";
import { GoBackToParentQueryButton } from "./Components/NavBar/GoBackToParentQueryButton";
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
import { PassChooser } from "./Components/NavBar/PassChooser";
import { Summary } from "./Components/Summary/Summary";
import { Graph } from "./Components/Graph/Graph";
import { Timeline } from "./Components/Timeline/Timeline";
import { validateString } from "./library/dataStructures/json/validatingUtils";

/**
 * The root React component.
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
    input: string | ServerInput
  ) => {
    let rawJson: unknown;
    if (mode === InputMode.JSON) {
      rawJson = JSON.parse(validateString(input)).data;
    } else if (mode === InputMode.URL) {
      if (typeof input !== "object") {
        throw new Error(
          `Bad arguments: ${JSON.stringify({ mode, type, input })}`
        );
      }
      rawJson = await queryServer(input);
    } else if (mode === InputMode.V1) {
      rawJson = convertToV2(await parseV1(validateString(input), () => {}));
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
      return PassChooser(queryMetadata, currentPassId, changePass);
    }
    return null;
  };

  const renderInput = () => (
    <Input passInput={processInput} lastInput={lastInput} />
  );

  const renderStub = () => <h1>Load a query plan first!</h1>;

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
            {route === "summary" && renderSummary()}
            {route === "graph" && renderGraph()}
            {route === "timeline" && renderTimeline()}
          </main>
        </ErrorBoundary>
      </NotificationWrapper>
    </OverlayContainer>
  );
}
