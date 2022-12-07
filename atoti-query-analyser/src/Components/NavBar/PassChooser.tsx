import { NavDropdown } from "react-bootstrap";
import React from "react";
import { QueryPlanMetadata } from "../../library/graphView/extractMetadata";

function passLabel({
  pass: passId,
  passType,
}: {
  pass: number;
  passType: string;
}) {
  return `[${passId}] - ${passType}`;
}

// callback will be changePass()
// Passes are executed from higher to lower
function passChooser(
  allQueries: QueryPlanMetadata[],
  currentPassId: number,
  callback: (id: number) => void
) {
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

export default passChooser;
