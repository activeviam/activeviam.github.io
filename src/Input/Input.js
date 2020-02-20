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

  submit = type => () => {
    this.props.passInput(type, this.state.input);
  };

  render() {
    return (
      <Form className="mx-4 my-4">
        <Form.Group controlId="exampleForm.ControlTextarea1">
          <Form.Control
            as="textarea"
            rows="10"
            onChange={event => this.setState({ input: event.target.value })}
          />
        </Form.Group>
        <Button variant="primary" onClick={this.submit("json")}>
          Import from Json
        </Button>
        {"  "}
        <Button variant="primary" onClick={this.submit("v1")}>
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
