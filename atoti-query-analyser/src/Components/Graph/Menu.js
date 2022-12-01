import React, { Component } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import FuzzySearch from "fuzzy-search";
import _ from "lodash";

import "./Menu.css";

class Menu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      matchingMeasures: null
    };
  }

  searchMeasures = event => {
    const needle = event.target.value.trim();
    if (needle === "") {
      this.setState({ matchingMeasures: null });
    } else {
      const searcher = new FuzzySearch(
        _.difference(this.props.measures, this.props.selectedMeasures),
        undefined,
        {
          caseSensitive: false
        }
      );
      const result = searcher.search(needle);
      this.setState({ matchingMeasures: result });
    }
  };

  renderMatchingMeasures() {
    if (this.state.matchingMeasures === null) return null;

    const { onSelectedMeasure } = this.props;
    return (
      <ul className="measures">
        {this.state.matchingMeasures.map(measure => (
          <li key={measure}>
            <Button
              variant="outline-success"
              size="sm"
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

  render() {
    const { measures, selectedMeasures, onSelectedMeasure } = this.props;
    console.log(measures, selectedMeasures );
    const listing =
      selectedMeasures.length > 0
        ? selectedMeasures.map(measure => (
            <li key={measure}>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => onSelectedMeasure({ measure, selected: false })}
              >
                -
              </Button>{" "}
              {measure}
            </li>
          ))
        : [
            ...Array.from(measures).slice(0, 5).map(m => (
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
        <Form>
          <Form.Group>
            <Form.Control
              type="text"
              placeholder="Search a measure"
              defaultValue=""
              onChange={this.searchMeasures}
            />
          </Form.Group>
        </Form>
        {this.renderMatchingMeasures()}
        <ul className="measures">{listing}</ul>
      </div>
    );
  }
}

export default Menu;
