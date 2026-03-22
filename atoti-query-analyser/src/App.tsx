import React, { useCallback, useState } from "react";
import { PassGraph } from "./components/PassGraph/PassGraph";
import { OverlayContainer } from "./hooks/overlayContainer";
import { NotificationWrapper } from "./components/Notification/NotificationWrapper";
import { NavBar } from "./components/NavBar/NavBar";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { Input, InputMode, InputType } from "./components/Input/Input";
import { VertexSelection } from "./library/dataStructures/processing/selection";
import { ServerInput } from "./library/inputProcessors/server";
import { GoBackToParentQueryButton } from "./components/NavBar/GoBackToParentQueryButton";
import {
  preprocessQueryPlan,
  QueryPlan,
} from "./library/dataStructures/processing/queryPlan";
import {
  extractMetadata,
  QueryPlanMetadata,
} from "./library/graphProcessors/extractMetadata";
import { buildDefaultSelection } from "./library/graphProcessors/selection";
import { PassAndClusterChooser } from "./components/NavBar/PassAndClusterChooser";
import { Summary } from "./components/Summary/Summary";
import { Graph } from "./components/Graph/Graph";
import { Partitions } from "./components/Partitions/Partitions";
import { Timeline } from "./components/Timeline/Timeline";
import { useQueryPlanWorker, WorkerResult } from "./workers/useQueryPlanWorker";

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
  const [lastQuery, setLastQuery] = useState({
    username: "",
    password: "",
    url: "",
    mdxQuery: "",
  });
  const [queryPlans, setQueryPlans] = useState<QueryPlan[]>();
  const [workerError, setWorkerError] = useState<Error | null>(null);

  const findRootQuery = (
    metadata: QueryPlanMetadata[],
    passId: number,
  ): number | undefined => {
    return metadata
      .filter((q) => q.pass === passId)
      ?.find((q) => q.parentId === null)?.id;
  };

  const processRawJson = useCallback(
    (rawJson: unknown, input?: string | ServerInput) => {
      const queryPlan = preprocessQueryPlan(rawJson);
      const defaultSelections = buildDefaultSelection(
        queryPlan.map((query) => query.graph),
      );
      const metadata = extractMetadata(queryPlan);

      setSelections(defaultSelections);
      setQueryMetadata(metadata);
      setCurrentQueryId(findRootQuery(metadata, 0) || 0);
      setRoute("summary");
      setQueryPlans(queryPlan);

      if (input !== undefined) {
        if (typeof input === "string") {
          setLastInput(input);
        } else {
          setLastQuery(input);
        }
      }
    },
    [],
  );

  const handleWorkerSuccess = useCallback(
    (result: WorkerResult) => {
      processRawJson(result.rawJson);
    },
    [processRawJson],
  );

  const handleWorkerError = useCallback((error: Error) => {
    setWorkerError(error);
  }, []);

  const {
    parseJson,
    parseV1,
    fetchAndParse,
    state: workerState,
  } = useQueryPlanWorker(handleWorkerSuccess, handleWorkerError);

  const processInput = useCallback(
    (
      mode: InputMode,
      _type: InputType,
      input: string | ServerInput,
      showError: (error: Error) => void,
      _statusLine?: (message: string) => void,
      labelHint?: string,
    ) => {
      // Clear any previous worker error
      setWorkerError(null);

      if (mode === InputMode.JSON) {
        if (typeof input !== "string") {
          showError(new Error("JSON mode requires string input"));
          return;
        }
        parseJson(input, labelHint);
        setLastInput(input);
      } else if (mode === InputMode.URL) {
        if (typeof input !== "object") {
          showError(
            new Error(`Bad arguments: ${JSON.stringify({ mode, input })}`),
          );
          return;
        }
        fetchAndParse(input);
        setLastQuery(input);
      } else if (mode === InputMode.V1) {
        if (typeof input !== "string") {
          showError(new Error("V1 mode requires string input"));
          return;
        }
        parseV1(input, labelHint);
        setLastInput(input);
      }
    },
    [parseJson, parseV1, fetchAndParse],
  );

  // Show worker errors via the notification system when they occur
  if (workerError) {
    // We clear the error after showing it to avoid infinite re-renders
    const errorToShow = workerError;
    setWorkerError(null);
    throw errorToShow;
  }

  const loadRecentEntry = useCallback(
    (data: unknown) => {
      processRawJson(data);
    },
    [processRawJson],
  );

  const changeGraph = (childId: number) => {
    setCurrentQueryId(childId);
  };

  /**
   * Auto-selects the best query in a given pass based on priority:
   * a) clusterMemberId contains "QUERY" (case-insensitive)
   * b) retrieverType contains "Distribut" (case-insensitive)
   * c) First alphabetically by clusterMemberId
   */
  const autoSelectQueryInPass = (passId: number): number => {
    const queriesInPass = queryMetadata.filter((q) => q.pass === passId);

    if (queriesInPass.length === 0) return 0;

    // Priority a: clusterMemberId contains "QUERY" (case-insensitive)
    const queryMatch = queriesInPass.find((q) =>
      q.name?.toUpperCase().includes("QUERY"),
    );
    if (queryMatch) return queryMatch.id;

    // Priority b: retrieverType contains "Distribut" (case-insensitive)
    if (queryPlans) {
      const distributedMatch = queriesInPass.find((q) =>
        queryPlans[q.id]?.planInfo.retrieverType
          .toLowerCase()
          .includes("distribut"),
      );
      if (distributedMatch) return distributedMatch.id;
    }

    // Priority c: First alphabetically by clusterMemberId
    const sorted = [...queriesInPass].sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    );
    return sorted[0]?.id ?? 0;
  };

  const changePass = (passId: number) => {
    const newQueryId = autoSelectQueryInPass(passId);
    setCurrentQueryId(newQueryId);
    setCurrentPassId(passId);
  };

  const changeClusterMember = (queryId: number) => {
    setCurrentQueryId(queryId);
  };

  const renderPassAndClusterChooser = () => {
    if (route === "input" || !queryPlans) return null;
    return (
      <PassAndClusterChooser
        queryMetadata={queryMetadata}
        currentPassId={currentPassId}
        currentQueryId={currentQueryId}
        onPassChange={changePass}
        onClusterChange={changeClusterMember}
      />
    );
  };

  const renderInput = () => (
    <Input
      passInput={processInput}
      lastInput={lastInput}
      lastQuery={lastQuery}
      loadRecentEntry={loadRecentEntry}
      workerState={workerState}
    />
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

  const renderPartitions = () =>
    queryPlans ? (
      <Partitions
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
            changeGraph,
          )}
          passAndClusterChooser={renderPassAndClusterChooser()}
        />
        <ErrorBoundary>
          <main role="main" className="container-fluid px-0">
            {route === "input" && renderInput()}
            {route === "passGraph" && renderPassGraph()}
            {route === "summary" && renderSummary()}
            {route === "graph" && renderGraph()}
            {route === "partitions" && renderPartitions()}
            {route === "timeline" && renderTimeline()}
          </main>
        </ErrorBoundary>
      </NotificationWrapper>
    </OverlayContainer>
  );
}
