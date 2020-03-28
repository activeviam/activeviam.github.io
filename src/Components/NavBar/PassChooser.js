import { NavDropdown } from "react-bootstrap";
import React from "react";

// callback will be changePass()
const passChooser = (allQueries, currentPassId, callback) => {
  const allPassIds = [...new Set(allQueries.map(query => query.pass))].sort(
    (a, b) => a - b
  );
  if (allPassIds.length > 1) {
    return (
      <NavDropdown title="Pass number" id="basic-nav-dropdown" alignRight>
        {allPassIds.map(passId => (
          <NavDropdown.Item
            as="button"
            active={passId === currentPassId}
            onClick={() => callback(passId)}
          >
            {passId}
          </NavDropdown.Item>
        ))}
      </NavDropdown>
    );
  }
  return <></>;
};

export default passChooser;
