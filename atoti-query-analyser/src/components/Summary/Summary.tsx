import React, { useMemo, useState } from "react";
import { Button } from "react-bootstrap";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import FuzzySearch from "fuzzy-search";
import _ from "lodash";
import { saveAs } from "file-saver";
import { PlanInfo } from "../../library/dataStructures/json/planInfo";
import { Measure } from "../../library/dataStructures/json/measure";
import { QuerySummary } from "../../library/dataStructures/json/querySummary";
import { QueryPlan } from "../../library/dataStructures/processing/queryPlan";
import { QueryPlanMetadata } from "../../library/graphProcessors/extractMetadata";
import { RetrievalGraph } from "../../library/dataStructures/json/retrieval";
import { humanisticStringComparator } from "../../library/utilities/textUtils";

const TIMING_LABELS = new Map([
  ["CONTEXT", "Context creation time"],
  ["executionContextCreationTime", "Context creation time"],
  ["FINALIZATION", "Query preparation"],
  ["finalizationTime", "Query preparation"],
  ["PLANNING", "Planning duration"],
  ["planningTime", "Planning duration"],
  ["EXECUTION", "Execution duration"],
  ["queryExecutionTime", "Execution duration"],
]);

/**
 * Maps timing field names to human-readable versions.
 * */
function timingLabel(name: string) {
  return TIMING_LABELS.get(name) || `<${name}>`;
}

/**
 * Stringifies time duration.
 * */
function getHumanDuration(duration: number) {
  return `${duration} ms`;
}

/**
 * This React component is responsible for showing timing info about a query.
 * */
