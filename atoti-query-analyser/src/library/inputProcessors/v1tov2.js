import _ from "lodash";

const RETRIEVAL = /(\w*Retrieval) #(\d+): ([\w_]+)( \(see)?/;
const PROPERTY_EXPR = /\s*([\w\-_ ()]+)= (.+)\s*/;
const PIVOT_EXPR = /\s*(\w+)\s+\[id=(.+?), epoch=(\d+)]/;
const PLAN_EXPR = /\s*([\w\-_ ()]+?)\s*: (.+)\s*/;
const PARTITION_RESULT = /(?:^|\s+)Result for (\d+)\s*: (EMPTY|.*)/;
const DEPENDENCY_START = /which depends on \{/;
const DEPENDENCY_END = /^\s*}\s*$/;
const PARTITION_PROPERTY = "Contributed partitions";
const last = array => (array.length > 0 ? array[array.length - 1] : undefined);

const parseNewRetrieval = (state, _line, match) => {
  const sourceId = `${match[1]}#${match[2]}`;
  if (!state.retrievalIndex.has(sourceId)) {
    state.retrievalIndex.set(sourceId, state.retrievalIndex.size);
  }
  const id = state.retrievalIndex.get(sourceId);

  return {
    id,
    sourceId,
    type: match[3],
    ref: match[4] !== undefined,
    dependencies: [],
    parents: [],
    properties: {}
  };
};
const parseProperty = (_line, match) => ({
  key: match[1],
  value: match[2]
});

const matchLine = (state, line, matchClauses) => {
  const entries = matchClauses.entries();
  for (let entry = entries.next(); !entry.done; entry = entries.next()) {
    const [expr, action] = entry.value;
    const match = expr.exec(line);
    if (match !== null) {
      action(state, match, line);
      return;
    }
  }
};

const RETRIEVAL_CLAUSES = new Map([
  [RETRIEVAL, (state, match, line) => {
    const retrieval = parseNewRetrieval(state, line, match);
    if (retrieval.ref) {
      state.current = state.retrievals[retrieval.id];
    } else {
      state.current = retrieval;
      state.retrievals[retrieval.id] = retrieval;
    }

    const parent = last(state.parents);
    if (parent) {
      parent.dependencies.push(retrieval.id);
    }
  }],
  [PARTITION_RESULT, (state, match) => {
    // Before properties as results contain '=' and more
    const partitionId = match[1];
    const result = match[2];
    if (result !== "EMPTY") {
      const partitions = state.current.properties[PARTITION_PROPERTY] || [];
      partitions.push(partitionId);
      state.current.properties[PARTITION_PROPERTY] = partitions;
    }
  }],
  [PROPERTY_EXPR, (state, match, line) => {
    const property = parseProperty(line, match);
    state.current.properties[property.key] = property.value;
  }],
  [DEPENDENCY_START, (state) => state.parents.push(state.current)],
  [DEPENDENCY_END, (state) => state.parents.pop()]
]);

const parseLine = (state, line) => {
  matchLine(state, line, RETRIEVAL_CLAUSES);
};

const parseGeneral = (state, line) => {
  const [, prop, value] = PLAN_EXPR.exec(line);
  if (prop === "ActivePivot") {
    const [, type, id, epoch] = PIVOT_EXPR.exec(value);
    state.info.pivotType = type;
    state.info.pivotId = id;
    state.info.epoch = epoch;
  } else if (prop === "RetrieverActivePivotAggregatesRetriever") {
    state.info.retrieverType = value;
  }
};

const parseContext = (state, line) => {
  const [, key, value] = PLAN_EXPR.exec(line);
  if (key === "ICubeFilter") {
    state.rootFilter = value;
  } else {
    state.info.contextValues[key] = value;
  }
};

const PROP_MAPPING = {
  Continuous: "continuous",
  "Range sharing": "rangeSharing",
  "Missed prefectches": "missedPrefetchBehavior",
  Cache: "aggregatesCache"
};
const parseProps = (state, line) => {
  const [, prop, value] = PLAN_EXPR.exec(line);
  const newProp = PROP_MAPPING[prop];
  if (newProp) {
    state.info[newProp] = value;
  }
};

const TIME_PROP_MAPPING = {
  "Planning time": "PLANNING",
  "Execution context creation time": "CONTEXT",
  "Planning finalization time": "FINALIZATION"
};
const parseTotalTime = (state, line) => {
  const [, prop, value] = PLAN_EXPR.exec(line);
  const newProp = TIME_PROP_MAPPING[prop];
  if (newProp) {
    state.info.globalTimings[newProp] = parseInt(value, 10);
  }
};

const parseExecution = (state, line) => {
  const [, prop, value] = PLAN_EXPR.exec(line);
  if (prop === "Total query execution time") {
    state.info.globalTimings.EXECUTION = parseInt(value, 10);
  }
};

