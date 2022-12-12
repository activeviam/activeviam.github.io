import React from "react";
import "./Details.css";
import { extractWords } from "../../library/utilities/textUtils";
import { CubeLocation } from "../../library/dataStructures/json/cubeLocation";
import { ARetrieval } from "../../library/dataStructures/json/retrieval";

function isNullish(value: any) {
  switch (typeof value) {
    case "undefined":
      return true;
    case "object":
      return value === null || Object.keys(value).length === 0;
    default:
      return false;
  }
}

function Values({ values, selected }: { values: number[]; selected?: number }) {
  return (
    <>
      [
      {values.map((v, i, vs) => (
        <span key={v}>
          <span className={i === selected ? "selected-partition" : ""}>
            {v}
          </span>
          {i < vs.length - 1 ? "," : ""}
        </span>
      ))}
      ]
    </>
  );
}

Values.defaultProps = {
  selected: undefined,
};

function LocationView({ location }: { location: CubeLocation[] }) {
  return (
    <li>
      Location:
      <ul>
        {location.map((l) => (
          <li key={`${l.dimension}@${l.hierarchy}`}>
            {l.dimension}@{l.hierarchy}
            {l.level.map((lev, i) => `:${lev}=${l.path[i]}`)}
          </li>
        ))}
      </ul>
    </li>
  );
}

function PlainView({ value }: { value: any }) {
  return (
    <span
      className={isNullish(value) ? "nullish-content" : ""}
    >{`${value}`}</span>
  );
}

function ListView({ title, list }: { title: string; list: any[] }) {
  return (
    <li>
      {title}:
      {list.length === 0 ? (
        <span className="nullish-content"> (no items)</span>
      ) : (
        <ul>
          {list.map((item) => (
            <li key={`${item}`}>
              <PlainView value={item} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

const buildTitle = (text: string) => {
  const words = extractWords(text);
  return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
};

const BLACKLIST = new Set(["retrievalId", "timingInfo"]);

/**
 * This React component is responsible for showing detailed info about
 * retrieval.
 * */
export function Details({
  startTime,
  elapsedTime,
  metadata,
  partition,
}: {
  startTime: number[];
  elapsedTime: number[];
  metadata: ARetrieval;
  partition?: number;
}) {
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
      {Object.entries(metadata)
        .map(([key, value]) => ({ key, value }))
        .filter(({ key }) => !BLACKLIST.has(key))
        .sort((lhs, rhs) => lhs.key.localeCompare(rhs.key))
        .map(({ key, value }) => {
          if (key === "location") {
            return <LocationView location={value} key={key} />;
          }
          if (Array.isArray(value)) {
            return <ListView list={value} title={buildTitle(key)} key={key} />;
          }
          return (
            <li key={key}>
              {buildTitle(key)}: <PlainView value={value} />
            </li>
          );
        })}
    </ul>
  );
}

Details.defaultProps = {
  partition: undefined,
};
