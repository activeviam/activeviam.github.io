import React, { Component, useState } from "react";
import FuzzySearch from "fuzzy-search";
import _ from "lodash";
import {Button, Form, Input} from 'antd';

import "./Menu.css";

type MenuProps = {
  measures: string[],
  selectedMeasures: string[],
  onSelectedMeasure: (string) => void
};

const searchMeasures = (props: MenuProps, value: string, setMatches) => {
  const needle = value.trim();
  if (needle === "") {
    setMatches(null);
  } else {
    const searcher = new FuzzySearch(
      _.difference(props.measures, props.selectedMeasures),
      undefined,
      {
        caseSensitive: false
      }
    );
    const result = searcher.search(needle);
    setMatches(result);
  }
};

type MatchingMeasuresProps = {
  matches: null | string[],
  onSelectedMeasure: ({measure: string, selected: boolean}) => void
}
const MatchingMeasures: React.FC<MatchingMeasuresProps> = (props) => {
  const { onSelectedMeasure, matches } = props;
  if (matches === null) return null;

  return (
    <ul className="measures">
      {matches.map(measure => (
        <li key={measure}>
          <Button
            size="small"
            onClick={() => onSelectedMeasure({ measure, selected: true })}
          >
            +
          </Button>{" "}
          {measure}
        </li>
      ))}
    </ul>
  );
}

const Menu: React.FC<MenuProps> = (props) => {
  const [matchingMeasures, setMatchingMeasures] = useState<string[]>(null);

  const { measures, selectedMeasures, onSelectedMeasure } = props;
  const listing =
    selectedMeasures.length > 0
      ? selectedMeasures.map(measure => (
          <li key={measure}>
            <Button
              danger
              size="small"
              onClick={() => onSelectedMeasure({ measure, selected: false })}
            >
              -
            </Button>{" "}
            {measure}
          </li>
        ))
      : [
          ...measures.slice(0, 5).map(m => (
            <li key={m} className="sample">
              {m}
            </li>
          )),
          <li key="__sample__" className="sample">
            ...
          </li>
        ];
  return (
    <div className="contextual-menu">
      <h5>Selected measures</h5>
      <Input
        placeholder="Search a measure"
        defaultValue=""
        onChange={e => searchMeasures(props, e.target.value, setMatchingMeasures)}
      />
      <MatchingMeasures 
        matches={matchingMeasures} 
        onSelectedMeasure={onSelectedMeasure} />
      <ul className="measures">{listing}</ul>
    </div>
  );
};

export default Menu;