const mapping = {
  "General information:": parseGeneral,
  "Context values:": parseContext,
  "Additional properties:": parseProps,
  "Planning:": parseTotalTime,
  "Execution:": parseExecution,
  "Query plan:": parseLine,
  "Query Plan Summary:": () => {
  } // No-op
};

const parseDefault = (state, line) => {
  const { last: lastLine } = state;
  state.last = line;
  if (line in mapping) {
    return false; // Marker line, we have to wait one turn
  }
  if (line.includes("-----")) {
    state.phase = lastLine;
    return false;
  }
  return state.phase !== undefined;
};

const parseLines = (state, lines, from, to) => {
  for (let i = from; i < to; i += 1) {
    const line = lines[i].trim();
    if (!/^\s*$/.test(line)) {
      if (parseDefault(state, line)) {
        mapping[state.phase](state, line);
      }
    } else {
      state.phase = undefined;
    }
  }
};

const parseV1 = (input, tickCallback) => {
  return new Promise(resolve => {
    const accumulator = {
      info: {
        contextValues: {},
        globalTimings: {}
      },
      root: {
        dependencies: []
      },
      retrievals: {},
      current: null,
      retrievalIndex: new Map(),
      parents: []
    };
    accumulator.parents.push(accumulator.root);

    const lines = input.split(/\n/);
    let currentLine = 0;
    (function loop() {
      if (currentLine < lines.length) {
        const to = Math.min(currentLine + 100, lines.length);
        parseLines(accumulator, lines, currentLine, to);
        currentLine = to;
        tickCallback(currentLine, lines.length);

        setTimeout(loop, 5);
      } else {
        resolve(accumulator);
      }
    })();
  }).then(result => {
    // Iterate through nodes to record parents
    Object.keys(result.retrievals).forEach(rId => {
      const retrieval = result.retrievals[rId];
      retrieval.dependencies.forEach(dId => {
        const dependency = result.retrievals[dId];
        dependency.parents.push(parseInt(rId, 10));
      });
    });

    return result;
  });
};

const parseSourceId = retrieval => {
  const [kind, retrievalIdStr, ...tail] = retrieval.sourceId.split("#");
  const retrievalId = Number.parseInt(retrievalIdStr);
  if (tail.length !== 0 || !Number.isInteger(retrievalId)) {
    throw new Error(`Bad source id: ${retrieval.sourceId}`);
  }
  return { kind, retrievalId };
};

const computeIfAbsent = (dic, key, value) => {
  if (!(key in dic)) {
    dic[key] = value;
  }
  return dic[key];
};

const createDependencyList = (v1Structure) => {
  const result = {
    dependencies: {},
    externalDependencies: {}
  };

  Object.values(v1Structure.retrievals).forEach(retrieval => {
    const { kind, retrievalId } = parseSourceId(retrieval);

    let mapToInsert;
    switch (kind) {
      case "Retrieval":
        mapToInsert = result.dependencies;
        break;
      case "ExternalRetrieval":
        mapToInsert = result.externalDependencies;
        break;
      default:
        throw new Error(`Bad retrieval kind: ${kind}`);
    }

    if (retrieval.parents.length === 0) {
      computeIfAbsent(mapToInsert, "-1", []).push(retrievalId);
    } else {
      retrieval.parents.forEach(parentId => {
        const parentInfo = parseSourceId(v1Structure.retrievals[parentId]);
        if (parentInfo.kind !== "Retrieval") {
          throw new Error("Only aggregate retrievals can have dependencies");
        }
        computeIfAbsent(mapToInsert, parentInfo.retrievalId, []).push(retrievalId);
      });
    }
  });

  return result;
};

const DIMENSION_EXPR = /([\w\s]+)@([\w\s]+):([\w\s\\]+)=(.+)/;
const parseLocation = location => {
  if (location === undefined || location === "GRAND TOTAL") {
    return [];
  }

  return location.split(/\s*,\s*/).map(part => {
    const match = DIMENSION_EXPR.exec(part);
    const level = match[3].split(/\\/);
    const path = match[4]
      .split(/\\/)
      .map(member =>
        member[0] === "[" ? member.substring(1, member.length - 1) : member
      );
    return {
      dimension: match[1],
      hierarchy: match[2],
      level,
      path
    };
  });
};

