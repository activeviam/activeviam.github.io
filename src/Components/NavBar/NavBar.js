import React from "react";
import PropTypes from "prop-types";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";

const NavBar = ({ navigate, goBackButton, passChooser }) => {
  return (
    <Navbar bg="dark" variant="dark">
      <Navbar.Brand href="">QueryViz</Navbar.Brand>
      <Nav className="mr-auto">
        <Nav.Link href="" onClick={() => navigate("input")}>
          Input
        </Nav.Link>
        <Nav.Link href="" onClick={() => navigate("graph")}>
          Graph
        </Nav.Link>
        <Nav.Link href="" onClick={() => navigate("timeline")}>
          Timeline
        </Nav.Link>
      </Nav>
      <Nav className="ml-auto">
        {passChooser}
        {goBackButton}
      </Nav>
    </Navbar>
  );
};

NavBar.propTypes = {
  navigate: PropTypes.func.isRequired,
  goBackButton: PropTypes.element.isRequired,
  passChooser: PropTypes.element.isRequired
};

export default NavBar;
