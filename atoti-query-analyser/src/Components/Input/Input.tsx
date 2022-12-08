import React, { useState } from "react";
import { Button, Col, Form, Row } from "react-bootstrap";
import { useErrorMessage } from "../../hooks/notification";

export enum InputMode {
  JSON,
  URL,
  V1,
}

export enum InputType {
  CLASSIC,
  DEVELOPER,
}

export type OnInput = (
  mode: InputMode,
  type: InputType,
  input: string | {}
) => Promise<void>;

function URLInput({
  url,
  setUrl,
  username,
  setUsername,
  password,
  setPassword,
}: {
  url: string;
  setUrl: (newUrl: string) => void;
  username: string;
  setUsername: (newUsername: string) => void;
  password: string;
  setPassword: (newPassword: string) => void;
}) {
  return (
    <Row className={"mt-1"}>
      <Col md={6} lg={6}>
        <Form.Control
          placeholder="Server URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </Col>
      <Col>
        <Form.Control
          placeholder="Username"
          defaultValue={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </Col>
      <Col>
        <Form.Control
          placeholder="Password"
          type="password"
          defaultValue={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Col>
    </Row>
  );
}

function TypeInput({
  type,
  setType,
}: {
  type: InputType;
  setType: (newType: InputType) => void;
}) {
  const makeLabel = (inputType: InputType): string => {
    const inCodeLabel = InputType[inputType];
    return (
      inCodeLabel[0].toUpperCase() + inCodeLabel.substring(1).toLowerCase()
    );
  };

  return (
    <div key="inline-radio" className="mb-3">
      {Object.values(InputType).map((inputType: InputType | string) => {
        if (typeof inputType !== "number") {
          return null;
        }

        return (
          <Form.Check
            inline
            label={makeLabel(inputType)}
            type="radio"
            onChange={() => setType(inputType)}
            checked={type === inputType}
          />
        );
      })}
    </div>
  );
}

function Buttons({
  urlMode,
  onSubmit,
}: {
  urlMode: boolean;
  onSubmit: (mode: InputMode) => void;
}) {
  return (
    <>
      <Button variant="primary" onClick={() => onSubmit(InputMode.JSON)}>
        Import from Json
      </Button>{" "}
      <Button variant="primary" onClick={() => onSubmit(InputMode.V1)}>
        Import from V1
      </Button>{" "}
      <Button
        variant={urlMode ? "primary" : "secondary"}
        onClick={() => onSubmit(InputMode.URL)}
      >
        Import from Server
      </Button>
    </>
  );
}

function ErrorButton() {
  const [error, setError] = useState(false);

  return (
    <Button variant="outline-secondary" onClick={() => setError(true)}>
      {error
        ? (() => {
            throw new Error("Cuckoo!");
          })()
        : "Throw an error"}
    </Button>
  );
}

function DevButtons({
  input,
  visible,
  setInput,
}: {
  input: string;
  visible: boolean;
  setInput: (value: string) => void;
}) {
  if (!visible) {
    return null;
  }

  const saveToLocalStorage = () => {
    if (input.trim() !== "") {
      window.localStorage.setItem("dev.input", input);
    }
  };

  const loadFromLocalStorage = () => {
    setInput(window.localStorage.getItem("dev.input") || "");
  };

  return (
    <>
      {" "}
      <Button variant="outline-primary" onClick={saveToLocalStorage}>
        Save to LocalStorage
      </Button>{" "}
      <Button variant="outline-primary" onClick={loadFromLocalStorage}>
        Load from LocalStorage
      </Button>{" "}
      <ErrorButton />
    </>
  );
}

export default function Input({
  passInput,
  lastInput,
}: {
  passInput: OnInput;
  lastInput: string;
}) {
  const location = new URL(window.location.href);

  const [input, setInput] = useState(lastInput);
  const [type, setType] = useState(InputType.CLASSIC);
  const [urlMode, setUrlMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const devMode = location.search.includes("dev"); // Backward compatibility

  const { showError } = useErrorMessage();

  const prepareImport = () => {
    setUrlMode(true);
  };

  const submitQuery = () => {
    const credentials = btoa(`${username}:${password}`);
    passInput(InputMode.URL, type, {
      url,
      query: input,
      credentials: `Basic ${credentials}`,
    })
      .then(() => setUrlMode(false))
      .catch(showError);
  };

  const dispatchSubmit = (mode: InputMode) => {
    switch (mode) {
      case InputMode.JSON:
        passInput(InputMode.JSON, type, input).catch(showError);
        break;
      case InputMode.URL:
        if (urlMode) {
          submitQuery();
        } else {
          prepareImport();
        }
        break;
      case InputMode.V1:
        passInput(InputMode.V1, type, input).catch(showError);
        break;
      default:
        throw new Error(`Unexpected input mode: ${mode} ${InputMode[mode]}`);
    }
  };

  return (
    <Form className="m-4">
      <Form.Group controlId="query-input">
        <Form.Control
          as="textarea"
          rows={10}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </Form.Group>
      {urlMode ? (
        <URLInput
          url={url}
          setUrl={setUrl}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
        />
      ) : null}
      <TypeInput type={type} setType={setType} />
      <Buttons urlMode={urlMode} onSubmit={dispatchSubmit} />
      <DevButtons
        visible={devMode || type === InputType.DEVELOPER}
        input={input}
        setInput={setInput}
      />
    </Form>
  );
}
