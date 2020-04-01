import React from "react";
import "./Details.css";

const Values = ({ values, selected }) => {
  return (
    <>
      [
      {values.map((v, i, vs) => (
        <>
          <span className={i === selected ? "selected-partition" : ""}>
            {v}
          </span>
          {i < vs.length - 1 ? "," : ""}
        </>
      ))}
      ]
    </>
  );
};

const Details = ({
  startTime,
  elapsedTime,
  measures,
  location,
  partitioning,
  partition
}) => {
  const startTimeElts =
    partition === undefined ? (
      JSON.stringify(startTime)
    ) : (
      <Values values={startTime} selected={partition} />
    );
  const elapsedTimeElts =
    partition === undefined ? (
      JSON.stringify(elapsedTime)
    ) : (
      <Values values={elapsedTime} selected={partition} />
    );
  return (
    <ul>
      <li>Start: {startTimeElts}</li>
      <li>Elapsed: {elapsedTimeElts}</li>
      <li>
        Measures:
        <ul>
          {measures.map(m => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </li>
      <li>
        Location:
        <ul>
          {location.map(l => (
            <li key={`${l.dimension}@${l.hierarchy}`}>
              {l.dimension}@{l.hierarchy}
              {l.level.map((lev, i) => {
                return `:${lev}=${l.path[i]}`;
              })}
            </li>
          ))}
        </ul>
      </li>
      <li>Partitioning: {partitioning}</li>
    </ul>
  );
};

export default Details;
