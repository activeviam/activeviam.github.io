import React, { Component } from "react";
import PropTypes from "prop-types";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

class Input extends Component {
  componentDidMount() {}

  componentWillUnmount() {}

  render() {
    const { passInput } = this.props;
    return (
      <form onSubmit={passInput}>
        <Form.Group controlId="exampleForm.ControlTextarea1">
          <Form.Label>Enter your query</Form.Label>
          <Form.Control as="textarea" rows="10" />
        </Form.Group>
        <Button variant="primary" type="submit">
          Submit
        </Button>
      </form>
    );
  }
}

Input.propTypes = {
  passInput: PropTypes.func.isRequired
};

export default Input;