const parseFields = fields => {
  const regex = /`(([^`]|`\/`)*)`/gm;

  let match;
  let result = [];
  while ((match = regex.exec(fields)) !== null) {
    result.push(match[1].split("`/`").join("/"));
  }

  return result;
};

const parseMeasures = measures => {
  return measures === undefined
    ? []
    : measures.substring(1, measures.length - 1).split(/\s*,\s*/);
};

const parseTimings = (type, props) => {
  if (type.includes("NoOp")) {
    return {};
  }

  const starts = props["Start time   (in ms)"];
  const elapsed = props["Elapsed time (in ms)"];
  if (starts && elapsed) {
    return {
      startTime: JSON.parse(starts),
      elapsedTime: JSON.parse(elapsed)
    };
  }
  return {};
};

const GLOBAL_FILTER = "Global query filter";
const createFilterMap = v1Structure => {
  const filters = Object.values(v1Structure.retrievals).reduce(
    (acc, retrieval) => {
      const filter = retrieval.properties.Filter;
      if (filter && !acc.has(filter)) {
        acc.set(filter, acc.size);
      }
      return acc;
    },
    new Map([[GLOBAL_FILTER, 0]])
  );

  // Reverse the mapping
  const result = {};
  for (
    let it = filters.entries(), entry = it.next();
    !entry.done;
    entry = it.next()
  ) {
    const [filter, idx] = entry.value;
    result[idx] = filter === GLOBAL_FILTER ? v1Structure.rootFilter : filter;
  }
  return result;
};

const findFilter = (filters, needle) => {
  if (needle === GLOBAL_FILTER || needle === undefined) {
    return 0;
  }
  const entries = Object.entries(filters);
  const i = entries.findIndex(e => e[1] === needle);
  return entries[i][0];
};

const mapAggregateRetrieval = (retrieval, filters) => {
  return {
    retrievalId: parseSourceId(retrieval).retrievalId,
    type: retrieval.type,
    location: parseLocation(retrieval.properties.Location),
    measures: parseMeasures(retrieval.properties.Measures),
    timingInfo: parseTimings(retrieval.type, retrieval.properties),
    partitioning: retrieval.properties.Partitioning,
    filterId: findFilter(filters, retrieval.properties.Filter),
    measureProvider: retrieval.properties["Measures provider"],
    underlyingDataNodes: [], // Not supported in previous versions
    resultSizes: []
  };
};

const mapExternalRetrieval = (retrieval, filters) => {
  return {
    retrievalId: parseSourceId(retrieval).retrievalId,
    type: retrieval.type, // This is not provided in V2 json, but we fix it in buildGraph.ts
    store: retrieval.properties.store,
    fields : parseFields(retrieval.properties.fields),
    joinedMeasure: parseMeasures(retrieval.properties.JoinedMeasures),
    condition: retrieval.properties.Condition,
    resultSizes: [],
    timingInfo: parseTimings("", retrieval.properties),
  };
};

const createRetrievalMap = (v1Structure, filters) => {
  const result = {
    aggregateRetrievals: [],
    externalRetrievals: []
  };

  Object
    .values(v1Structure.retrievals)
    .sort((lhs, rhs) => lhs.sourceId.localeCompare(rhs.sourceId))
    .forEach(retrieval => {
      const { kind, retrievalId } = parseSourceId(retrieval);

      let arrayToInsert;
      let mappedRetrieval;

      switch (kind) {
        case "Retrieval":
          arrayToInsert = result.aggregateRetrievals;
          mappedRetrieval = mapAggregateRetrieval(retrieval, filters);
          break;
        case "ExternalRetrieval":
          arrayToInsert = result.externalRetrievals;
          mappedRetrieval = mapExternalRetrieval(retrieval, filters);
          break;
        default:
          throw new Error(`Unexpected retrieval kind: ${kind}`);
      }

      if (retrievalId !== arrayToInsert.length) {
        throw new Error(`Cannot insert ${retrieval.sourceId} because ${kind}#${retrievalId - 1} not found`);
      }

      arrayToInsert.push(mappedRetrieval);
    });

  return result;
};

const createSummary = (aggregateRetrievals, externalRetrievals) => {
  // TODO Add externalRetrievals info
  const measures = _(aggregateRetrievals)
    .flatMap(r => r.measures)
    .uniq()
    .value();

  const retrievalsCountByType = _.countBy(aggregateRetrievals, r => r.type);
  retrievalsCountByType["ExternalDatabaseRetrieval"] = _.size(externalRetrievals);
  const partitioningCountByType = _.countBy(aggregateRetrievals, r => r.partitioning);

  return {
    measures,
    totalRetrievals: _.size(aggregateRetrievals) + _.size(externalRetrievals),
    retrievalsCountByType,
    partitioningCountByType,
    resultSizeByPartitioning: {}, // ???
    partialProviders: [], // ???
    totalExternalResultSize: 0, // ???
  };
};

const convertToV2 = v1Structure => {
  const queryFilters = createFilterMap(v1Structure);
  const { aggregateRetrievals, externalRetrievals } = createRetrievalMap(v1Structure, queryFilters);
  const { dependencies, externalDependencies } = createDependencyList(v1Structure);
  const needFillTimingInfo = aggregateRetrievals.find(r => r.retrievalId === 0).timingInfo.startTime === undefined;
  const querySummary = createSummary(aggregateRetrievals, externalRetrievals);

  return [
    {
      planInfo: v1Structure.info,
      queryFilters,
      aggregateRetrievals,
      externalRetrievals,
      querySummary,
      dependencies,
      externalDependencies,
      needFillTimingInfo
    }
  ];
};

export { parseV1, convertToV2 };
