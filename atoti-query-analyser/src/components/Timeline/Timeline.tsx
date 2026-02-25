import React, { useMemo } from "react";
import { useEffect, useState } from "react";
import { QueryPlan } from "../../library/dataStructures/processing/queryPlan";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import { requireNonNull } from "../../library/utilities/util";
import {
  RetrievalGraph,
  RetrievalVertex,
} from "../../library/dataStructures/json/retrieval";
import {
  AGGREGATED_PARTITION,
  TimeRange,
  RetrievalCursor,
  areEqualCursors,
  FocusState,
  computeRetrievalClasses,
  FocusControl,
  computeFocusState,
  focusOnItem,
} from "./Model";
import { TimelineDetails } from "./Details";
import "./Timeline.css";

/**
 * Helper function that inserts a time range into one of existing timelines or
 * creates a new timeline.
 * */
function placeRetrieval(
  state: { lines: TimeRange[][]; last: number[] },
  entry: TimeRange
) {
  const { lines, last } = state;
  // Find the first one whose last is before entry start
  const candidates = last.filter((t) => t <= entry.start);
  const idx =
    candidates.length > 0
      ? last.indexOf(Math.max(...candidates))
      : lines.length;
  if (lines[idx]) {
    lines[idx].push(entry);
  } else {
    lines[idx] = [entry];
  }
  last[idx] = entry.end;
  return state;

  // TODO may be smart to have a way to distribute 0ms on different lines
}

/**
 * Checks if retrieval has timing info.
 * */
function hasTimingInfo(node: RetrievalVertex) {
  const metadata = node.getMetadata();
  const timingInfo = metadata.timingInfo;
  return timingInfo && timingInfo.startTime && timingInfo.elapsedTime;
}

/**
 * Transforms a retrieval into collection of time ranges.
 * */
function extractTimeRanges(node: RetrievalVertex): TimeRange[] {
  const timingInfo = node.getMetadata().timingInfo;
  return requireNonNull(timingInfo.startTime).map((time, i) => ({
    retrieval: {
      id: node.getUUID(),
      partition: i,
    },
    start: time,
    end: requireNonNull(timingInfo.elapsedTime)[i] + time,
  }));
}

/**
 * Transforms a retrieval into a single aggregated time range spanning all
 * partitions.
 */
function extractAggregatedTimeRange(node: RetrievalVertex): TimeRange[] {
  const timingInfo = node.getMetadata().timingInfo;
  const startTimes = requireNonNull(timingInfo.startTime);
  const elapsedTimes = requireNonNull(timingInfo.elapsedTime);
  const partitionCount = startTimes.length;
  const start = Math.min(...startTimes);
  const end = Math.max(...startTimes.map((t, i) => t + elapsedTimes[i]));
  return [
    {
      retrieval: {
        id: node.getUUID(),
        partition: AGGREGATED_PARTITION,
      },
      start,
      end,
      aggregated: true,
      partitionCount,
    },
  ];
}

/**
 * Distributes retrievals into buckets in such way that there are no two
 * overlapping retrievals within one bucket.
 * */
function computeLines(
  { graph }: { graph: RetrievalGraph },
  scale: number,
  aggregated: boolean
) {
  const nodes = Array.from(graph.getVertices());
  const extractFn = aggregated ? extractAggregatedTimeRange : extractTimeRanges;
  const result = nodes
    .filter(hasTimingInfo)
    .map(extractFn)
    .flat()
    .filter(
      (entry) => entry.start < entry.end && entry.end - entry.start >= scale
    )
    .sort((a, b) => {
      return a.start - b.start;
    })
    .reduce(placeRetrieval.bind(null), {
      lines: [],
      last: [],
    });

  result.lines.sort((a, b) => a[a.length - 1].end - b[b.length - 1].end);
  return result.lines;
}

/** Count total number of partition entries across all retrievals with timing info. */
function countTotalPartitions(graph: RetrievalGraph): number {
  let count = 0;
  for (const node of graph.getVertices()) {
    if (hasTimingInfo(node)) {
      count += requireNonNull(node.getMetadata().timingInfo.startTime).length;
    }
  }
  return count;
}

/** Whether any retrieval has more than one partition. */
function hasMultiplePartitions(graph: RetrievalGraph): boolean {
  for (const node of graph.getVertices()) {
    if (hasTimingInfo(node)) {
      const len = requireNonNull(
        node.getMetadata().timingInfo.startTime
      ).length;
      if (len > 1) return true;
    }
  }
  return false;
}

const MARGIN = 0;
const BOX_HEIGHT = 25;
const BOX_MARGIN = 5;
const WIDTH_FACTOR = 5;
const AXIS_HEIGHT = 24;
const AUTO_AGGREGATE_THRESHOLD = 500;
const MAX_DISPLAY_ROWS = 200;

