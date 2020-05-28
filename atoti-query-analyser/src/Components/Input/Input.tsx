import React, { Component, useState } from "react";
import PropTypes from "prop-types";
import { Row, Col, Button, Form, Input, Radio } from 'antd';

type UserInputProps = {
  passInput: any,
  lastInput: string
}

const saveInput = event => {
  this.setState({ input: event.target.value });
};

const checkRadio = type => () => this.setState({ type });

const submitJson = (props, form) => {
  const type = form.getFieldValue('type') || 'classic';
  const input = form.getFieldValue('input');
  props.passInput("json", type, input);
};

const submitV1 = (props, form) => {
  const type = form.getFieldValue('type') || 'classic';
  const input = form.getFieldValue('input');
  props.passInput("v1", type, input);
};

const importFromServer = () => {
  if (this.state.urlMode) {
    this.submitQuery();
  } else {
    this.prepareImport();
  }
};

const prepareImport = () => {
  this.setState({ urlMode: true });
};

const submitQuery = () => {
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

const saveToLocalStorage = (form) => {
  const input = form.getFieldValue('input');
  window.localStorage.setItem("dev.input", input);
};

const loadFromLocalStorage = (form) => {
  const input = window.localStorage.getItem("dev.input");
  form.setFieldsValue({ input: input || "" });
};

const location = new URL(window.location.href);

const UserInput = (props: UserInputProps) => {
  const state = {
    input: props.lastInput,
    type: "classic",
    urlMode: false,
    username: "",
    password: "",
    url: "",
    devMode: location.search.includes("dev")
  };
  const [form] = Form.useForm();

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

  const { input, urlMode, url, username, password, type, devMode } = state;

  return (
    <Form
      form={form}>
      <Form.Item name="input" label="Query plan" required={true}>
        <Input.TextArea rows={10} />
      </Form.Item>

      <Form.Item label="Mode" name="type">
        <Radio.Group value={type}>
          <Radio.Button value="classic">Classic</Radio.Button>
          <Radio.Button value="developer">Developer</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Button type="primary" onClick={() => submitJson(props, form)} htmlType="submit">
        Import from Json
        </Button>
      {"  "}
      <Button type="primary" onClick={() => submitV1(props, form)} htmlType="submit">
        Import from V1
        </Button>
      {"  "}
      <Button
        type={urlMode ? "primary" : undefined}
        onClick={() => importFromServer()}
      >
        Import from server
        </Button>
      {devMode ? (
        <Button onClick={() => saveToLocalStorage(form)}>
          Into LS
        </Button>
      ) : null}
      {devMode ? (
        <Button onClick={() => loadFromLocalStorage(form)}>
          From LS
        </Button>
      ) : null}
    </Form>
  );
}

// UserInput.propTypes = {
//   passInput: PropTypes.func.isRequired,
//   lastInput: PropTypes.string.isRequired
// };

export default UserInput;
