import React, { Component } from "react";
import PropTypes from "prop-types";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

class Input extends Component {
  constructor(props) {
    super(props);
    this.state = {
      input:
        "SELECT {[Measures].[contributors.COUNT]} on 0 from [EquityDerivativesCube]",
      type: "default",
      urlMode: false,
      username: "admin",
      password: "admin",
      url: "http://localhost:9090"
    };
  }

  checkRadio = type => () => this.setState({ type });

  submitJson = () => {
    this.props.passInput("json", this.state.type, this.state.input);
  };

  submitV1 = () => {
    this.props.passInput("v1", this.state.type, this.state.input);
  };

  importFromServer = () => {
    if (this.state.urlMode) {
      this.submitQuery();
    } else {
      this.prepareImport();
    }
  };

  prepareImport = () => {
    this.setState({ urlMode: true });
  };

  submitQuery = () => {
    const credentials = btoa(`${this.state.username}:${this.state.password}`);
    this.props.passInput("url", this.state.type, {
      url: this.state.url,
      query: this.state.input,
      credentials: `Basic ${credentials}`
    });
    this.setState({
      type: "default"
    });
  };

  render() {
    return (
      <Form className="mx-4 my-4">
        <Form.Group controlId="exampleForm.ControlTextarea1">
          <Form.Control
            as="textarea"
            rows="10"
            defaultValue={this.state.input}
            onChange={event => this.setState({ input: event.target.value })}
          />
        </Form.Group>
        {this.state.urlMode ? (
          <Row>
            <Col md={6} lg={6}>
              <Form.Control
                placeholder="Server URL"
                defaultValue={this.state.url}
                onChange={event => this.setState({ url: event.target.value })}
              />
            </Col>
            <Col>
              <Form.Control
                placeholder="Username"
                defaultValue={this.state.username}
                onChange={event =>
                  this.setState({ username: event.target.value })
                }
              />
            </Col>
            <Col>
              <Form.Control
                placeholder="Password"
                type="password"
                defaultValue={this.state.password}
                onChange={event =>
                  this.setState({ password: event.target.value })
                }
              />
            </Col>
          </Row>
        ) : null}

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
        {"  "}
        <Button
          variant={this.state.urlMode === "server" ? "primary" : "secondary"}
          onClick={this.importFromServer}
        >
          Import from server
        </Button>
      </Form>
    );
  }
}

Input.propTypes = {
  passInput: PropTypes.func.isRequired
};

export default Input;
