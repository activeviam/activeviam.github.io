import React, { useMemo, useState } from "react";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import FuzzySearch from "fuzzy-search";
import _ from "lodash";
import { PlanInfo } from "../../library/dataStructures/json/planInfo";
import { Measure } from "../../library/dataStructures/json/measure";
import { QuerySummary } from "../../library/dataStructures/json/querySummary";
import { QueryPlan } from "../../library/dataStructures/processing/queryPlan";
import { QueryPlanMetadata } from "../../library/graphView/parseJson";
import { RetrievalGraph } from "../../library/dataStructures/json/retrieval";

const TIMING_LABELS = new Map([
  ["executionContextCreationTime", "Context creation time"],
  ["finalizationTime", "Query preparation"],
  ["planningTime", "Planning duration"],
  ["queryExecutionTime", "Execution duration"],
]);

function timingLabel(name: string) {
  return TIMING_LABELS.get(name) || "<unknown>";
}

function getHumanDuration(duration: number) {
  return `${duration} in ms`;
}

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

function MeasureList({
  measures,
  columns,
}: {
  measures: Measure[];
  columns: number;
}) {
  const [query, setQuery] = useState("");

  const sortedMeasures = useMemo(() => {
    return [...measures].sort();
  }, [measures]);

  const filteredMeasures = useMemo(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery === "") {
      return sortedMeasures;
    }
    const searcher = new FuzzySearch(sortedMeasures, undefined, {
      caseSensitive: true,
    });
    return searcher.search(trimmedQuery).sort() as Measure[];
  }, [query, sortedMeasures]);

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

function QuerySummaryView({
  querySummary: summary,
  planInfo: info,
}: {
  querySummary: QuerySummary;
  planInfo: PlanInfo;
}) {
  return (
    <div>
      <p>Total number of retrievals: {summary.totalRetrievals}</p>
      <h4>Query timings</h4>
      <Timings info={info} />
      <h4>Measures</h4>
      <MeasureList measures={Array.from(summary.measures)} columns={3} />
      <h4>Retrievals per type</h4>
      <ul>
        {Object.entries(summary.retrievalsCountByType).map(([type, count]) => (
          <li key={type}>
            <b>{type}</b>: {count}
          </li>
        ))}
      </ul>
      <h4>Retrievals per partitioning</h4>
      <ul>
        {Object.entries(summary.partitioningCountByType).map(
          ([type, count]) => (
            <li key={type}>
              <b>{type}</b>: {count}
            </li>
          )
        )}
      </ul>
    </div>
  );
}

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

function computeGlobalSummary(
  queries: QueryPlan[],
  rootInfo: QueryPlanMetadata,
  underlyingInfos: QueryPlanMetadata[]
): QuerySummary {
  const summaries = [rootInfo, ...underlyingInfos].map(
    (info) => queries[info.id].querySummary
  );
  const measures = summaries.reduce(
    (acc, summary) =>
      Array.from(summary.measures).reduce(
        (store, measure) => store.add(measure),
        acc
      ),
    new Set<Measure>()
  );
  const totalRetrievals = summaries.reduce(
    (acc, summary) => acc + summary.totalRetrievals,
    0
  );
  const retrievalsCountByType = summaries.reduce(
    (acc, summary) =>
      Object.entries(summary.retrievalsCountByType).reduce(
        (res, [type, count]: [string, number]) => {
          res.set(type, (res.get(type) || 0) + count);
          return res;
        },
        acc
      ),
    new Map<string, number>()
  );
  const partitioningCountByType = summaries.reduce(
    (acc, summary) =>
      Object.entries(summary.partitioningCountByType).reduce(
        (res, [type, count]: [string, number]) => {
          res.set(type, (res.get(type) || 0) + count);
          return res;
        },
        acc
      ),
    new Map<string, number>()
  );
  return {
    measures,
    partialProviders: new Set(), // TODO
    resultSizeByPartitioning: new Map(), // TODO
    totalExternalResultSize: 0, // TODO
    totalRetrievals,
    retrievalsCountByType,
    partitioningCountByType,
  };
}

function findRootInfo(info: QueryPlanMetadata[], currentQuery: number) {
  let query = info[currentQuery];
  while (query.parentId !== null) {
    query = info[query.parentId];
  }
  return query;
}

export default function Summary({
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
  const underlyingQueries = info.filter((inf) => inf.parentId === rootId);

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
