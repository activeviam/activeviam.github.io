import React, { Component } from "react";
import PropTypes from "prop-types";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

class Input extends Component {
  constructor(props) {
    super(props);
    this.state = {
      input: "",
      type: "default"
    };
  }

  checkRadio = type => () => this.setState({ type });

  submitJson = () => {
    this.props.passInput("json", this.state.type, this.state.input);
  };

  submitV1 = () => {
    this.props.passInput("v1", this.state.type, this.state.input);
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

        <div key="inline-radio" className="mb-3">
          <Form.Check
            inline
            label="Default"
            type="radio"
            onChange={this.checkRadio("default")}
            checked={this.state.type === "default"}
          />
          <Form.Check
            inline
            label="Fill Timing Info"
            type="radio"
            onChange={this.checkRadio("fillTimingInfo")}
            checked={this.state.type === "fillTimingInfo"}
          />
          <Form.Check
            inline
            label="Developer"
            type="radio"
            onChange={this.checkRadio("dev")}
            checked={this.state.type === "dev"}
          />
        </div>

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
