import _ from "lodash";
import { Dictionary } from "../dataStructures/common/dictionary";
import { CubeLocation } from "../dataStructures/json/cubeLocation";
import { Filter } from "../dataStructures/json/filter";
import {
  AggregateRetrieval,
  AggregateRetrievalKind,
  ExternalRetrieval,
  ExternalRetrievalKind,
} from "../dataStructures/json/retrieval";
import { asError, requireNonNull } from "../utilities/util";

const RETRIEVAL = /(\w*Retrieval) #(\d+): ([\w_]+)( \(see)?/;
const PROPERTY_EXPR = /\s*([\w\-_ ()]+)= (.+)\s*/;
const PIVOT_EXPR = /\s*(\w+)\s+\[id=(.+?), epoch=(\d+)]/;
const PLAN_EXPR = /\s*([\w\-_ ()]+?)\s*: (.+)\s*/;
const PARTITION_RESULT = /(?:^|\s+)Result for (\d+)\s*: (EMPTY|.*)/;
const DEPENDENCY_START = /which depends on \{/;
const DEPENDENCY_END = /^\s*}\s*$/;

/** Gets last element of array or `undefined` if it is empty. */
function last<T>(array: T[]): T | undefined {
  return array.length > 0 ? array[array.length - 1] : undefined;
}

function parseNewRetrieval(
  state: V1Structure,
  _line: string,
  match: RegExpMatchArray
): V1Retrieval {
  const sourceId = `${match[1]}#${match[2]}`;
  if (!state.retrievalIndex.has(sourceId)) {
    state.retrievalIndex.set(sourceId, state.retrievalIndex.size);
  }
  const id = state.retrievalIndex.get(sourceId) as number;

  return {
    id,
    sourceId,
    type: match[3],
    ref: match[4] !== undefined,
    dependencies: [],
    parents: [],
    properties: {},
  };
}

function parseProperty(_line: string, match: RegExpMatchArray) {
  return {
    key: match[1],
    value: match[2],
  };
}

function matchLine(
  state: V1Structure,
  line: string,
  matchClauses: Map<RegExp, OnRegExpMatchAction>
) {
  const entries = matchClauses.entries();
  for (let entry = entries.next(); !entry.done; entry = entries.next()) {
    const [expr, action] = entry.value;
    const match = expr.exec(line);
    if (match !== null) {
      action(state, match, line);
      return;
    }
  }
}

type OnRegExpMatchAction = (
  state: V1Structure,
  match: RegExpMatchArray,
  line: string
) => void;

const RETRIEVAL_CLAUSES = new Map<RegExp, OnRegExpMatchAction>([
  [
    RETRIEVAL,
    (state, match, line) => {
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
    },
  ],
  [
    PARTITION_RESULT,
    (state, match) => {
      // Before properties as results contain '=' and more
      const partitionId = match[1];
      const result = match[2];
      if (result !== "EMPTY") {
        const partitions = requireNonNull(state.current).partitions || [];
        partitions.push(partitionId);
        requireNonNull(state.current).partitions = partitions;
      }
    },
  ],
  [
    PROPERTY_EXPR,
    (state, match, line) => {
      const property = parseProperty(line, match);
      requireNonNull(state.current).properties[property.key] = property.value;
    },
  ],
  [
    DEPENDENCY_START,
    (state) => state.parents.push(requireNonNull(state.current)),
  ],
  [DEPENDENCY_END, (state) => state.parents.pop()],
]);

function parseLine(state: V1Structure, line: string) {
  matchLine(state, line, RETRIEVAL_CLAUSES);
}

function parseGeneral(state: V1Structure, line: string) {
  const [, prop, value] = requireNonNull(PLAN_EXPR.exec(line));
  if (prop === "ActivePivot") {
    const [, type, id, epoch] = requireNonNull(PIVOT_EXPR.exec(value));
    state.info.pivotType = type;
    state.info.pivotId = id;
    state.info.epoch = epoch;
  } else if (prop === "RetrieverActivePivotAggregatesRetriever") {
    state.info.retrieverType = value;
  }
}

function parseContext(state: V1Structure, line: string) {
  const [, key, value] = requireNonNull(PLAN_EXPR.exec(line));
  if (key === "ICubeFilter") {
    state.rootFilter = value;
  } else {
    state.info.contextValues[key] = value;
  }
}