// --- Time Axis ---

/**
 * Computes a "nice" tick interval targeting ~100px spacing at the given scale.
 */
function computeTickInterval(maxEndTimeMs: number, factor: number): number {
  // Target ~100 px between ticks in displayed pixels
  // 100 displayed px = 100 * factor / WIDTH_FACTOR ms
  const targetMs = (100 * factor) / WIDTH_FACTOR;
  if (targetMs <= 0 || maxEndTimeMs <= 0) return maxEndTimeMs || 1;
  // Snap to 1/2/5 * 10^n
  const mag = Math.pow(10, Math.floor(Math.log10(targetMs)));
  const residual = targetMs / mag;
  let nice: number;
  if (residual < 1.5) nice = 1;
  else if (residual < 3.5) nice = 2;
  else if (residual < 7.5) nice = 5;
  else nice = 10;
  return Math.max(nice * mag, 1);
}

/**
 * Formats milliseconds as a human-readable time label.
 */
function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) {
    const s = ms / 1000;
    return s === Math.floor(s) ? `${s}s` : `${s.toFixed(1)}s`;
  }
  const min = ms / 60000;
  return min === Math.floor(min) ? `${min}min` : `${min.toFixed(1)}min`;
}

/**
 * Time axis rendered as an HTML div with absolutely-positioned tick spans,
 * avoiding SVG text distortion from preserveAspectRatio="none".
 */
function TimeAxis({
  maxEndTime,
  factor,
}: {
  maxEndTime: number;
  factor: number;
}) {
  const totalWidth = (2 * MARGIN + WIDTH_FACTOR * maxEndTime) / factor;
  const interval = computeTickInterval(maxEndTime, factor);

  const ticks: { t: number; left: number }[] = [];
  for (let t = 0; t <= maxEndTime; t += interval) {
    const left = (MARGIN + (t + 1) * WIDTH_FACTOR - 1) / factor;
    ticks.push({ t, left });
  }

  return (
    <div className="timeline-axis" style={{ width: totalWidth }}>
      {ticks.map(({ t, left }) => (
        <span key={t} className="timeline-tick" style={{ left }}>
          <span className="timeline-tick-line" />
          <span className="timeline-tick-label">{formatTime(t)}</span>
        </span>
      ))}
    </div>
  );
}

// --- Box / Row ---

/**
 * This React component is responsible for rendering single retrieval.
 * */
function Box({
  rowIdx,
  entry,
  node,
  selection,
  onSelect,
  focus,
}: {
  rowIdx: number;
  entry: TimeRange;
  node: RetrievalVertex;
  selection: RetrievalCursor[];
  onSelect: (entry: TimeRange) => void;
  focus: FocusState;
}) {
  if (node === undefined || entry.retrieval.id !== node.getUUID()) {
    throw new Error(
      `Inconsistent state: ${JSON.stringify(entry)} / ${JSON.stringify(node)}`
    );
  }
  const key = `${entry.retrieval.id}#${entry.retrieval.partition}`;
  const stateClasses = computeRetrievalClasses(
    entry.retrieval,
    selection,
    focus
  );
  const extraClass = entry.aggregated ? "timeline-box-aggregated" : "";
  const className = ["timeline-box", extraClass, ...stateClasses]
    .filter(Boolean)
    .join(" ");
  const fill =
    entry.aggregated && stateClasses.length === 0
      ? "url(#stripe-pattern)"
      : undefined;

  if (entry.start < entry.end) {
    const x = (entry.start + 1) * WIDTH_FACTOR - 1;
    const w = (entry.end - entry.start - 1) * WIDTH_FACTOR + 2;

    return (
      <rect
        key={key}
        className={className}
        x={MARGIN + x}
        y={MARGIN + rowIdx * (BOX_MARGIN + BOX_HEIGHT)}
        width={w}
        height={BOX_HEIGHT}
        fill={fill}
        onClick={() => onSelect(entry)}
      />
    );
  } else {
    const x = entry.start * WIDTH_FACTOR + 2;
    const w = 1;
    return (
      <rect
        key={key}
        className={className}
        x={MARGIN + x}
        y={MARGIN + rowIdx * (BOX_MARGIN + BOX_HEIGHT)}
        width={w}
        height={BOX_HEIGHT}
        fill={fill}
        onClick={() => onSelect(entry)}
      />
    );
  }
}

/**
 * This React component is responsible for rendering a single line of timeline.
 * */
function Row({
  row,
  idx,
  graph,
  selection,
  onSelect,
  focus,
}: {
  row: TimeRange[];
  idx: number;
  graph: RetrievalGraph;
  selection: RetrievalCursor[];
  onSelect: (entry: TimeRange) => void;
  focus: FocusState;
}) {
  const boxes = row.map((entry) =>
    Box({
      rowIdx: idx,
      entry,
      node: graph.getVertexByUUID(entry.retrieval.id),
      selection,
      onSelect,
      focus,
    })
  );
  return (
    <g className="timeline-row" key={idx}>
      {boxes}
    </g>
  );
}

