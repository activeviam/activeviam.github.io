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
  TimeSlice,
  ALL_SLICES_INDEX,
  computeSlices,
  filterEntriesForSlice,
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
 * Distributes retrievals into buckets in such way that there are no two
 * overlapping retrievals within one bucket.
 * */
function computeLines({ graph }: { graph: RetrievalGraph }, scale: number) {
  const nodes = Array.from(graph.getVertices());
  const result = nodes
    .filter(hasTimingInfo)
    .map(extractTimeRanges)
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

const MARGIN = 0;
const BOX_HEIGHT = 25;
const BOX_MARGIN = 5;
const WIDTH_FACTOR = 5;

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
 * This React component is responsible for rendering single retrieval.
 * */
function Box({
  rowIdx,
  entry,
  node,
  selection,
  onSelect,
  focus,
  overflowLeft = false,
  overflowRight = false,
}: {
  rowIdx: number;
  entry: TimeRange;
  node: RetrievalVertex;
  selection: RetrievalCursor[];
  onSelect: (entry: TimeRange) => void;
  focus: FocusState;
  overflowLeft?: boolean;
  overflowRight?: boolean;
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
  const overflowClasses = [
    overflowLeft ? "overflow-left" : "",
    overflowRight ? "overflow-right" : "",
  ].filter(Boolean);
  const className = ["timeline-box", ...stateClasses, ...overflowClasses].join(
    " "
  );

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
  maxEndTime,
  factor,
  graph,
  selection,
  onSelect,
  focus,
  activeSlice,
  sliceDuration,
}: {
  rows: TimeRange[][];
  maxEndTime: number;
  factor: number;
  graph: RetrievalGraph;
  selection: RetrievalCursor[];
  onSelect: (entry: TimeRange) => void;
  focus: FocusState;
  activeSlice: TimeSlice | null;
  sliceDuration: number;
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

  let svgWidth: number;
  let viewBox: string;
  if (activeSlice) {
    const viewBoxX = MARGIN + activeSlice.start * WIDTH_FACTOR;
    const viewBoxW = sliceDuration * WIDTH_FACTOR;
    viewBox = `${viewBoxX} 0 ${viewBoxW} ${height}`;
    svgWidth = viewBoxW / factor;
  } else {
    const width = 2 * MARGIN + WIDTH_FACTOR * maxEndTime;
    viewBox = `0 0 ${width} ${height}`;
    svgWidth = width / factor;
  }

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
          width={svgWidth}
          height={height}
          viewBox={viewBox}
          preserveAspectRatio="none"
        >
          {[...rows].reverse().map((row, idx) => {
            if (activeSlice) {
              const slicedEntries = filterEntriesForSlice(row, activeSlice);
              return (
                <g className="timeline-row" key={idx}>
                  {slicedEntries.map((se) =>
                    Box({
                      rowIdx: idx,
                      entry: se.entry,
                      node: graph.getVertexByUUID(se.entry.retrieval.id),
                      selection,
                      onSelect,
                      focus,
                      overflowLeft: se.overflowLeft,
                      overflowRight: se.overflowRight,
                    })
                  )}
                </g>
              );
            } else {
              return Row({
                row,
                idx,
                graph,
                selection,
                onSelect,
                focus,
              });
            }
          })}
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

const COMPACT_THRESHOLD = 20;

function SliceSelector({
  slices,
  activeSliceIndex,
  setActiveSliceIndex,
}: {
  slices: TimeSlice[];
  activeSliceIndex: number;
  setActiveSliceIndex: (index: number) => void;
}) {
  if (slices.length <= 1) return null;

  const isAll = activeSliceIndex === ALL_SLICES_INDEX;
  const currentArrayIdx = slices.findIndex(
    (s) => s.index === activeSliceIndex
  );

  if (slices.length > COMPACT_THRESHOLD) {
    const hasPrev = !isAll && currentArrayIdx > 0;
    const hasNext = isAll || currentArrayIdx < slices.length - 1;

    const goPrev = () => {
      if (hasPrev) {
        setActiveSliceIndex(slices[currentArrayIdx - 1].index);
      }
    };
    const goNext = () => {
      if (isAll) {
        setActiveSliceIndex(slices[0].index);
      } else if (currentArrayIdx < slices.length - 1) {
        setActiveSliceIndex(slices[currentArrayIdx + 1].index);
      }
    };

    return (
      <div className="slice-selector">
        <div style={{ marginRight: 5 }}>Time slice</div>
        <ButtonGroup aria-label="Time slice" style={{ marginBottom: 5 }}>
          <Button
            variant={isAll ? "info" : "light"}
            onClick={() => setActiveSliceIndex(ALL_SLICES_INDEX)}
          >
            All
          </Button>
          <Button variant="light" disabled={!hasPrev} onClick={goPrev}>
            {"\u2039"}
          </Button>
          {!isAll && (
            <Button variant="info" disabled style={{ minWidth: 120 }}>
              {formatTime(slices[currentArrayIdx].start)}
              {"\u2013"}
              {formatTime(slices[currentArrayIdx].end)}
            </Button>
          )}
          <Button variant="light" disabled={!hasNext} onClick={goNext}>
            {"\u203a"}
          </Button>
        </ButtonGroup>
        {!isAll && (
          <span className="slice-count">
            {currentArrayIdx + 1} / {slices.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="slice-selector">
      <div style={{ marginRight: 5 }}>Time slice</div>
      <div className="slice-button-scroller">
        <ButtonGroup aria-label="Time slice" style={{ marginBottom: 5 }}>
          <Button
            variant={isAll ? "info" : "light"}
            onClick={() => setActiveSliceIndex(ALL_SLICES_INDEX)}
          >
            All
          </Button>
          {slices.map((slice) => (
            <Button
              key={slice.index}
              variant={activeSliceIndex === slice.index ? "info" : "light"}
              onClick={() => setActiveSliceIndex(slice.index)}
            >
              {formatTime(slice.start)}{"\u2013"}{formatTime(slice.end)}
            </Button>
          ))}
        </ButtonGroup>
      </div>
      <span className="slice-count">{slices.length} slices</span>
    </div>
  );
}

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

  const sliceDuration = useMemo(() => 400 * scale.factor, [scale]);

  const lines = useMemo(() => {
    return computeLines(plan, scale.factor);
  }, [plan, scale]);
  const maxEndTime = useMemo(() => {
    if (lines.length === 0) return 0;
    return Math.max(...lines.map((row) => row[row.length - 1].end));
  }, [lines]);

  const slices = useMemo(
    () => computeSlices(lines, sliceDuration, maxEndTime),
    [lines, sliceDuration, maxEndTime]
  );
  const [activeSliceIndex, setActiveSliceIndex] = useState(ALL_SLICES_INDEX);
  const activeSlice = useMemo(() => {
    if (activeSliceIndex === ALL_SLICES_INDEX) return null;
    return slices[activeSliceIndex] ?? null;
  }, [slices, activeSliceIndex]);

  // Reset slice on plan or scale change
  useEffect(() => {
    setActiveSliceIndex(ALL_SLICES_INDEX);
  }, [plan, scale]);

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
      <SliceSelector
        slices={slices}
        activeSliceIndex={activeSliceIndex}
        setActiveSliceIndex={setActiveSliceIndex}
      />
      <Rows
        rows={lines}
        maxEndTime={maxEndTime}
        factor={scale.factor}
        graph={plan.graph}
        selection={selection}
        onSelect={selectBox}
        focus={displayFocusState}
        activeSlice={activeSlice}
        sliceDuration={sliceDuration}
      />
      <TimelineDetails
        focus={focusControlState}
        {...{ plan, selection, setSelection, setFocused }}
      />
    </div>
  );
}