const PROP_MAPPING: { [key: string]: V1InfoKeyType } = {
  Continuous: "isContinuous",
  "Range sharing": "rangeSharing",
  "Missed prefetches": "missedPrefetchBehavior",
  Cache: "aggregatesCache",
};

function parseProps(state: V1Structure, line: string) {
  const [, prop, value] = requireNonNull(PLAN_EXPR.exec(line));
  const newProp = PROP_MAPPING[prop];
  if (newProp) {
    state.info[newProp] = value;
  } else {
    state.info.$parseErrors[prop] = value;
  }
}

type V1GlobalTimingsKeyType =
  | "PLANNING"
  | "CONTEXT"
  | "FINALIZATION"
  | "EXECUTION";

const TIME_PROP_MAPPING: { [key: string]: V1GlobalTimingsKeyType } = {
  "Planning time": "PLANNING",
  "Execution context creation time": "CONTEXT",
  "Planning finalization time": "FINALIZATION",
};

function parseTotalTime(state: V1Structure, line: string) {
  const [, prop, value] = requireNonNull(PLAN_EXPR.exec(line));
  const newProp = TIME_PROP_MAPPING[prop];
  if (newProp) {
    state.info.globalTimings[newProp] = parseInt(value, 10);
  }
}

function parseExecution(state: V1Structure, line: string) {
  const [, prop, value] = requireNonNull(PLAN_EXPR.exec(line));
  if (prop === "Total query execution time") {
    state.info.globalTimings.EXECUTION = parseInt(value, 10);
  }
}

const SECTION_MAPPING: {
  [sectionName: string]: (state: V1Structure, line: string) => void;
} = {
  "General information:": parseGeneral,
  "Context values:": parseContext,
  "Additional properties:": parseProps,
  "Planning:": parseTotalTime,
  "Execution:": parseExecution,
  "Query plan:": parseLine,
  "Query Plan Summary:": () => {}, // No-op
};

function parseDefault(state: V1Structure, line: string): boolean {
  const { last: lastLine } = state;
  state.last = line;
  if (line in SECTION_MAPPING) {
    return false; // Marker line, we have to wait one turn
  }
  if (line.includes("-----")) {
    state.phase = lastLine;
    return false;
  }
  return state.phase !== undefined;
}

function parseLines(
  state: V1Structure,
  lines: string[],
  from: number,
  to: number
) {
  for (let i = from; i < to; i += 1) {
    const line = lines[i].trim();
    if (!/^\s*$/.test(line)) {
      if (parseDefault(state, line)) {
        SECTION_MAPPING[requireNonNull(state.phase)](state, line);
      }
    } else {
      state.phase = undefined;
    }
  }
}

interface V1Retrieval {
  id: number;
  sourceId: string;
  type: string;
  ref: boolean;
  parents: number[];
  properties: { [key: string]: string };
  partitions?: string[];
  dependencies: number[];
}

type V1InfoKeyType =
  | "pivotType"
  | "pivotId"
  | "epoch"
  | "retrieverType"
  | "isContinuous"
  | "rangeSharing"
  | "missedPrefetchBehavior"
  | "aggregatesCache";

type V1Info = {
  contextValues: { [key: string]: string };
  globalTimings: { [key in V1GlobalTimingsKeyType]?: number };
  $parseErrors: { [key: string]: string };
} & {
  [key in V1InfoKeyType]?: string;
};

interface V1Structure {
  phase?: string;
  last?: string;
  info: V1Info;
  root: V1Retrieval;
  retrievals: V1Retrieval[];
  current: V1Retrieval | null;
  retrievalIndex: Map<string, number>;
  parents: V1Retrieval[];
  rootFilter?: string;
}

/**
 * Parse logs
 */
