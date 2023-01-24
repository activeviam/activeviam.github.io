import { NavDropdown } from "react-bootstrap";
import React from "react";
import { QueryPlanMetadata } from "../../library/graphProcessors/extractMetadata";

/**
 * Builds text label for QueryPlanMetadata
 * */
function passLabel({ pass: passId, passType }: QueryPlanMetadata) {
  return `[${passId}] - ${passType}`;
}

// callback will be changePass()
// Passes are executed from higher to lower
/**
 * This React component is used for pass selection.
 *
 * @param attributes - React JSX attributes
 * @param attributes.allQueries - array of queries metadata
 * @param attributes.currentPassId - id of the current pass
 * @param attributes.callback - callback for changing selected pass
 */
export function PassChooser({
  allQueries,
  currentPassId,
  callback,
}: {
  allQueries: QueryPlanMetadata[];
  currentPassId: number;
  callback: (id: number) => void;
}) {
  const allPassIds = allQueries
    .filter((query) => query.parentId === null)
    .sort((a, b) => b.pass - a.pass);
  if (allPassIds.length > 1) {
    const activePass = allPassIds.find((p) => p.pass === currentPassId);
    const dropName = activePass ? passLabel(activePass) : "Query pass";
    return (
      <NavDropdown title={dropName} id="basic-nav-dropdown" align="end">
        {allPassIds.map((pass) => (
          <NavDropdown.Item
            key={pass.pass}
            as="button"
            active={pass.pass === currentPassId}
            onClick={() => callback(pass.pass)}
          >
            {passLabel(pass)}
          </NavDropdown.Item>
        ))}
      </NavDropdown>
    );
  }
  return <></>;
}
