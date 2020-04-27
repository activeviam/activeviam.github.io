import React, { Component } from "react";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import FuzzySearch from "fuzzy-search";

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

const range = n => [...new Array(n).keys()];

class MeasureList extends Component {
  constructor(props) {
    super(props);
    const filtered = [...props.measures];
    filtered.sort();
    this.state = {
      filter: "",
      filtered
    };
  }

  changeFilter = event => {
    const needle = event.target.value.trim();
    let result;
    if (needle === "") {
      result = [...this.props.measures];
    } else {
      const searcher = new FuzzySearch(this.props.measures, undefined, {
        caseSensitive: true
      });
      result = searcher.search(needle);
    }
    result.sort();
    this.setState({ filtered: result });
  };

  render() {
    const { filtered: measures } = this.state;
    const cols = 3;
    const rows = parseInt(measures.length / cols, 10);
    const cidx = range(cols);
    const ridx = range(rows);
    return (
      <>
        <Form>
          <Form.Group>
            <Form.Control
              type="text"
              placeholder="Measure name"
              defaultValue={this.state.filter}
              onChange={this.changeFilter}
            />
          </Form.Group>
        </Form>
        <Table striped bordered hover size="sm">
          <tbody>
            {ridx.map(r => (
              <tr key={r}>
                {cidx.map(c => {
                  const measure = measures[r + c * rows];
                  const key = measure || `m${r + c * rows}`;
                  return <td key={key}>{measure}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </Table>
      </>
    );
  }
}

const QuerySummary = ({ querySummary: summary, planInfo: info }) => {
  return (
    <div>
      <p>Total number of retrievals: {summary.totalRetrievals}</p>
      <h4>Query timings</h4>
      {Timings(info)}
      <h4>Measures</h4>
      <MeasureList measures={summary.measures} />
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

const MultiPivotSummary = ({ queries, pivots, selected }) => {
  return (
    <>
      <h4>Underlying queries</h4>
      <Tabs defaultActiveKey={pivots[selected].name}>
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

const findRootInfo = (info, currentQuery) => {
  let query = info[currentQuery];
  while (query.parentId !== null) {
    query = info[query.parentId];
  }
  return query;
};

export default ({ queries, currentQuery, info }) => {
  const rootInfo = findRootInfo(info, currentQuery);
  const rootId = rootInfo.id;
  const rootQuery = queries[rootId];
  const underlyingQueries = info.filter(inf => inf.parentId === rootId);

  let summary;
  if (rootQuery.retrievals.length === 0) {
    summary = "Empty query (MDX interal operation)";
  } else if (underlyingQueries.length > 0) {
    const fullInfo = {
      id: queries.length,
      name: "Global summary"
    };
    const globalSummary = computeGlobalSummary(
      queries,
      rootInfo,
      underlyingQueries
    );
    const allSummaries = [fullInfo, rootInfo, ...underlyingQueries];
    summary = MultiPivotSummary({
      pivots: allSummaries,
      queries: [...queries, { querySummary: globalSummary }],
      selected: allSummaries.findIndex(inf => inf.id === currentQuery)
    });
  } else {
    summary = QuerySummary(rootQuery);
  }
  return (
    <div>
      <h3>
        MDX pass {rootInfo.passType} ({currentQuery})
      </h3>
      {summary}
    </div>
  );
};
