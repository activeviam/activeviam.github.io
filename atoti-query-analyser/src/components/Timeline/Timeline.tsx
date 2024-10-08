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

/* TODO how to dilate time not to have long boxes taking a lot of spaces
 * We must only dilate time for periods where all entries are in similar
 * buckets. */

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
 * Distributes retrievals into buckets in such way that there are no two
 * overlapping retrievals within one bucket.
 * */
function computeLines({ graph }: { graph: RetrievalGraph }) {
  const nodes = Array.from(graph.getVertices());
  const result = nodes
    .filter(hasTimingInfo)
    .map(extractTimeRanges)
    .flat()
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

const MARGIN = 0;
const BOX_HEIGHT = 25;
const BOX_MARGIN = 5;
const WIDTH_FACTOR = 5;
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
  const className = ["timeline-box", ...stateClasses].join(" ");

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

/**
 * This React component is responsible for rendering timeline.
 * */
function Rows({
  rows,
  factor,
  graph,
  selection,
  onSelect,
  focus,
}: {
  rows: TimeRange[][];
  factor: number;
  graph: RetrievalGraph;
  selection: RetrievalCursor[];
  onSelect: (entry: TimeRange) => void;
  focus: FocusState;
}) {
  const height =
    2 * MARGIN + rows.length * (BOX_HEIGHT + BOX_MARGIN) - BOX_MARGIN;
  const width =
    2 * MARGIN +
    WIDTH_FACTOR *
      Math.max(
        ...rows.map((row) => row[row.length - 1]).map((entry) => entry.end)
      );
  const textOffset = computeTextOffset(rows.length);
  return (
    <div className="timeline-rows">
      <div>
        <svg viewBox={`0 0 ${textOffset} ${height}`} width={textOffset}>
          {rows.map((_, idx) => (
            <g className="timeline-row" key={idx}>
              <text
                className="timeline-index"
                x={textOffset / 2}
                y={MARGIN + idx * (BOX_MARGIN + BOX_HEIGHT) + BOX_HEIGHT / 2}
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
      <div>
        <svg
          width={width / factor}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
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
  const lines = useMemo(() => {
    return computeLines(plan);
  }, [plan]);
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
  const [selection, setSelection] = useState<RetrievalCursor[]>([]);
  const [focusControlState, setFocused] = useState<FocusControl>({
    item: null,
    showChildren: false,
    showParents: false,
  });
  const { item: focusedItem, showParents, showChildren } = focusControlState;
  const focusState = useMemo(
    () => computeFocusState(plan, focusedItem),
    [plan, focusedItem]
  );
  const displayFocusState = useMemo(
    () => ({
      ...focusState,
      parents: showParents ? focusState.parents : [],
      children: showChildren ? focusState.children : [],
    }),
    [focusState, showParents, showChildren]
  );
  const [scale, setScale] = useState(defaultScale);

  useEffect(() => {
    setSelection([]);
    setFocused({ item: null, showChildren: false, showParents: false });
  }, [plan]);

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
      </div>
      <Rows
        rows={lines}
        factor={scale.factor}
        graph={plan.graph}
        selection={selection}
        onSelect={selectBox}
        focus={displayFocusState}
      />
      <TimelineDetails
        focus={focusControlState}
        {...{ plan, selection, setSelection, setFocused }}
      />
    </div>
  );
}
