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
      input: this.props.lastInput,
      type: "classic",
      urlMode: false,
      username: "",
      password: "",
      url: ""
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
    const { input, urlMode, url, username, password, type } = this.state;

    return (
      <Form className="mx-4 my-4">
        <Form.Group controlId="exampleForm.ControlTextarea1">
          <Form.Control
            as="textarea"
            rows="10"
            defaultValue={input}
            onChange={event => this.setState({ input: event.target.value })}
          />
        </Form.Group>
        {urlMode ? (
          <Row>
            <Col md={6} lg={6}>
              <Form.Control
                placeholder="Server URL"
                defaultValue={url}
                onChange={event => this.setState({ url: event.target.value })}
              />
            </Col>
            <Col>
              <Form.Control
                placeholder="Username"
                defaultValue={username}
                onChange={event =>
                  this.setState({ username: event.target.value })
                }
              />
            </Col>
            <Col>
              <Form.Control
                placeholder="Password"
                type="password"
                defaultValue={password}
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
            label="Classic"
            type="radio"
            onChange={this.checkRadio("classic")}
            checked={type === "classic"}
          />
          <Form.Check
            inline
            label="Developer"
            type="radio"
            onChange={this.checkRadio("dev")}
            checked={type === "dev"}
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
          variant={urlMode === "server" ? "primary" : "secondary"}
          onClick={this.importFromServer}
        >
          Import from server
        </Button>
      </Form>
    );
  }
}

Input.propTypes = {
  passInput: PropTypes.func.isRequired,
  lastInput: PropTypes.string.isRequired
};

export default Input;
