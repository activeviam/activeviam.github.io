import React from "react";
import PropTypes from "prop-types";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";

const NavBar = ({ dataIsEmpty, navigate }) => {
  // noinspection CheckTagEmptyBody jsx-a11y/anchor-is-valid
  return (
    <Navbar bg="dark" variant="dark">
      <Navbar.Brand href="">QueryViz</Navbar.Brand>
      <Nav className="mr-auto">
        <Nav.Link href="" onClick={() => navigate("input")}>
          Input
        </Nav.Link>
        <Nav.Link
          href=""
          // disabled={dataIsEmpty}
          onClick={() => navigate("graph")}
        >
          Graph
        </Nav.Link>
        <Nav.Link
          href=""
          // disabled={dataIsEmpty}
          onClick={() => navigate("timeline")}
        >
          Timeline
        </Nav.Link>
      </Nav>
    </Navbar>
  );
};

NavBar.propTypes = {
  dataIsEmpty: PropTypes.bool.isRequired,
  navigate: PropTypes.func.isRequired
};

export default NavBar;
