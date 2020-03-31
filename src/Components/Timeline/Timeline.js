import React, { Component } from "react";

const placeRetrieval = (retrievals, state, entry) => {
  const { lines, last } = state;
  // Find the first one whose last is before entry start
  const candidates = last.filter(t => t <= entry.start);
  const idx = candidates.length > 0 ? last.indexOf(Math.max(...candidates)) : 0;
  if (lines[idx]) {
    lines[idx].push(entry.id);
  } else {
    lines[idx] = [entry.id];
  }
  last[idx] = entry.end;
  return state;
};

class Timeline extends Component {
  constructor(props) {
    super(props);

    this.state = {
      lines: []
    };
  }

  componentWillMount() {
    const { retrievals } = this.props.plan;
    debugger;

    const result = retrievals
      .filter(r => r.timingInfo.startTime && r.timingInfo.elapsedTime)
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

    this.setState({ lines: result.lines });
  }

  render() {
    return (
      <>
        <p>This is the timeline</p>
        <ul>
          {this.state.lines.map((line, i) => {
            return <li key={i}>{JSON.stringify(line)}</li>;
          })}
        </ul>
      </>
    );
  }
}

export default Timeline;