async function parseV1(
  input: string,
  tickCallback: (currentLine: number, lineCount: number) => void
): Promise<V1Structure> {
  const result = await new Promise<V1Structure>((resolve) => {
    const accumulator: V1Structure = {
      info: {
        contextValues: {},
        globalTimings: {},
        $parseErrors: {},
      },
      root: {
        id: NaN,
        sourceId: "ROOT",
        type: "ROOT",
        ref: false,
        parents: [],
        properties: {},
        dependencies: [],
      },
      retrievals: [],
      current: null,
      retrievalIndex: new Map(),
      parents: [],
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
  });
  result.retrievals.forEach((retrieval, rId) => {
    retrieval.dependencies.forEach((dId) => {
      const dependency = result.retrievals[dId];
      dependency.parents.push(rId);
    });
  });
  return result;
}

function parseSourceId(retrieval: V1Retrieval) {
  const [kind, retrievalIdStr, ...tail] = retrieval.sourceId.split("#");
  const retrievalId = Number.parseInt(retrievalIdStr);
  if (tail.length !== 0 || !Number.isInteger(retrievalId)) {
    throw new Error(`Bad source id: ${retrieval.sourceId}`);
  }
  return { kind, retrievalId };
}

function computeIfAbsent<V>(dic: { [key: string]: V }, key: string, value: V) {
  if (!(key in dic)) {
    dic[key] = value;
  }
  return dic[key];
}

function createDependencyList(v1Structure: V1Structure) {
  const result = {
    dependencies: {},
    externalDependencies: {},
  };

  Object.values(v1Structure.retrievals).forEach((retrieval) => {
    const { kind, retrievalId } = parseSourceId(retrieval);

    let mapToInsert: { [key: string]: number[] };
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
      retrieval.parents.forEach((parentId) => {
        const parentInfo = parseSourceId(v1Structure.retrievals[parentId]);
        if (parentInfo.kind !== "Retrieval") {
          throw new Error("Only aggregate retrievals can have dependencies");
        }
        computeIfAbsent(mapToInsert, `${parentInfo.retrievalId}`, []).push(
          retrievalId
        );
      });
    }
  });

  return result;
}

class LocationParser {
  private pos = 0;

  private result: CubeLocation[] = [];

  private readonly listeners: Set<(char: string) => void> = new Set();

  constructor(private text: string) {
    this.reset();
  }

  reset() {
    this.pos = 0;
    this.result = [];
    this.listeners.clear();
  }

  parse(): CubeLocation[] {
    this.reset();
    while (this.peek() !== null) {
      this.result.push(this.parseLocationChunk());
      this.consume(",", null);
    }
    return this.result;
  }

  private addListener(listener: (char: string) => void) {
    this.listeners.add(listener);
  }

  private removeListener(listener: (char: string) => void) {
    this.listeners.delete(listener);
  }

  private peek(): string | null {
    return this.pos < this.text.length ? this.text.charAt(this.pos) : null;
  }

  private next(): string | null {
    if (this.pos >= this.text.length) {
      return null;
    }
    const char = this.text.charAt(this.pos++);
    this.listeners.forEach((listener) => listener(char));
    return char;
  }

  private consume(...chars: (string | null)[]) {
    const nextChar = this.peek();
    if (chars.includes(nextChar)) {
      this.next();
    } else {
      throw new Error(
        `Expected ${chars
          .map((ch) => JSON.stringify(ch))
          .join(" or ")}, got ${JSON.stringify(nextChar)}`
      );
    }
  }

  private readUntil(...chars: (string | null)[]) {
    const failureMessage = `, expected ${chars
      .map((ch) => JSON.stringify(ch))
      .join(" or ")}`;
    const predicate = (char: string | null) => chars.includes(char);
    return this.readUntilPredicate(predicate, failureMessage);
  }

  private readUntilPredicate(
    predicate: (char: string | null) => boolean,
    failureMessage?: string | (() => string)
  ) {
    const beginPos = this.pos;

    while (true) {
      const nextChar = this.peek();
      if (predicate(nextChar)) {
        break;
      }
      if (nextChar === null) {
        let msg = "Unexpected end of line";
        if (typeof failureMessage === "string") {
          msg += ": " + failureMessage;
        } else if (typeof failureMessage === "function") {
          msg += ": " + failureMessage();
        }
        throw new Error(msg);
      }
      this.next();
    }

    return this.text.substring(beginPos, this.pos);
  }

  private parseLocationChunk(): CubeLocation {
    const dimension = this.parseDimension();
    this.consume("@");

    const hierarchy = this.parseHierarchy();
    this.consume(":");

    const levels = this.parseLevels();
    this.consume("=");

    const members = this.parseMembers();

    return {
      dimension,
      hierarchy,
      level: levels,
      path: members,
    };
  }

  private parseDimension(): string {
    return this.readUntil("@");
  }

  private parseHierarchy(): string {
    return this.readUntil(":");
  }

