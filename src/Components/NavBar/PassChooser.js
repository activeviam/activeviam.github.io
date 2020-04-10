import { NavDropdown } from "react-bootstrap";
import React from "react";

const passLabel = ({ pass: passId, passType }) => `[${passId}] - ${passType}`;

// callback will be changePass()
// Passes are executed from higher to lower
const passChooser = (allQueries, currentPassId, callback) => {
  const allPassIds = allQueries
    .filter(query => query.parentId === null)
    .sort((a, b) => b.pass - a.pass);
  if (allPassIds.length > 1) {
    const activePass = allPassIds.find(p => p.pass === currentPassId);
    const dropName = activePass ? passLabel(activePass) : "Query pass";
    return (
      <NavDropdown title={dropName} id="basic-nav-dropdown" alignRight>
        {allPassIds.map(pass => (
          <NavDropdown.Item
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
};

export default passChooser;
