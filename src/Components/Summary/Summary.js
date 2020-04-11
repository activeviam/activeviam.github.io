import React from "react";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import { Values } from "../Details/Details";

const timingLabels = new Map([
  ["executionContextCreationTime", "Context creation time"],
  ["finalizationTime", "Query preparation"],
  ["planningTime", "Planning duration"],
  ["queryExecutionTime", "Execution duration"]
]);
const timingLabel = name => timingLabels.get(name) || "<unknown>";
const getHumanDuration = duration => `${duration} in ms`;

const Timings = info => {
  if (info) {
    return (
      <ul>
        {Object.entries(info.globalTimings).map(([timing, duration]) => (
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
};

const QuerySummary = ({ querySummary: summary, planInfo: info }) => {
  return (
    <div>
      <p>Total number of retrievals: {summary.totalRetrievals}</p>
      <h4>Query timings</h4>
      {Timings(info)}
      <h4>Measures</h4>
      <div>
        <Values values={summary.measures} />
      </div>
      <h4>Retrievals per type</h4>
      <ul>
        {Object.entries(summary.retrievalCountByType).map(([type, count]) => (
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
};

const MultiPivotSummary = ({ queries, pivots }) => {
  return (
    <>
      <h4>Underlying queries</h4>
      <Tabs defaultActiveKey={pivots[0].name}>
        {pivots.map(pivot => (
          <Tab eventKey={pivot.name} title={pivot.name} key={pivot.name}>
            {QuerySummary(queries[pivot.id])}
          </Tab>
        ))}
      </Tabs>
    </>
  );
};

const computeGlobalSummary = (queries, rootInfo, underlyingInfos) => {
  const summaries = [rootInfo, ...underlyingInfos].map(
    info => queries[info.id].querySummary
  );
  const measures = summaries.reduce(
    (acc, summary) =>
      summary.measures.reduce((store, measure) => store.add(measure), acc),
    new Set()
  );
  const totalRetrievals = summaries.reduce(
    (acc, summary) => acc + summary.totalRetrievals,
    0
  );
  const retrievalCountByType = summaries.reduce(
    (acc, summary) =>
      Object.entries(summary.retrievalCountByType).reduce(
        (res, [type, count]) => {
          if (Reflect.has(res, type)) {
            res[type] += count;
          } else {
            res[type] = count;
          }
          return res;
        },
        acc
      ),
    {}
  );
  const partitioningCountByType = summaries.reduce(
    (acc, summary) =>
      Object.entries(summary.partitioningCountByType).reduce(
        (res, [type, count]) => {
          if (Reflect.has(res, type)) {
            res[type] += count;
          } else {
            res[type] = count;
          }
          return res;
        },
        acc
      ),
    {}
  );
  return {
    measures: [...measures],
    totalRetrievals,
    retrievalCountByType,
    partitioningCountByType
  };
};

export default ({ queries, currentQuery, info }) => {
  const rootQuery = queries[currentQuery];
  const currentPass = info[currentQuery];
  const parentId = currentPass.id;
  const pivots = info.filter(inf => inf.parentId === parentId);

  let summary;
  if (rootQuery.retrievals.length === 0) {
    summary = "Empty query (MDX interal operation)";
  } else if (pivots.length > 0) {
    const fullInfo = {
      id: queries.length,
      name: "Global summary"
    };
    const globalSummary = computeGlobalSummary(queries, currentPass, pivots);
    summary = MultiPivotSummary({
      pivots: [fullInfo, currentPass, ...pivots],
      queries: [...queries, { querySummary: globalSummary }]
    });
  } else {
    summary = QuerySummary(rootQuery);
  }
  return (
    <div>
      <h3>
        MDX pass {currentPass.passType} ({currentQuery})
      </h3>
      {summary}
    </div>
  );
};
