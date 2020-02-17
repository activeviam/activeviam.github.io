import React, { Component } from "react";
import PropTypes from "prop-types";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

class Input extends Component {
  constructor(props) {
    super(props);
    this.state = {
      input: ""
    };
  }

  submitJson = () => {
    this.props.passInput("json", this.state.input);
  };

  submitV1 = () => {
    this.props.passInput("v1", this.state.input);
  };

  render() {
    return (
      <Form>
        <Form.Group controlId="exampleForm.ControlTextarea1">
          <Form.Control
            as="textarea"
            rows="10"
            onChange={event => this.setState({ input: event.target.value })}
          />
        </Form.Group>
        <Button variant="primary" onClick={this.submitJson}>
          Import from Json
        </Button>
        {"  "}
        <Button variant="primary" onClick={this.submitV1}>
          Import from V1
        </Button>
      </Form>
    );
  }
}

Input.propTypes = {
  passInput: PropTypes.func.isRequired
};

export default Input;
