import React from "react";
import "./Details.css";
import { extractWords } from "library/utilities/textUtils";
import { CubeLocation } from "library/dataStructures/json/cubeLocation";
import { ARetrieval } from "library/dataStructures/json/retrieval";

/**
 * Checks whether `value` is `null`, `undefined` or an empty object.
 * */
function isNullish(value: unknown) {
  switch (typeof value) {
    case "undefined":
      return true;
    case "object":
      return value === null || Object.keys(value).length === 0;
    default:
      return false;
  }
}

/**
 * React component that represent a list of numbers.
 * @param attributes - React JSX attributes
 * @param attributes.values - List to be displayed
 * @param attributes.selected - Optional, index of list element to be highlighted
 * */
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

/**
 * React component that renders a list of {@link "library/dataStructures/json/cubeLocation"!CubeLocation}.
 * @param attributes - React JSX attributes
 * @param attributes.location - list of locations to be displayed.
 * */
function LocationView({ location }: { location: CubeLocation[] }) {
  return (
    <li>
      Location:
      <ul>
        {location.map((l) => (
          <li key={`${l.dimension}@${l.hierarchy}`}>
            {l.dimension}: {l.hierarchy}
            <ul>
              {l.level.map((lev, i) => (
                <li key={lev}>
                  <b>{lev + ": "}</b>
                  {l.path[i]}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </li>
  );
}

/**
 * React component that displays string representation of `value`.
 * @param attributes - React JSX attributes
 * @param attributes.value - Value to be displayed
 * */
function PlainView({ value }: { value: unknown }) {
  return (
    <span
      className={isNullish(value) ? "nullish-content" : ""}
    >{`${value}`}</span>
  );
}

/**
 * React component that displays an array as an unordered HTML list.
 * @param attributes - React JSX attributes
 * @param attributes.list - Array to be displayed
 * @param attributes.title - List title
 * */
function ListView({ title, list }: { title: string; list: unknown[] }) {
  const MAX_ELEMENTS = 10;
  return (
    <li>
      {title}:
      {list.length === 0 ? (
        <span className="nullish-content"> (no items)</span>
      ) : (
        <ul>
          {list
            .filter((_, idx) => idx < MAX_ELEMENTS)
            .map((item) => (
              <li key={`__element__${item}`}>
                <PlainView value={item} />
              </li>
            ))}
          {list.length > MAX_ELEMENTS && (
            <li key="__ETC__">
              <span className="nullish-content">
                And {list.length - MAX_ELEMENTS} more items
              </span>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

/**
 * Takes an identifier (in PascalCase, camelCase or snake_case), splits it into
 * words, capitalizes them and concatenates them using space symbol as separator.
 * */
function buildTitle(text: string): string {
  const words = extractWords(text);
  return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

const BLACKLIST = new Set(["retrievalId", "timingInfo"]);

/**
 * This React component is responsible for showing detailed info about
 * retrieval.
 * <br/>
 * Tasks:
 *
 * * Output of available data about retrieval;
 * * Custom representation of some properties (location, start time, elapsed time).
 *
 * @param attributes - React JSX attributes
 * @param attributes.startTime - Retrieval start times per partition
 * @param attributes.elapsedTime - Retrieval execution times per partition
 * @param attributes.metadata - Retrieval metadata
 * @param attributes.partition - Optional; if set, represents selected partition
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
        .filter(({ key, value }) => !BLACKLIST.has(key) && !isNullish(value))
        .sort((lhs, rhs) => lhs.key.localeCompare(rhs.key))
        .map(({ key, value }) => {
          if (key === "location") {
            return <LocationView location={value} key={key} />;
          }
          if (key === "underlyingRetrievals") {
            return (
              <ListView
                key={key}
                title={buildTitle(key)}
                list={(value as ARetrieval[]).map(
                  (retrieval) => `${retrieval.$kind} #${retrieval.retrievalId}`
                )}
              />
            );
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
