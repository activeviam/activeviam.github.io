import React, { useMemo, useState } from "react";
import { Measure } from "../../library/dataStructures/json/measure";
import FuzzySearch from "fuzzy-search";
import _ from "lodash";
import { FaMinus, FaPlus } from "react-icons/fa";
import { Form } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import "./Menu.css";
import { humanisticStringComparator } from "../../library/utilities/textUtils";

function SearchResults({
  values,
  addCallback,
}: {
  values: string[] | null;
  addCallback: (value: string) => void;
}) {
  if (values === null) {
    return null;
  }

  if (values.length === 0) {
    return <i>No results found</i>;
  }

  return (
    <ul className="measures">
      {values.map((value) => {
        return (
          <li key={value}>
            <Button
              className="my-0"
              variant="success"
              size="sm"
              onClick={() => addCallback(value)}
            >
              <FaPlus />
            </Button>
            {` ${value}`}
          </li>
        );
      })}
    </ul>
  );
}

function SelectedItems({
  values,
  removeCallback,
}: {
  values: string[];
  removeCallback: (value: string) => void;
}) {
  return (
    <ul className="measures">
      {values.map((value) => {
        return (
          <li key={value}>
            <Button
              variant="danger"
              size="sm"
              className="my-0"
              onClick={() => removeCallback(value)}
            >
              <FaMinus />
            </Button>
            {` ${value}`}
          </li>
        );
      })}
    </ul>
  );
}

function SamplePlaceholder({ values }: { values: string[] }) {
  return (
    <ul className="measures">
      {values.map((value) => {
        return (
          <li key={value} className="sample">
            {value}
          </li>
        );
      })}
      <li key="__sample__" className="sample">
        ...
      </li>
    </ul>
  );
}

export function Menu({
  measures,
  selectedMeasures,
  onSelectedMeasure,
}: {
  measures: Set<Measure>;
  selectedMeasures: Measure[];
  onSelectedMeasure: ({
    measure,
    selected,
  }: {
    measure: Measure;
    selected: boolean;
  }) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const matchingMeasures = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery === "") {
      return null;
    }
    const searcher = new FuzzySearch(
      _.difference(Array.from(measures), selectedMeasures),
      undefined,
      { caseSensitive: false }
    );
    return searcher.search(trimmedQuery).sort(humanisticStringComparator);
  }, [measures, selectedMeasures, searchQuery]);

  const selectMeasure = (measure: Measure) =>
    onSelectedMeasure({ measure, selected: true });

  const unselectMeasure = (measure: Measure) =>
    onSelectedMeasure({ measure, selected: false });

  return (
    <div className="contextualMenu">
      <h5>Selected measures</h5>
      <Form>
        <Form.Group>
          <Form.Control
            type="text"
            placeholder="Search a measure"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Form.Group>
      </Form>
      <SearchResults values={matchingMeasures} addCallback={selectMeasure} />
      {selectedMeasures.length > 0 ? (
        <SelectedItems
          values={selectedMeasures}
          removeCallback={unselectMeasure}
        />
      ) : (
        <SamplePlaceholder values={Array.from(measures).slice(0, 5)} />
      )}
    </div>
  );
}