  private parseLevels(): string[] {
    const levels = [];
    while (true) {
      levels.push(this.readUntil("=", "\\"));
      if (this.peek() === "\\") {
        this.next();
      } else {
        break;
      }
    }
    return levels;
  }

  private parseMembers(): string[] {
    const members = [];

    while (true) {
      let bracketBalance = 0;

      const onCharObserver = (char: string) => {
        if (char === "[") {
          ++bracketBalance;
        } else if (char === "]") {
          --bracketBalance;
        }
      };

      const predicate = (char: string | null) =>
        bracketBalance === 0 &&
        (char === "\\" || char === "," || char === null);

      try {
        this.addListener(onCharObserver);
        members.push(
          this.readUntilPredicate(
            predicate,
            () => `missing ${bracketBalance} closing braces`
          )
        );
      } finally {
        this.removeListener(onCharObserver);
      }

      if (this.peek() === "\\") {
        this.next();
      } else {
        break;
      }
    }

    return members;
  }
}

function parseLocation(
  location: string,
  onRecoverableError: (error: Error) => void
): CubeLocation[] {
  if (location === undefined || location === "GRAND TOTAL") {
    return [];
  }

  try {
    return new LocationParser(location).parse();
  } catch (error) {
    onRecoverableError(asError(error));
    return [];
  }
}

