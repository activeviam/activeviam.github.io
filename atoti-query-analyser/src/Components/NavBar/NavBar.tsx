import React from "react";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";

const NavBar = ({ navigate, goBackButton, passChooser }: {
  navigate: (to: string) => void,
  goBackButton?: JSX.Element,
  passChooser?: JSX.Element
}) => {
  return (
    <Navbar bg="dark" variant="dark">
      <Navbar.Brand href="">QueryViz</Navbar.Brand>
      <Nav className="me-auto">
        <Nav.Link href="" onClick={() => navigate("input")}>
          Input
        </Nav.Link>
        <Nav.Link href="" onClick={() => navigate("summary")}>
          Summary
        </Nav.Link>
        <Nav.Link href="" onClick={() => navigate("graph")}>
          Graph
        </Nav.Link>
        <Nav.Link href="" onClick={() => navigate("timeline")}>
          Timeline
        </Nav.Link>
      </Nav>
      <Nav className="ms-auto">
        {passChooser}
        {goBackButton}
      </Nav>
    </Navbar>
  );
};

export default NavBar;
