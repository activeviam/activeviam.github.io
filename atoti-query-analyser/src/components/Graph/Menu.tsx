import React, { useMemo, useState } from "react";
import { Measure } from "../../library/dataStructures/json/measure";
import FuzzySearch from "fuzzy-search";
import _ from "lodash";
import { FaMinus, FaPlus } from "react-icons/fa";
import { Form, Button } from "react-bootstrap";
import "./Menu.css";
import { humanisticStringComparator } from "../../library/utilities/textUtils";

/**
 * This React component displays the list of measure search results. Each result
 * has a button to add it into the set of selected measures.
 *
 * @param attributes - React JSX attributes
 * @param attributes.values - Search results to be displayed
 * @param attributes.addCallback - Callback for "Add" buttons
 * */
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

/**
 * This React component shows the list of selected measures. Each list entry has
 * a button to remove it from the list.
 *
 * @param attributes - React JSX attributes
 * @param attributes.values - Measures list
 * @param attributes.removeCallback - Callback for "Remove" buttons
 * */
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

/**
 * This React component shows a placeholder for the search form.
 *
 * @param attributes - React JSX attributes
 * @param attributes.values - Values to be displayed in the placeholder
 * */
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

/**
 * This React component is responsible for measure search and selection.
 *
 * @param attributes - React JSX attributes
 * @param attributes.measures - Set of available measures
 * @param attributes.selectedMeasures - List of selected measures
 * @param attributes.onSelectedMeasure - Callback which is called when user adds
 * or removes measures from the selection
 */
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