function Timings({ info }: { info?: PlanInfo }) {
  if (info) {
    return (
      <ul>
        {Array.from(info.globalTimings).map(([timing, duration]) => (
          <li key={timing}>
            {timingLabel(timing)}: {getHumanDuration(duration)} ({duration} ms)
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p>
      <i>Timings are not available</i>
    </p>
  );
}

/**
 * This component is responsible for displaying list of measures and filtering
 * them by a search query.
 * */
function MeasureList({
  measures,
  columns,
}: {
  measures: Measure[];
  columns: number;
}) {
  const [query, setQuery] = useState("");

  const filteredMeasures = useMemo(() => {
    const trimmedQuery = query.trim();
    let result: Measure[];
    if (trimmedQuery === "") {
      result = [...measures];
    } else {
      const searcher = new FuzzySearch(measures, undefined, {
        caseSensitive: true,
      });
      result = searcher.search(trimmedQuery);
    }

    return result.sort(humanisticStringComparator);
  }, [query, measures]);

  const rows = useMemo(() => {
    return Math.ceil(filteredMeasures.length / columns);
  }, [filteredMeasures, columns]);

  const rowIndexRange = useMemo(() => {
    return _.times(rows);
  }, [rows]);

  const columnIndexRange = useMemo(() => {
    return _.times(columns);
  }, [columns]);

  return (
    <div>
      <Form>
        <Form.Group>
          <Form.Control
            type="text"
            placeholder="Measure name"
            defaultValue={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Form.Group>
      </Form>
      <Table striped bordered hover size="sm">
        <tbody>
          {rowIndexRange.map((rowIndex) => (
            <tr key={rowIndex}>
              {columnIndexRange.map((columnIndex) => {
                const index = rowIndex + columnIndex * rows;
                if (index >= filteredMeasures.length) {
                  return null;
                }
                const measure = filteredMeasures[index];
                return <td key={measure}>{measure}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

/**
 * This React component is responsible for displaying a set of elements.
 * */
function SetView<T>({
  title,
  set,
  hideIfEmpty,
}: {
  title: string;
  set: Set<T>;
  hideIfEmpty?: boolean;
}) {
  if (hideIfEmpty && set.size === 0) {
    return <></>;
  }

  return (
    <>
      <h4>{title}</h4>
      {set.size === 0 ? (
        <i>No items</i>
      ) : (
        <ul>
          {Array.from(set).map((value) => (
            <li key={`${value}`}>{`${value}`}</li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * This React component is responsible for displaying key-value container.
 * */
function MapView<K, V>({
  title,
  map,
  hideIfEmpty,
}: {
  title: string;
  map: Map<K, V>;
  hideIfEmpty?: boolean;
}) {
  if (hideIfEmpty && map.size === 0) {
    return <></>;
  }

  return (
    <>
      <h4>{title}</h4>
      {map.size === 0 ? (
        <i>No items</i>
      ) : (
        <ul>
          {Array.from(map.entries()).map(([key, value]) => (
            <li key={`${key}`}>
              <b>{`${key}`}</b>: {`${value}`}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * This React component is responsible for displaying information about one query.
 * */
function QuerySummaryView({
  querySummary: summary,
  planInfo: info,
  graph,
}: {
  querySummary: QuerySummary;
  planInfo: PlanInfo;
  graph: RetrievalGraph;
}) {
  const exportAsJson = () => {
    const vertices = Array.from(graph.getVertices());
    const edges = vertices
      .flatMap((vertex) => Array.from(graph.getOutgoingEdges(vertex)))
      .map((edge) => ({
        begin: edge.getBegin().getUUID(),
        end: edge.getEnd().getUUID(),
        metadata: edge.getMetadata(),
        uuid: edge.getUUID(),
      }));

    const blob = new Blob([JSON.stringify({ vertices, edges }, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    saveAs(blob, `ExecutionGraph ${info.mdxPass}.json`);
  };

  return (
    <div>
      <Button onClick={exportAsJson}>Export graph as JSON</Button>
      <p>Total number of retrievals: {summary.totalRetrievals}</p>
      <p>
        Total size of external retrieval results:{" "}
        {summary.totalExternalResultSize}
      </p>
      <h4>Query timings</h4>
      <Timings info={info} />
      <h4>Measures</h4>
      <MeasureList measures={Array.from(summary.measures)} columns={3} />
      <MapView
        title="Retrievals per type"
        map={summary.retrievalsCountByType}
      />
      <MapView
        title="Retrievals per partitioning"
        map={summary.partitioningCountByType}
      />
      <MapView
        hideIfEmpty
        title={"Result size per partitioning scheme"}
        map={summary.resultSizeByPartitioning}
      />
      <SetView
        hideIfEmpty
        title={"Partial providers"}
        set={summary.partialProviders}
      />
    </div>
  );
}

/**
 * This React component is responsible for displaying multi-tab pane with information on each query.
 * */
function MultiPivotSummary({
  queries,
  pivots,
  selected,
}: {
  queries: QueryPlan[];
  pivots: QueryPlanMetadata[];
  selected: number;
}) {
  return (
    <>
      <h4>Underlying queries</h4>
      <Tabs defaultActiveKey={pivots[selected].name}>
        {pivots.map((pivot) => (
          <Tab eventKey={pivot.name} title={pivot.name} key={pivot.name}>
            {QuerySummaryView(queries[pivot.id])}
          </Tab>
        ))}
      </Tabs>
    </>
  );
}

/**
 * Helper function for merging sets together.
 * */
function mergeSets<T>(sets: Set<T>[]): Set<T> {
  return sets.reduce(
    (acc, set) =>
      Array.from(set).reduce(
        (store: Set<T>, element) => store.add(element),
        acc
      ),
    new Set<T>()
  );
}

/**
 * Helper function for merging maps together. The resulting map satisfies the following properties:
 * <ol>
 *   <li>Key set of the resulting map is union of key sets of the input maps;</li>
 *   <li>Assuming <code>k</code> to be a key of the resulting map, <code>result.get(k)</code> is defined as follows:
 *   <p>
 *   <code>
 *     maps.filter(map =&gt; map.has(k)).map(map =&gt; map.get(k)).reduce(reducer)
 *   </code>
 *   </p>
 *   </li>
 * </ol>
 * */
function mergeMaps<K, V>(
  maps: Map<K, V>[],
  reducer: (oldValue: V, newValue: V) => V
): Map<K, V> {
  return maps.reduce(
    (acc, map) =>
      Array.from(map).reduce((store, [key, value]) => {
        if (store.has(key)) {
          store.set(key, reducer(store.get(key) as V, value));
        } else {
          store.set(key, value);
        }
        return store;
      }, acc),
    new Map<K, V>()
  );
}

/**
 * Computes global summary for a set of queries.
 * */
function computeGlobalSummary(
  queries: QueryPlan[],
  rootInfo: QueryPlanMetadata,
  underlyingInfos: QueryPlanMetadata[]
): QuerySummary {
  const summaries = [rootInfo, ...underlyingInfos].map(
    (info) => queries[info.id].querySummary
  );
  const measures = mergeSets(summaries.map((summary) => summary.measures));
  const totalRetrievals = summaries.reduce(
    (acc, summary) => acc + summary.totalRetrievals,
    0
  );

  const retrievalsCountByType = mergeMaps(
    summaries.map((summary) => summary.retrievalsCountByType),
    (a, b) => a + b
  );
  const partitioningCountByType = mergeMaps(
    summaries.map((summary) => summary.partitioningCountByType),
    (a, b) => a + b
  );
  const partialProviders = mergeSets(
    summaries.map((summary) => summary.partialProviders)
  );

  const resultSizeByPartitioning = mergeMaps(
    summaries.map((summary) => summary.resultSizeByPartitioning),
    (a, b) => a + b
  );

  const totalExternalResultSize = summaries.reduce(
    (acc, summary) => acc + summary.totalExternalResultSize,
    0
  );

  return {
    measures,
    partialProviders,
    resultSizeByPartitioning,
    totalExternalResultSize,
    totalRetrievals,
    retrievalsCountByType,
    partitioningCountByType,
  };
}

/**
 * Finds the root query in the pass.
 * */
function findRootInfo(info: QueryPlanMetadata[], currentQuery: number) {
  let query = info[currentQuery];
  while (query.parentId !== null) {
    query = info[query.parentId];
  }
  return query;
}

/**
 * This React component is responsible for showing query statistics for each
 * query and for all queries within one pass.
 *
 * @param attributes - React JSX attributes
 * @param attributes.queries - Array of queries
 * @param attributes.info - Array of query metadata
 * @param attributes.currentQuery - Current query index
 */
export function Summary({
  queries,
  currentQuery,
  info,
}: {
  queries: QueryPlan[];
  currentQuery: number;
  info: QueryPlanMetadata[];
}) {
  const rootInfo = findRootInfo(info, currentQuery);
  const rootId = rootInfo.id;
  const rootQuery = queries[rootId];
  const underlyingQueries = info.filter(
    (inf) => inf.pass === rootInfo.pass && inf.parentId !== null
  );

  let summary;
  if (rootQuery.graph.getVertexCount() <= 1) {
    summary = "Empty query (MDX internal operation)";
  } else if (underlyingQueries.length > 0) {
    const fullInfo: QueryPlanMetadata = {
      parentId: null,
      pass: 0,
      passType: "",
      id: queries.length,
      name: "Global summary",
    };
    const globalSummary = computeGlobalSummary(
      queries,
      rootInfo,
      underlyingQueries
    );
    const globalPlanInfo: PlanInfo = {
      aggregatesCache: "",
      branch: "",
      contextValues: new Map(),
      epoch: "",
      globalTimings: new Map(),
      isContinuous: false,
      isEmpty: true,
      missedPrefetchBehavior: "",
      pivotId: "",
      pivotType: "",
      rangeSharing: 0,
      retrieverType: "",
    };
    const globalQuery: QueryPlan = {
      graph: new RetrievalGraph(),
      planInfo: globalPlanInfo,
      queryFilters: [],
      querySummary: globalSummary,
    };
    const allSummaries = [fullInfo, rootInfo, ...underlyingQueries];
    summary = MultiPivotSummary({
      pivots: allSummaries,
      queries: [...queries, globalQuery],
      selected: allSummaries.findIndex((inf) => inf.id === currentQuery),
    });
  } else {
    summary = QuerySummaryView(rootQuery);
  }
  return (
    <div>
      <h3>
        MDX pass {rootInfo.passType} ({currentQuery})
      </h3>
      {summary}
    </div>
  );
}