function parseFields(fields: string) {
  const regex = /`(([^`]|`\/`)*)`/gm;

  let match;
  const result = [];
  while ((match = regex.exec(fields)) !== null) {
    result.push(match[1].split("`/`").join("/"));
  }

  return result;
}

function parseMeasures(measures: string) {
  return measures === undefined
    ? []
    : measures.substring(1, measures.length - 1).split(/\s*,\s*/);
}

function parseTimings(type: string, props: { [key: string]: string }) {
  if (type.includes("NoOp")) {
    return {};
  }

  const starts = props["Start time   (in ms)"];
  const elapsed = props["Elapsed time (in ms)"];
  if (starts && elapsed) {
    return {
      startTime: JSON.parse(starts),
      elapsedTime: JSON.parse(elapsed),
    };
  }
  return {};
}

const GLOBAL_FILTER = "Global query filter";

function createFilterMap(v1Structure: V1Structure) {
  const filterDictionary = new Dictionary<string>();
  filterDictionary.index(GLOBAL_FILTER);

  Object.values(v1Structure.retrievals)
    .map((retrieval) => retrieval.properties.Filter)
    .filter((filter) => filter !== undefined)
    .forEach((filter) => {
      filterDictionary.index(filter);
    });

  const filterList: Filter[] = Array.from(filterDictionary.entries())
    .map(([description, id]) => ({ id, description }))
    .sort((lhs, rhs) => lhs.id - rhs.id);

  filterList[filterDictionary.index(GLOBAL_FILTER)].description =
    requireNonNull(v1Structure.rootFilter);
  return { filterList, filterDictionary };
}

function mapAggregateRetrieval(
  retrieval: V1Retrieval,
  filterDictionary: Dictionary<string>,
  onRecoverableError: (error: Error) => void
): AggregateRetrieval {
  return {
    $kind: AggregateRetrievalKind,
    retrievalId: parseSourceId(retrieval).retrievalId,
    partialProviderName: "N/A",
    type: retrieval.type,
    location: parseLocation(retrieval.properties.Location, onRecoverableError),
    measures: parseMeasures(retrieval.properties.Measures),
    timingInfo: parseTimings(retrieval.type, retrieval.properties),
    partitioning: retrieval.properties.Partitioning,
    filterId: requireNonNull(
      filterDictionary.get(retrieval.properties.Filter || GLOBAL_FILTER)
    ),
    measureProvider: retrieval.properties["Measures provider"],
    underlyingDataNodes: [], // Not supported in previous versions
    resultSizes: [],
  };
}

function mapExternalRetrieval(retrieval: V1Retrieval): ExternalRetrieval {
  return {
    $kind: ExternalRetrievalKind,
    retrievalId: parseSourceId(retrieval).retrievalId,
    type: retrieval.type, // This is not provided in V2 json, but we fix it in buildGraph.ts
    store: retrieval.properties.store,
    fields: parseFields(retrieval.properties.fields),
    joinedMeasure: parseMeasures(retrieval.properties.JoinedMeasures),
    condition: retrieval.properties.Condition,
    resultSizes: [],
    timingInfo: parseTimings("", retrieval.properties),
  };
}

function createRetrievalMap(
  v1Structure: V1Structure,
  filterDictionary: Dictionary<string>,
  onRecoverableError: (error: Error) => void
) {
  return Object.values(v1Structure.retrievals)
    .sort(
      (lhs, rhs) =>
        parseSourceId(lhs).retrievalId - parseSourceId(rhs).retrievalId
    )
    .reduce(
      (
        {
          aggregateRetrievals,
          externalRetrievals,
        }: {
          aggregateRetrievals: AggregateRetrieval[];
          externalRetrievals: ExternalRetrieval[];
        },
        retrieval
      ) => {
        const { kind, retrievalId } = parseSourceId(retrieval);

        const tryPush = <T>(
          arrayToInsert: T[],
          mapper: (
            retrieval: V1Retrieval,
            filterDictionary: Dictionary<string>,
            onRecoverableError: (error: Error) => void
          ) => T
        ) => {
          const mappedRetrieval = mapper(
            retrieval,
            filterDictionary,
            onRecoverableError
          );

          if (retrievalId !== arrayToInsert.length) {
            throw new Error(
              `Cannot insert ${retrieval.sourceId} because ${kind}#${
                retrievalId - 1
              } not found`
            );
          }

          arrayToInsert.push(mappedRetrieval);
        };

        switch (kind) {
          case "Retrieval":
            tryPush(aggregateRetrievals, mapAggregateRetrieval);
            break;
          case "ExternalRetrieval":
            tryPush(externalRetrievals, mapExternalRetrieval);
            break;
          default:
            throw new Error(`Unexpected retrieval kind: ${kind}`);
        }
        return { aggregateRetrievals, externalRetrievals };
      },
      { aggregateRetrievals: [], externalRetrievals: [] }
    );
}

function createSummary(
  aggregateRetrievals: AggregateRetrieval[],
  externalRetrievals: ExternalRetrieval[]
) {
  // TODO Add externalRetrievals info
  const measures = _(aggregateRetrievals)
    .flatMap((r) => r.measures)
    .uniq()
    .value();

  const retrievalsCountByType = _.countBy(aggregateRetrievals, (r) => r.type);
  retrievalsCountByType.ExternalDatabaseRetrieval = _.size(externalRetrievals);
  const partitioningCountByType = _.countBy(
    aggregateRetrievals,
    (r) => r.partitioning
  );

  return {
    measures,
    totalRetrievals: _.size(aggregateRetrievals) + _.size(externalRetrievals),
    retrievalsCountByType,
    partitioningCountByType,
    resultSizeByPartitioning: {}, // N/A
    partialProviders: [], // N/A
    totalExternalResultSize: 0, // N/A
  };
}

function createPlanInfo(info: V1Info) {
  return {
    branch: "N/A",
    ...info,
  };
}

/**
 * Convert the result of {@link parseV1 parseV1()} call to
 * {@link "library/dataStructures/json/jsonQueryPlan"!JsonQueryPlan JsonQueryPlan}.
 */
export function convertToV2(v1Structure: V1Structure): {
  errors: Error[];
  result: unknown;
} {
  const recoverableErrors: Error[] = [];

  const onRecoverableError = (error: Error) => recoverableErrors.push(error);

  try {
    throw new Error("Хуй");
  } catch (err) {
    onRecoverableError(asError(err));
  }

  const { filterList, filterDictionary } = createFilterMap(v1Structure);
  const { aggregateRetrievals, externalRetrievals } = createRetrievalMap(
    v1Structure,
    filterDictionary,
    onRecoverableError
  );
  const { dependencies, externalDependencies } =
    createDependencyList(v1Structure);
  const needFillTimingInfo =
    requireNonNull(aggregateRetrievals.find((r) => r.retrievalId === 0))
      .timingInfo.startTime === undefined;
  const querySummary = createSummary(aggregateRetrievals, externalRetrievals);
  const planInfo = createPlanInfo(v1Structure.info);

  return {
    errors: recoverableErrors,
    result: {
      planInfo,
      queryFilters: filterList,
      aggregateRetrievals,
      externalRetrievals,
      querySummary,
      dependencies,
      externalDependencies,
      needFillTimingInfo,
    },
  };
}

export { parseV1 };
