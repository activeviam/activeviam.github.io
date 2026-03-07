import React from "react";
import { Accordion } from "react-bootstrap";
import { Filter } from "../../library/dataStructures/json/filter";

interface QueryFiltersPanelProps {
  filters: Filter[];
}

export function QueryFiltersPanel({ filters }: QueryFiltersPanelProps) {
  if (filters.length === 0) {
    return (
      <div className="query-filters-empty">
        <p className="text-muted">
          <em>No filters applied to this query.</em>
        </p>
      </div>
    );
  }

  return (
    <Accordion className="query-filters-accordion">
      {filters.map((filter) => (
        <Accordion.Item eventKey={String(filter.id)} key={filter.id}>
          <Accordion.Header>Filter #{filter.id}</Accordion.Header>
          <Accordion.Body>
            <pre className="query-filter-description">{filter.description}</pre>
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
