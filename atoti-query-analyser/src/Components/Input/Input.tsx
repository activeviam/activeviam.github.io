import React, { Component } from "react";
import PropTypes from "prop-types";
import {Row, Col, Button, Form, Input, Radio} from 'antd';

type UserInputProps = {
  passInput: any,
  lastInput: string
}

class UserInput extends Component<UserInputProps, any> {
  constructor(props) {
    super(props);
    const location = new URL(window.location.href);

    this.state = {
      input: this.props.lastInput,
      type: "classic",
      urlMode: false,
      username: "",
      password: "",
      url: "",
      devMode: location.search.includes("dev")
    };
  }

  saveInput = event => {
    this.setState({ input: event.target.value });
  };

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

  saveToLocalStorage = () => {
    window.localStorage.setItem("dev.input", this.state.input);
  };

  loadFromLocalStorage = () => {
    const input = window.localStorage.getItem("dev.input");
    this.setState({ input: input || "" });
  };

  render() {
    /*
    
        {urlMode ? (
          <Row>
            <Col span={6}>
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
    */

    const { input, urlMode, url, username, password, type } = this.state;

    return (
      <Form>
        <Form.Item name="input" label="Query plan">
          <Input.TextArea rows={10} />
        </Form.Item>

        <Form.Item label="Mode" name="type">
          <Radio.Group value={type}>
            <Radio.Button value="classic">Classic</Radio.Button>
            <Radio.Button value="developer">Developer</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Button type="primary" onClick={this.submitJson}>
          Import from Json
        </Button>
        {"  "}
        <Button type="primary" onClick={this.submitV1}>
          Import from V1
        </Button>
        {"  "}
        <Button
          type={urlMode === "server" ? "primary" : undefined}
          onClick={this.importFromServer}
        >
          Import from server
        </Button>
        {this.state.devMode ? (
          <Button onClick={this.saveToLocalStorage}>
            Into LS
          </Button>
        ) : null}
        {this.state.devMode ? (
          <Button onClick={this.loadFromLocalStorage}>
            From LS
          </Button>
        ) : null}
      </Form>
    );
  }
}

// UserInput.propTypes = {
//   passInput: PropTypes.func.isRequired,
//   lastInput: PropTypes.string.isRequired
// };

export default UserInput;
