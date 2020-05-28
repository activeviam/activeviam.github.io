import React, { Component } from "react";
import Toast from "react-bootstrap/Toast";
import "./Timeline.css";
import Details from "../Details/Details";
import * as labels from "../../helpers/labels";

/* TODO how to dilate time not to have long boxes taking a lot of spaces
 * We must only dilate time for periods where all entries are in similar
 * buckets. */

const placeRetrieval = (retrievals, state, entry) => {
  const { lines, last } = state;
  // Find the first one whose last is before entry start
  const candidates = last.filter(t => t <= entry.start);
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
};

const computeLines = ({ retrievals }) => {
  const result = retrievals
    .filter(r => r.timingInfo)
    .map(r =>
      r.timingInfo.startTime.map((time, i) => ({
        id: r.retrId,
        partition: i,
        start: time,
        end: r.timingInfo.elapsedTime[i] + time
      }))
    )
    .flat()
    .sort((a, b) => {
      return a.start - b.start;
    })
    .reduce(placeRetrieval.bind(null, retrievals), {
      lines: [],
      last: []
    });

  result.lines.sort((a, b) => a[a.length - 1].end - b[b.length - 1].end);
  return result.lines;
};

const margin = 0;
const boxHeight = 25;
const boxMargin = 5;
const widthFactor = 5;

// Logic for a factor of 5
const Box = ({ rowIdx, entry, retrieval, selection, onSelect }) => {
  if (retrieval === undefined || entry.id !== retrieval.retrId) {
    throw new Error(
      `Inconsistent state: ${JSON.stringify(entry)} / ${JSON.stringify(
        retrieval
      )}`
    );
  }
  const selected = selection.some(
    ([id, partition]) => entry.id === id && entry.partition === partition
  );
  const key = `${entry.id}-${entry.partition}`;
  if (entry.start < entry.end) {
    const x = (entry.start + 1) * widthFactor - 1;
    const w = (entry.end - entry.start - 1) * widthFactor + 2;
    return (
      <rect
        key={key}
        className={`timeline-box ${selected ? "selected" : ""}`}
        x={margin + x}
        y={margin + rowIdx * (boxMargin + boxHeight)}
        width={w}
        height={boxHeight}
        onClick={() => onSelect(entry)}
      />
    );
  }
  const x = entry.start * widthFactor + 2;
  const w = 1;
  return (
    <rect
      key={key}
      className={`timeline-box ${selected ? "selected" : ""}`}
      x={margin + x}
      y={margin + rowIdx * (boxMargin + boxHeight)}
      width={w}
      height={boxHeight}
      onClick={() => onSelect(entry)}
    />
  );
};

const Row = ({ row, idx, retrievals, selection, onSelect }) => {
  const boxes = row.map(entry =>
    Box({
      rowIdx: idx,
      entry,
      retrieval: retrievals[entry.id],
      selection,
      onSelect
    })
  );
  return (
    <g className="timeline-row" key={idx}>
      {boxes}
    </g>
  );
};

const Rows = ({ rows, retrievals, selection, onSelect }) => {
  const height = 2 * margin + rows.length * (boxHeight + boxMargin) - boxMargin;
  const width =
    2 * margin +
    widthFactor *
      Math.max(...rows.map(row => row[row.length - 1]).map(entry => entry.end));
  return (
    <div className="timeline-rows">
      <svg width={width} height={height}>
        {rows.map((row, idx) =>
          Row({ row, idx, retrievals, selection, onSelect })
        )}
      </svg>
    </div>
  );
};

type TimelineProps = {
  plan: any
}

class Timeline extends Component<TimelineProps, any> {
  constructor(props) {
    super(props);

    this.state = {
      lines: [],
      selection: []
    };
  }

  componentDidMount() {
    this.setState({ lines: computeLines(this.props.plan) });
  }

  static getDerivedStateFromProps(newProps) {
    return { lines: computeLines(newProps.plan) };
  }

  selectBox = entry => {
    this.setState(({ selection }) => {
      const changed = [...selection];
      const idx = selection.findIndex(
        ([id, partition]) => id === entry.id && partition === entry.partition
      );
      if (idx >= 0) {
        changed.splice(idx, 1);
      } else {
        changed.push([entry.id, entry.partition]);
      }
      return { selection: changed };
    });
  };

  closeBox = ([keyId, keyPartition]) => {
    this.setState(({ selection }) => {
      const idx = selection.findIndex(
        ([id, partition]) => id === keyId && partition === keyPartition
      );
      if (idx >= 0) {
        const changed = [...selection];
        changed.splice(idx, 1);
        return { selection: changed };
      }
      return {};
    });
  };

  render() {
    const { selection, lines } = this.state;
    const { plan } = this.props;
    return (
      <div className="timeline">
        <Rows
          rows={lines}
          retrievals={plan.retrievals}
          selection={selection}
          onSelect={this.selectBox}
        />
        <div className="timeline-details">
          <div style={{ width: selection.length * 355 }}>
            {selection.map(key => {
              const [id, partition] = key;
              const retrieval = plan.retrievals[id];
              return (
                <Toast
                  key={retrieval.retrId}
                  className="entry"
                  onClose={() => this.closeBox(key)}
                >
                  <Toast.Header>
                    Retrieval&nbsp;
                    <strong className="mr-auto">#{id}</strong>
                    <small>{labels.type(retrieval.type)}</small>
                  </Toast.Header>
                  <Toast.Body className="body">
                    {Details({
                      ...retrieval,
                      ...retrieval.timingInfo,
                      partition
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
}

export default Timeline;
