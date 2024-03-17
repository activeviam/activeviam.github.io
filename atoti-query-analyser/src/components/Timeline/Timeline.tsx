import React, { useMemo } from "react";
import { useEffect, useState } from "react";
import { QueryPlan } from "../../library/dataStructures/processing/queryPlan";
import { Toast } from "react-bootstrap";
import { Details } from "components/Details/Details";
import { requireNonNull } from "../../library/utilities/util";
import * as labels from "../../library/graphView/labels";
import {
  RetrievalGraph,
  RetrievalVertex,
} from "../../library/dataStructures/json/retrieval";
import { UUID } from "../../library/utilities/uuid";
import "./Timeline.css";

/* TODO how to dilate time not to have long boxes taking a lot of spaces
 * We must only dilate time for periods where all entries are in similar
 * buckets. */

/**
 * A (retrievalID, partitionID) pair.
 * */
interface RetrievalCursor {
  id: UUID;
  partition: number;
}

/**
 * Information about execution time of a retrieval on a partition.
 * */
interface TimeRange {
  retrieval: RetrievalCursor;
  start: number;
  end: number;
}

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
  textOffset,
}: {
  rowIdx: number;
  entry: TimeRange;
  node: RetrievalVertex;
  selection: RetrievalCursor[];
  onSelect: (entry: TimeRange) => void;
  textOffset: number;
}) {
  if (node === undefined || entry.retrieval.id !== node.getUUID()) {
    throw new Error(
      `Inconsistent state: ${JSON.stringify(entry)} / ${JSON.stringify(node)}`
    );
  }
  const selected = selection.some(
    ({ id, partition }) =>
      entry.retrieval.id === id && entry.retrieval.partition === partition
  );
  const key = `${entry.retrieval.id}-${entry.retrieval.partition}`;
  if (entry.start < entry.end) {
    const x = (entry.start + 1) * WIDTH_FACTOR - 1;
    const w = (entry.end - entry.start - 1) * WIDTH_FACTOR + 2;
    return (
      <rect
        key={key}
        className={`timeline-box ${selected ? "selected" : ""}`}
        x={textOffset + MARGIN + x}
        y={MARGIN + rowIdx * (BOX_MARGIN + BOX_HEIGHT)}
        width={w}
        height={BOX_HEIGHT}
        onClick={() => onSelect(entry)}
      />
    );
  }
  const x = entry.start * WIDTH_FACTOR + 2;
  const w = 1;
  return (
    <rect
      key={key}
      className={`timeline-box ${selected ? "selected" : ""}`}
      x={textOffset + MARGIN + x}
      y={MARGIN + rowIdx * (BOX_MARGIN + BOX_HEIGHT)}
      width={w}
      height={BOX_HEIGHT}
      onClick={() => onSelect(entry)}
    />
  );
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
  textOffset,
}: {
  row: TimeRange[];
  idx: number;
  graph: RetrievalGraph;
  selection: RetrievalCursor[];
  onSelect: (entry: TimeRange) => void;
  textOffset: number;
}) {
  const boxes = row.map((entry) =>
    Box({
      rowIdx: idx,
      entry,
      node: graph.getVertexByUUID(entry.retrieval.id),
      selection,
      onSelect,
      textOffset,
    })
  );
  return (
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
  graph,
  selection,
  onSelect,
}: {
  rows: TimeRange[][];
  graph: RetrievalGraph;
  selection: RetrievalCursor[];
  onSelect: (entry: TimeRange) => void;
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
      <svg width={width} height={height}>
        {[...rows].reverse().map((row, idx) =>
          Row({
            row,
            idx,
            graph,
            selection,
            onSelect,
            textOffset,
          })
        )}
      </svg>
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
  const lines = useMemo(() => {
    return computeLines(plan);
  }, [plan]);
  const [selection, setSelection] = useState<RetrievalCursor[]>([]);

  useEffect(() => {
    setSelection([]);
  }, [plan]);

  const selectBox = (entry: TimeRange) => {
    const changed = [...selection];
    const idx = selection.findIndex(
      (cursor) =>
        cursor.id === entry.retrieval.id &&
        cursor.partition === entry.retrieval.partition
    );
    if (idx >= 0) {
      changed.splice(idx, 1);
    } else {
      changed.push(entry.retrieval);
    }
    setSelection(changed);
  };

  const closeBox = (retrieval: RetrievalCursor) => {
    const idx = selection.findIndex(
      ({ id, partition }) =>
        id === retrieval.id && partition === retrieval.partition
    );
    if (idx >= 0) {
      const changed = [...selection];
      changed.splice(idx, 1);
      setSelection(changed);
    }
  };

  return (
    <div className="timeline">
      <Rows
        rows={lines}
        graph={plan.graph}
        selection={selection}
        onSelect={selectBox}
      />
      <div className="timeline-details">
        <div className="d-flex">
          {selection.map((key) => {
            const { id, partition } = key;
            const node = plan.graph.getVertexByUUID(id);

            const metadata = node.getMetadata();
            const kind = metadata.$kind;
            const retrievalId = metadata.retrievalId;
            const type = "type" in metadata ? (metadata.type as string) : kind;
            const timingInfo = metadata.timingInfo;

            return (
              <Toast
                key={node.getUUID()}
                className="entry"
                onClose={() => closeBox(key)}
              >
                <Toast.Header>
                  {kind}&nbsp;
                  <strong className="mr-auto">#{retrievalId}</strong>
                  <small>{labels.type(type)}</small>
                </Toast.Header>
                <Toast.Body className="body">
                  {Details({
                    metadata,
                    startTime: requireNonNull(timingInfo.startTime),
                    elapsedTime: requireNonNull(timingInfo.elapsedTime),
                    partition,
                  })}
                </Toast.Body>
              </Toast>
            );
          })}
        </div>
      </div>
    </div>
  );
}