const computeTextOffset = (rowCount: number) => {
  if (rowCount < 10) {
    return 15;
  } else if (rowCount < 100) {
    return 20;
  } else if (rowCount < 1000) {
    return 25;
  } else {
    return 30;
  }
};

// --- Row cap ---

function capRows(rows: TimeRange[][]): {
  rows: TimeRange[][];
  totalCount: number;
  truncated: boolean;
} {
  const totalCount = rows.length;
  if (totalCount <= MAX_DISPLAY_ROWS) {
    return { rows, totalCount, truncated: false };
  }
  const headCount = MAX_DISPLAY_ROWS - 5;
  const capped = [...rows.slice(0, headCount), ...rows.slice(totalCount - 5)];
  return { rows: capped, totalCount, truncated: true };
}

// --- Rows (main timeline container) ---

/**
 * This React component is responsible for rendering timeline.
 * */
function Rows({
  rows,
  maxEndTime,
  factor,
  graph,
  selection,
  onSelect,
  focus,
  isAggregated,
  totalRowCount,
  truncated,
  onRequestAggregate,
}: {
  rows: TimeRange[][];
  maxEndTime: number;
  factor: number;
  graph: RetrievalGraph;
  selection: RetrievalCursor[];
  onSelect: (entry: TimeRange) => void;
  focus: FocusState;
  isAggregated: boolean;
  totalRowCount: number;
  truncated: boolean;
  onRequestAggregate?: () => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="timeline-rows">
        All entries are smaller than one pixel at this scale.
      </div>
    );
  }
  const height =
    2 * MARGIN + rows.length * (BOX_HEIGHT + BOX_MARGIN) - BOX_MARGIN;
  const width = 2 * MARGIN + WIDTH_FACTOR * maxEndTime;
  const textOffset = computeTextOffset(rows.length);
  return (
    <>
      {truncated && (
        <div className="timeline-truncation-notice">
          Showing {rows.length} of {totalRowCount} rows.
          {!isAggregated && onRequestAggregate && (
            <>
              {" "}
              <button className="button-as-link" onClick={onRequestAggregate}>
                Enable aggregation
              </button>{" "}
              to reduce row count.
            </>
          )}
        </div>
      )}
      <div className="timeline-rows">
        <div className="timeline-index-column">
          <div style={{ height: AXIS_HEIGHT, flexShrink: 0 }} />
          <div>
            <svg viewBox={`0 0 ${textOffset} ${height}`} width={textOffset}>
              {rows.map((_, idx) => (
                <g className="timeline-row" key={idx}>
                  <text
                    className="timeline-index"
                    x={textOffset / 2}
                    y={
                      MARGIN + idx * (BOX_MARGIN + BOX_HEIGHT) + BOX_HEIGHT / 2
                    }
                    width={textOffset}
                    height={BOX_HEIGHT}
                    dominantBaseline={"middle"}
                    textAnchor={"middle"}
                  >
                    {idx + 1}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
        <div className="timeline-content">
          <div className="timeline-axis-wrapper">
            <TimeAxis maxEndTime={maxEndTime} factor={factor} />
          </div>
          <div>
            <svg
              width={width / factor}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
            >
              {isAggregated && (
                <defs>
                  <pattern
                    id="stripe-pattern"
                    width="8"
                    height="8"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <rect width="8" height="8" fill="#198db4" />
                    <rect width="3" height="8" fill="#1a7a9e" />
                  </pattern>
                </defs>
              )}
              {[...rows].reverse().map((row, idx) =>
                Row({
                  row,
                  idx,
                  graph,
                  selection,
                  onSelect,
                  focus,
                })
              )}
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}

type Scale = {
  label: string;
  factor: number;
};
const scales: readonly Scale[] = [
  { label: "1ms", factor: 1 },
  { label: "10ms", factor: 10 },
  { label: "50ms", factor: 50 },
  { label: "100ms", factor: 100 },
  { label: "1s", factor: 1000 },
  { label: "5s", factor: 5000 },
  { label: "10s", factor: 10000 },
  { label: "1min", factor: 60000 },
];

const findClosestScale = (values: readonly Scale[], factor: number) => {
  // could be done with findLast but not available for some reasons
  const candidates = values.filter((scale) => scale.factor <= factor);
  return candidates[candidates.length - 1];
};

/**
 * This React component is responsible for displaying timeline and retrieval
 * details when clicking on the corresponding box.
 *
 * @param attributes - React JSX attributes
 * @param attributes.plan - Query plan to be displayed
 */
export function Timeline({ plan }: { plan: QueryPlan }) {
  const defaultScale = useMemo(() => {
    const mean = Array.from(plan.graph.getVertices())
      .flatMap((v) => v.getMetadata().timingInfo.elapsedTime ?? [])
      .reduce(
        ({ sum, count }, value) => ({ sum: sum + value, count: count + 1 }),
        { sum: 0, count: 0 }
      );
    // Find the scale close enough to the mean, but accepting some smaller bars
    const result = findClosestScale(scales, (mean.sum / mean.count) * 0.75);
    return result ?? scales[0];
  }, [plan]);
  const [scale, setScale] = useState(defaultScale);

  // Aggregation state
  const showAggregationToggle = useMemo(
    () => hasMultiplePartitions(plan.graph),
    [plan]
  );
  const autoAggregate = useMemo(
    () => countTotalPartitions(plan.graph) > AUTO_AGGREGATE_THRESHOLD,
    [plan]
  );
  const [isAggregated, setIsAggregated] = useState(autoAggregate);

  // Reset aggregation mode when plan changes
  useEffect(() => {
    setIsAggregated(autoAggregate);
  }, [autoAggregate]);

  const lines = useMemo(() => {
    return computeLines(plan, scale.factor, isAggregated);
  }, [plan, scale, isAggregated]);

  // Apply row cap
  const {
    rows: cappedRows,
    totalCount: totalRowCount,
    truncated,
  } = useMemo(() => capRows(lines), [lines]);

  const maxEndTime = useMemo(() => {
    if (lines.length === 0) return 0;
    return Math.max(...lines.map((row) => row[row.length - 1].end));
  }, [lines]);
  const [selection, setSelection] = useState<RetrievalCursor[]>([]);
  const [focusControlState, setFocused] = useState<FocusControl>({
    item: null,
    showChildren: false,
    showParents: false,
  });
  const { item: focusedItem, showParents, showChildren } = focusControlState;
  const focusState = useMemo(
    () => computeFocusState(plan, focusedItem, isAggregated),
    [plan, focusedItem, isAggregated]
  );
  const displayFocusState = useMemo(
    () => ({
      ...focusState,
      parents: showParents ? focusState.parents : [],
      children: showChildren ? focusState.children : [],
    }),
    [focusState, showParents, showChildren]
  );

  useEffect(() => {
    setSelection([]);
    setFocused({ item: null, showChildren: false, showParents: false });
  }, [plan]);

  // Clear selection when aggregation mode changes
  useEffect(() => {
    setSelection([]);
    setFocused({ item: null, showChildren: false, showParents: false });
  }, [isAggregated]);

  const selectBox = ({ retrieval }: TimeRange) => {
    setSelection((entries) => {
      const isSelected = entries.some((cursor) =>
        areEqualCursors(cursor, retrieval)
      );
      return isSelected ? entries : [...entries, retrieval];
    });
    setFocused((state) => focusOnItem(state, retrieval));
  };

  return (
    <div className="timeline">
      <div className="scale-control">
        <div style={{ marginRight: 5 }}>Diagram scale</div>
        <ButtonGroup aria-label="Timeline scale" style={{ marginBottom: 5 }}>
          {scales.map((s) => (
            <Button
              key={s.label}
              variant={
                scale.label === s.label
                  ? "info"
                  : s.label === defaultScale.label
                  ? "outline-info"
                  : "light"
              }
              onClick={() => setScale(s)}
            >
              {s.label}
            </Button>
          ))}
        </ButtonGroup>
        {showAggregationToggle && (
          <>
            <div style={{ marginLeft: 15, marginRight: 5 }}>View</div>
            <ButtonGroup
              aria-label="Aggregation mode"
              style={{ marginBottom: 5 }}
            >
              <Button
                variant={!isAggregated ? "info" : "light"}
                onClick={() => setIsAggregated(false)}
              >
                Partitions
              </Button>
              <Button
                variant={isAggregated ? "info" : "light"}
                onClick={() => setIsAggregated(true)}
              >
                Aggregated
              </Button>
            </ButtonGroup>
          </>
        )}
      </div>
      <Rows
        rows={cappedRows}
        maxEndTime={maxEndTime}
        factor={scale.factor}
        graph={plan.graph}
        selection={selection}
        onSelect={selectBox}
        focus={displayFocusState}
        isAggregated={isAggregated}
        totalRowCount={totalRowCount}
        truncated={truncated}
        onRequestAggregate={
          showAggregationToggle ? () => setIsAggregated(true) : undefined
        }
      />
      <TimelineDetails
        focus={focusControlState}
        isAggregated={isAggregated}
        {...{ plan, selection, setSelection, setFocused }}
      />
    </div>
  );
}
