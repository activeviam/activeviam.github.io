import React from "react";
import { Nav, Navbar } from "react-bootstrap";

/**
 * This React component is responsible for rendering the navigation bar.
 *
 * Tasks:
 *
 * * Drawing buttons for navigating through sections of the application;
 * * Drawing buttons for navigating the passes and the query tree.
 *
 * @param attributes - React JSX attributes
 * @param attributes.navigate - callback for switching between application sections
 * @param attributes.goBackButton - subcomponent for navigation through queries
 * @param attributes.passAndClusterChooser - subcomponent for choosing passes and clusters
 */
export function NavBar({
  navigate,
  goBackButton,
  passAndClusterChooser,
}: {
  navigate: (to: string) => void;
  goBackButton?: React.ReactNode;
  passAndClusterChooser?: React.ReactNode;
}) {
  return (
    <Navbar bg="dark" variant="dark">
      <Navbar.Brand className="ms-3">
        QueryViz
      </Navbar.Brand>
      <Nav
        className="me-auto"
        onSelect={(selectedKey: string | null) => {
          if (selectedKey) {
            navigate(selectedKey);
          }
        }}
      >
        <Nav.Link href="" eventKey="input">
          Input
        </Nav.Link>
        <Nav.Link href="" eventKey="summary">
          Summary
        </Nav.Link>
        <Nav.Link href="" eventKey="passGraph">
          Passes diagram
        </Nav.Link>
        <Nav.Link href="" eventKey="graph">
          Graph
        </Nav.Link>
        <Nav.Link href="" eventKey="partitions">
          Partitions
        </Nav.Link>
        <Nav.Link href="" eventKey="timeline">
          Timeline
        </Nav.Link>
      </Nav>
      <Nav className="ms-auto">
        {passAndClusterChooser}
        {goBackButton}
      </Nav>
    </Navbar>
  );
}
