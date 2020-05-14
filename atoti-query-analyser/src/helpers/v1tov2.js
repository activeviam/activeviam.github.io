import _ from "lodash";

const RETRIEVAL = /Retrieval #(\d+): ([\w_]+)( \(see)?/;
const PROPERTY_EXPR = /\s*([\w\-_ ()]+)= (.+)\s*/;
const PIVOT_EXPR = /\s*(\w+)\s+\[id=(.+?), epoch=(\d+)]/;
const PLAN_EXPR = /\s*([\w\-_ ()]+?)\s*: (.+)\s*/;
const PARTITION_RESULT = /(?:^|\s+)Result for (\d+)\s*: (EMPTY|.*)/;
const DEPENDENCY_START = /which depends on \{/;
const DEPENDENCY_END = /^\s*}\s*$/;
const PARTITION_PROPERTY = "Contributed partitions";
const last = array => (array.length > 0 ? array[array.length - 1] : undefined);
const parseNewRetrieval = (_line, match) => ({
  id: parseInt(match[1], 10),
  type: match[2],
  ref: match[3] !== undefined,
  dependencies: [],
  parents: [],
  properties: {}
});
const parseProperty = (_line, match) => ({
  key: match[1],
  value: match[2]
});

const matchLine = (line, matchClauses) => {
  const entries = matchClauses.entries();
  for (let entry = entries.next(); !entry.done; entry = entries.next()) {
    const [expr, action] = entry.value;
    const match = expr.exec(line);
    if (match !== null) {
      action(match);
      return;
    }
  }
};

const parseLine = (state, line) => {
  const clauses = new Map();
  clauses.set(RETRIEVAL, match => {
    const retrieval = parseNewRetrieval(line, match);
    if (retrieval.ref) {
      state.current = state.retrievals[retrieval.id];
    } else {
      state.current = retrieval;
      state.retrievals[retrieval.id] = retrieval;
    }

    const parent = last(state.parents);
    if (parent) {
      parent.dependencies.push(parseInt(retrieval.id, 10));
    }
  });
  clauses.set(PARTITION_RESULT, match => {
    // Before properties as results contain '=' and more
    const partitionId = match[1];
    const result = match[2];
    if (result !== "EMPTY") {
      const partitions = state.current.properties[PARTITION_PROPERTY] || [];
      partitions.push(partitionId);
      state.current.properties[PARTITION_PROPERTY] = partitions;
    }
  });
  clauses.set(PROPERTY_EXPR, match => {
    const property = parseProperty(line, match);
    state.current.properties[property.key] = property.value;
  });
  clauses.set(DEPENDENCY_START, () => state.parents.push(state.current));
  clauses.set(DEPENDENCY_END, () => state.parents.pop());
  matchLine(line, clauses);
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
  "Query Plan Summary:": () => {} // No-op
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

const computeIfAbsent = (dic, key, value) => {
  if (!(key in dic)) {
    dic[key] = value;
  }
  return dic[key];
};

const createDependencyList = v1Structure => {
  return Object.values(v1Structure.retrievals).reduce(
    (acc, retrieval) => {
      if (retrieval.parents.length === 0) {
        computeIfAbsent(acc, "-1", []).push(retrieval.id);
      } else {
        retrieval.parents.forEach(rId =>
          computeIfAbsent(acc, rId, []).push(retrieval.id)
        );
      }
      return acc;
    },
    { "-1": [] }
  );
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
const parseMeasures = measures => {
  return measures === undefined
    ? []
    : measures.substring(1, measures.length - 1).split(/\s*,\s*/);
};
const parseTimings = props => {
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

const createRetrievalMap = (v1Structure, filters) => {
  return Object.values(v1Structure.retrievals).map(retrieval => {
    return {
      retrId: parseInt(retrieval.id, 10),
      type: retrieval.type,
      location: parseLocation(retrieval.properties.Location),
      measures: parseMeasures(retrieval.properties.Measures),
      timingInfo: parseTimings(retrieval.properties),
      partitioning: retrieval.properties.Partitioning,
      filterId: findFilter(filters, retrieval.properties.Filter),
      measureProvider: retrieval.properties["Measures provider"],
      underlyingDataNodes: [] // Not supported in previous versions
    };
  });
};

const reverseDependencies = dependencies => {
  return Object.keys(dependencies)
    .map(i => parseInt(i, 10))
    .reduce((acc, parent) => {
      return dependencies[parent]
        .map(i => parseInt(i, 10))
        .reduce((a, id) => {
          let set = a.get(id);
          if (!set) {
            set = new Set();
            a.set(id, set);
          }
          set.add(parent);
          return a;
        }, acc);
    }, new Map());
};

const computeFakeStart = (id, retrievals, dependencies) => {
  const start = Math.max(
    ...dependencies[id]
      .map(i => retrievals.get(parseInt(i, 10)).timingInfo)
      .map(({ startTime }) => (startTime ? startTime[0] : 0))
  );
  return start + 10;
};

const setSimulatedTimeInfo = (retrievals, dependencies) => {
  const dependents = reverseDependencies(dependencies);
  const retrMap = retrievals.reduce((acc, r) => {
    acc.set(r.retrId, r);
    return acc;
  }, new Map());

  // Set a default duration
  retrievals.forEach(r => {
    if (!r.type.includes("NoOp")) {
      r.timingInfo.elapsedTime = [10];
      const deps = dependencies[r.retrId];
      r.timingInfo.startTime = [deps ? -deps.length : 0];
    }
  });

  const queue = retrievals
    .filter(r => r.type.includes("NoOp") || r.timingInfo.startTime[0] === 0)
    .map(r => r.retrId);
  let safeCount = 0;
  while (queue.length > 0) {
    if (safeCount > 5000) {
      console.log("oops. Too much");
      return;
    }
    safeCount += 1;

    const id = queue.shift();
    dependents.get(id).forEach(did => {
      const parent = retrMap.get(did);
      if (did !== -1 && ++parent.timingInfo.startTime[0] === 0) {
        parent.timingInfo.startTime[0] = computeFakeStart(
          did,
          retrMap,
          dependencies
        );
        queue.push(did);
      }
    });
  }

  const incomplete = retrievals
    .filter(r => r.timingInfo.startTime && r.timingInfo.startTime[0] < 0)
    .map(r => r.retrId);
  if (incomplete.length > 0) {
    throw new Error(`Remaining retrievals without timings: ${incomplete}`);
  }
};

const createSummary = retrievals => {
  const measures = _(retrievals)
    .flatMap(r => r.measures)
    .uniq()
    .value();

  const retrievalCountByType = _.countBy(retrievals, r => r.type);
  const partitioningCountByType = _.countBy(retrievals, r => r.partitioning);

  return {
    measures,
    totalRetrievals: _.size(retrievals),
    retrievalCountByType,
    partitioningCountByType
  };
};

const convertToV2 = v1Structure => {
  const dependencies = createDependencyList(v1Structure);
  const queryFilters = createFilterMap(v1Structure);
  const retrievals = createRetrievalMap(v1Structure, queryFilters);
  if (retrievals[0].timingInfo.startTime === undefined) {
    setSimulatedTimeInfo(retrievals, dependencies);
  }
  const querySummary = createSummary(retrievals);

  return [
    {
      planInfo: v1Structure.info,
      dependencies,
      queryFilters,
      retrievals,
      querySummary
    }
  ];
};

export { parseV1, convertToV2 };
