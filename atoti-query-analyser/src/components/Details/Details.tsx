import React, { useState } from "react";
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
 * */
function Values({
  values,
  selected,
}: {
  values: (number | string)[];
  selected?: number;
}) {
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
}

Values.defaultProps = {
  selected: undefined,
};

/**
 * Renders a part of a location path
 * @param pathPart - part of the path to be displayed
 */
function renderPathPart(pathPart: string | string[]): string {
  if (Array.isArray(pathPart)) {
    return "[" + pathPart.join(", ") + "]";
  } else {
    return pathPart;
  }
}

const isOnlyAllMember = (axisLocation: CubeLocation): boolean => {
  return axisLocation.path.length === 1 && axisLocation.level[0] === "ALL";
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
        {location.map((l) =>
          isOnlyAllMember(l) ? null : (
            <li key={`${l.dimension}@${l.hierarchy}`}>
              {l.dimension}: {l.hierarchy}
              <ul>
                {l.level.map((lev, i) =>
                  i === 0 && lev === "ALL" ? null : (
                    <li key={lev}>
                      <span className="level-depth">[{i}]</span>
                      <b>{lev + ": "}</b>
                      {renderPathPart(l.path[i])}
                    </li>
                  )
                )}
              </ul>
            </li>
          )
        )}
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
  const [truncated, setTruncated] = useState(true);

  return (
    <li>
      {title}:
      {list.length === 0 ? (
        <span className="nullish-content"> (no items)</span>
      ) : (
        <ul style={{ overflowY: "auto", maxHeight: truncated ? "none" : 200 }}>
          {list
            .filter((_, idx) => !truncated || idx < MAX_ELEMENTS)
            .map((item, i) => (
              <li key={`__element__${i}`}>
                <PlainView value={item} />
              </li>
            ))}
          {list.length > MAX_ELEMENTS && truncated && (
            <li key="__ETC__">
              <button
                className="nullish-content button-as-link"
                onClick={() => setTruncated(false)}
              >
                And {list.length - MAX_ELEMENTS} more items
              </button>
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

const BLACKLIST = new Set([
  "retrievalId",
  "timingInfo",
  // Often not important information
  "$kind",
  "type",
  "measureProvider",
]);

const selectRepresentativeValues = (
  values: readonly number[],
  size = 5
): (number | string)[] => {
  const sortedValues = [...values];
  sortedValues.sort();
  if (values.length > 2 * size) {
    return [
      ...sortedValues.slice(0, 5),
      "..",
      ...sortedValues.slice(values.length - 5),
    ];
  } else {
    return sortedValues;
  }
};

const ValueFromList = ({
  values,
  selected,
}: Readonly<{ values: number[]; selected?: number }>) =>
  selected === undefined || selected < 0 ? (
    <Values values={values} />
  ) : (
    <>
      {values[selected]}
      &nbsp;
      <div className={"value-sampling"}>
        <Values values={selectRepresentativeValues(values)} />
      </div>
    </>
  );

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
  focused?: boolean;
}) {
  return (
    <ul>
      <li key="startTimeElts">
        Start (ms): <ValueFromList values={startTime} selected={partition} />
      </li>
      <li key="elapsedTimeElts">
        Elapsed (ms):{" "}
        <ValueFromList values={elapsedTime} selected={partition} />
      </li>
      {Object.entries(metadata)
        .filter(([key, value]) => !BLACKLIST.has(key) && !isNullish(value))
        .sort((lhs, rhs) => lhs[0].localeCompare(rhs[0]))
        .map(([key, value]) => {
          if (key === "location") {
            return <LocationView location={value} key={key} />;
          } else if (key === "underlyingRetrievals") {
            return (
              <ListView
                key={key}
                title={buildTitle(key)}
                list={(value as ARetrieval[]).map(
                  (retrieval) => `${retrieval.$kind} #${retrieval.retrievalId}`
                )}
              />
            );
          } else if (key === "resultSizes") {
            const sizes = value as number[];
            const selectedPosition =
              sizes.length === elapsedTime.length ? partition : -1;
            const valueList = (
              <ValueFromList
                values={value as number[]}
                selected={selectedPosition}
              />
            );
            return <li key={key}>Result sizes: {valueList}</li>;
          } else if (Array.isArray(value)) {
            return <ListView list={value} title={buildTitle(key)} key={key} />;
          } else {
            return (
              <li key={key}>
                {buildTitle(key)}: <PlainView value={value} />
              </li>
            );
          }
        })}
    </ul>
  );
}

Details.defaultProps = {
  partition: undefined,
};
