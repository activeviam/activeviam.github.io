import React from "react";
import "./Details.css";
import { extractWords } from "../../library/utilities/textUtils";
import * as PropTypes from "prop-types";

const Values = ({ values, selected }) => {
  return (
    <>
      [
      {values.map((v, i, vs) => (
        <span key={i}>
          <span className={i === selected ? "selected-partition" : ""}>
            {v}
          </span>
          {i < vs.length - 1 ? "," : ""}
        </span>
      ))}
      ]
    </>
  );
};

const LocationView = ({ location }) => (
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
);

const PlainView = ({ value }) => {
  return <span className={isNullish(value) ? "nullish-content" : ""}>{`${value}`}</span>;
};

PlainView.propTypes = { value: PropTypes.any };

const ListView = ({ title, list }) => (
  <li>
    {title}:
    {
      list.length === 0 ?
        <span className="nullish-content"> (no items)</span> :
        <ul>
          {list.map(item => (<li key={`${item}`}><PlainView value={item} /></li>))}
        </ul>
    }
  </li>
);

const buildTitle = (text) => {
  const words = extractWords(text);
  return words.map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
};

const BLACKLIST = new Set([
  "retrievalId",
  "timingInfo"
]);

function isNullish(value) {
  switch (typeof value) {
    case "undefined":
      return true;
    case "object":
      return value === null || Object.keys(value).length === 0;
    default:
      return false;
  }
}

const Details = ({
                   startTime,
                   elapsedTime,
                   metadata,
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
      <li key="startTimeElts">Start: {startTimeElts}</li>
      <li key="elapsedTimeElts">Elapsed: {elapsedTimeElts}</li>
      {
        Object.entries(metadata)
          .map(([key, value]) => ({ key, value }))
          .filter(({ key }) => !BLACKLIST.has(key))
          .sort((lhs, rhs) => lhs.key.localeCompare(rhs.key))
          .map(({ key, value }) => {
            if (key === "location") {
              return <LocationView location={value} key={key} />;
            } else if (Array.isArray(value)) {
              return <ListView list={value} title={buildTitle(key)} key={key} />;
            } else {
              return <li key={key}>{buildTitle(key)}: <PlainView value={value} /></li>;
            }
          })
      }
    </ul>
  );
};

export default Details;
export { Values };
