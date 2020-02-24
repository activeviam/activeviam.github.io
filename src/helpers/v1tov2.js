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
  id: match[1],
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
  "Query plan:": parseLine
};

const parseDefault = (state, line) => {
  const { last: lastLine } = state;
  state.last = line;
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
  if (location === undefined) {
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

const convertToV2 = v1Structure => {
  const dependencies = createDependencyList(v1Structure);
  const queryFilters = createFilterMap(v1Structure);
  const retrievals = createRetrievalMap(v1Structure, queryFilters);
  return [
    {
      planInfo: v1Structure.info,
      dependencies,
      queryFilters,
      retrievals
    }
  ];
};

export { parseV1, convertToV2 };

/**
const INPUTS = [
  `General information:
  -------------------
    ActivePivot: ActivePivotVersion [id=VaR, epoch=59]
    RetrieverActivePivotAggregatesRetriever : Standard aggregates retriever on cube VaR

  Context values:
  --------------
    ISubCubeProperties: null
    IBranch: null
    IAsOfEpoch: null
    ICubeFilter: CubeFilter [underlying=SubCubeProperties [accessGranted=true, grantedMeasures=[], grantedMembers={View={View=[[EQUAL - REGULATORY-EU], [EQUAL - REGULATORY-JFSA-NHI], [EQUAL - REGULATORY-JFSA-NSC], [EQUAL - REGULATORY-USA], [EQUAL - REGULATORY-UKFSA]]}}, subCubeTrees={View={View=com.quartetfs.biz.pivot.context.subcube.impl.SubCubeTree@7c7e2a7a}}],hash=1141194390]

  Additional properties:
  ---------------------
    Continuous: false
    Range sharing: 1000000
    Missed prefetches: WARN
    Cache: capacity=0, size=0

  Planning:
  --------
    Planning time: 0ms
      Execution context creation time: 0ms
    Planning finalization time: 12ms

  Execution:
  ---------
    Total query execution time: 18062ms

  Query plan:
  ----------
  Retrieval #0: BitmapPrimitiveAggregatesRetrieval
      Location= dimension 0@dimension 0:currency\\desk\\type=[*]\\[*]\\[*],dimension 1@dimension 1:year=[*]
      Measures= [value.SUM]
      Filter= Global query filter
      Partitioning= Constant partitioning
      Measures provider= SimpleMeasuresProvider
	    Start time   (in ms)= [0, 1, 2]
		  Elapsed time (in ms)= [4, 2, 1]
  Retrieval #1: PostProcessedAggregatesRetrieval
      Location= dimension 0@dimension 0:currency\\desk\\type=[*]\\[*]\\[*],dimension 1@dimension 1:year=[*]
      Measures= [PP2.BasicPP2]
      Filter= Global query filter
      Partitioning= Constant partitioning
      Measures provider= SimpleMeasuresProvider
	    Start time   (in ms)= [0, 1, 2]
		  Elapsed time (in ms)= [4, 2, 1]
   which depends on {
      Retrieval #2: PostProcessedAggregatesRetrieval
          Location= dimension 0@dimension 0:currency\\desk\\type=[*]\\[*]\\[*],dimension 1@dimension 1:year=[*]
          Measures= [PP1.BasicPP1]
          Filter= Global query filter
          Partitioning= Constant partitioning
          Measures provider= SimpleMeasuresProvider
          Start time   (in ms)= [0, 1, 2]
          Elapsed time (in ms)= [4, 2, 1]
       which depends on {
          Retrieval #0: BitmapPrimitiveAggregatesRetrieval (see above for dependencies)
      }
      Retrieval #0: BitmapPrimitiveAggregatesRetrieval (see above for dependencies)
  }
  Retrieval #3: PostProcessedAggregatesRetrieval
      Location= dimension 0@dimension 0:currency\\desk=[*]\\[*],dimension 1@dimension 1:year=[*]
      Measures= [PP2.BasicPP2]
      Filter= Global query filter
      Partitioning= Constant partitioning
      Measures provider= SimpleMeasuresProvider
	    Start time   (in ms)= [0, 1, 2]
		  Elapsed time (in ms)= [4, 2, 1]
   which depends on {
      Retrieval #4: RangeSharingLinearPostProcessorAggregatesRetrieval
          Location= dimension 0@dimension 0:currency\\desk=[*]\\[*],dimension 1@dimension 1:year=[*]
          Measures= [PP1.BasicPP1]
          Filter= Global query filter
          Partitioning= Constant partitioning
          Measures provider= SimpleMeasuresProvider
          Start time   (in ms)= [0, 1, 2]
          Elapsed time (in ms)= [4, 2, 1]
       which depends on {
          Retrieval #2: PostProcessedAggregatesRetrieval (see above for dependencies)
          Retrieval #5: NoOpPrimitiveAggregatesRetrieval
              Simple placeholder (no work done in this retrieval)
              Partitioning= Constant partitioning
              Start time   (in ms)= [0, 1, 2]
              Elapsed time (in ms)= [4, 2, 1]
      }
      Retrieval #5: NoOpPrimitiveAggregatesRetrieval (see above for dependencies)
  }
  Retrieval #6: PostProcessedAggregatesRetrieval
      Location= dimension 1@dimension 1:year=[*]
      Measures= [PP2.BasicPP2]
      Filter= Global query filter
      Partitioning= Constant partitioning
      Measures provider= SimpleMeasuresProvider
	    Start time   (in ms)= [0, 1, 2]
		  Elapsed time (in ms)= [4, 2, 1]
   which depends on {
      Retrieval #7: RangeSharingLinearPostProcessorAggregatesRetrieval
          Location= dimension 1@dimension 1:year=[*]
          Measures= [PP1.BasicPP1]
          Filter= Global query filter
          Partitioning= Constant partitioning
          Measures provider= SimpleMeasuresProvider
          Start time   (in ms)= [0, 1, 2]
          Elapsed time (in ms)= [4, 2, 1]
       which depends on {
          Retrieval #8: RangeSharingLinearPostProcessorAggregatesRetrieval
              Location= dimension 0@dimension 0:currency=[*],dimension 1@dimension 1:year=[*]
              Measures= [PP1.BasicPP1]
              Filter= Global query filter
              Partitioning= Constant partitioning
              Measures provider= SimpleMeasuresProvider
              Start time   (in ms)= [0, 1, 2]
              Elapsed time (in ms)= [4, 2, 1]
           which depends on {
              Retrieval #4: RangeSharingLinearPostProcessorAggregatesRetrieval (see above for dependencies)
              Retrieval #9: NoOpPrimitiveAggregatesRetrieval
                  Simple placeholder (no work done in this retrieval)
                  Partitioning= Constant partitioning
          }
          Retrieval #10: NoOpPrimitiveAggregatesRetrieval
              Simple placeholder (no work done in this retrieval)
              Partitioning= Constant partitioning
      }
      Retrieval #10: NoOpPrimitiveAggregatesRetrieval (see above for dependencies)
  }
  Retrieval #11: PostProcessedAggregatesRetrieval
      Location= dimension 0@dimension 0:currency=[*],dimension 1@dimension 1:year=[*]
      Measures= [PP2.BasicPP2]
      Filter= Global query filter
      Partitioning= Constant partitioning
      Measures provider= SimpleMeasuresProvider
	    Start time   (in ms)= [0, 1, 2]
		  Elapsed time (in ms)= [4, 2, 1]
   which depends on {
      Retrieval #8: RangeSharingLinearPostProcessorAggregatesRetrieval (see above for dependencies)
      Retrieval #9: NoOpPrimitiveAggregatesRetrieval (see above for dependencies)
  }
  Retrieval #2: PostProcessedAggregatesRetrieval (see above for dependencies)
  Retrieval #4: RangeSharingLinearPostProcessorAggregatesRetrieval (see above for dependencies)
  Retrieval #7: RangeSharingLinearPostProcessorAggregatesRetrieval (see above for dependencies)
  Retrieval #8: RangeSharingLinearPostProcessorAggregatesRetrieval (see above for dependencies)`,

  `General information:
  -------------------
    ActivePivot: ActivePivotVersion [id=VaR, epoch=59]
    RetrieverActivePivotAggregatesRetriever : Standard aggregates retriever on cube VaR

  Context values:
  --------------
    ISubCubeProperties: null
    IBranch: null
    IAsOfEpoch: null
    ICubeFilter: CubeFilter [underlying=SubCubeProperties [accessGranted=true, grantedMeasures=[], grantedMembers={View={View=[[EQUAL - REGULATORY-EU], [EQUAL - REGULATORY-JFSA-NHI], [EQUAL - REGULATORY-JFSA-NSC], [EQUAL - REGULATORY-USA], [EQUAL - REGULATORY-UKFSA]]}}, subCubeTrees={View={View=com.quartetfs.biz.pivot.context.subcube.impl.SubCubeTree@7c7e2a7a}}],hash=1141194390]

  Additional properties:
  ---------------------
    Continuous: false
    Range sharing: 1000000
    Missed prefetches: WARN
    Cache: capacity=0, size=0

  Planning:
  --------
    Planning time: 0ms
      Execution context creation time: 0ms
    Planning finalization time: 12ms

  Execution:
  ---------
    Total query execution time: 18062ms

  Query plan:
  ----------
  Retrieval #0: BitmapPrimitiveAggregatesRetrieval
      Location= dimension 0@dimension 0:currency\\desk\\type=[*]\\[*]\\[*],dimension 1@dimension 1:year=[*]
      Measures= [value.SUM]
      Filter= Global query filter
      Partitioning= Constant partitioning
      Measures provider= SimpleMeasuresProvider
	    Start time   (in ms)= [0, 1, 2]
		  Elapsed time (in ms)= [4, 2, 1]
  which depends on {
    Retrieval #1: PostProcessedAggregatesRetrieval
        Location= dimension 0@dimension 0:currency\\desk\\type=[*]\\[*]\\[*],dimension 1@dimension 1:year=[*]
        Measures= [PP2.BasicPP2]
        Filter= Global query filter
        Partitioning= Constant partitioning
        Measures provider= SimpleMeasuresProvider
        Start time   (in ms)= [0, 1, 2]
        Elapsed time (in ms)= [4, 2, 1]
    which depends on {
        Retrieval #2: PostProcessedAggregatesRetrieval
            Location= dimension 0@dimension 0:currency\\desk\\type=[*]\\[*]\\[*],dimension 1@dimension 1:year=[*]
            Measures= [PP1.BasicPP1]
            Filter= Global query filter
            Partitioning= Constant partitioning
            Measures provider= SimpleMeasuresProvider
            Start time   (in ms)= [0, 1, 2]
            Elapsed time (in ms)= [4, 2, 1]
        which depends on {
          Retrieval #3: PostProcessedAggregatesRetrieval
              Location= dimension 0@dimension 0:currency\\desk=[*]\\[*],dimension 1@dimension 1:year=[*]
              Measures= [PP2.BasicPP2]
              Filter= Global query filter
              Partitioning= Constant partitioning
              Measures provider= SimpleMeasuresProvider
              Start time   (in ms)= [0, 1, 2]
              Elapsed time (in ms)= [4, 2, 1]
          which depends on {
              Retrieval #4: RangeSharingLinearPostProcessorAggregatesRetrieval
                  Location= dimension 0@dimension 0:currency\\desk=[*]\\[*],dimension 1@dimension 1:year=[*]
                  Measures= [PP1.BasicPP1]
                  Filter= Global query filter
                  Partitioning= Constant partitioning
                  Measures provider= SimpleMeasuresProvider
                  Start time   (in ms)= [0, 1, 2]
                  Elapsed time (in ms)= [4, 2, 1]
          }
          Retrieval #4: RangeSharingLinearPostProcessorAggregatesRetrieval (see above for dependencies)
        }
      Retrieval #4: RangeSharingLinearPostProcessorAggregatesRetrieval (see above for dependencies)
      }
      Retrieval #4: RangeSharingLinearPostProcessorAggregatesRetrieval (see above for dependencies)
    }
  }`
];

const main = async () => {
  const v1Structure = await parseV1(INPUTS[1], () => {});
  console.log(v1Structure);
  const v2Structure = convertToV2(v1Structure);
  console.log(v2Structure);
};

main();
// */
