import React, { useEffect, useState } from "react";
import { Button, Col, Form, Row, Spinner } from "react-bootstrap";
import { useErrorMessage } from "../../hooks/notification";
import { ServerInput } from "../../library/inputProcessors/server";
import { asError } from "../../library/utilities/util";

/**
 * Specifies how to process input.
 * */
export enum InputMode {
  /** Input is a text in JSON format */
  JSON = "JSON",
  /** Input is server credentials (URL, username and password) */
  URL = "URL",
  /** Input is a text from ActivePivot logs */
  V1 = "V1",
}

/**
 * Specifies input form layout.
 * */
export enum InputType {
  /** Standard layout */
  CLASSIC,
  /** Extended layout with features for developers */
  DEVELOPER,
}

/**
 * Callback on form submission.
 * */
export type OnInput = (
  mode: InputMode,
  type: InputType,
  input: string | ServerInput,
  showError: (error: Error) => void
) => Promise<void>;

/**
 * This React component is used for getting server credentials from the user.
 * @param attributes - React JSX attributes
 * @param attributes.url - Server URL
 * @param attributes.setUrl - URL setter callback
 * @param attributes.username - Username
 * @param attributes.setUsername - Username setter callback
 * @param attributes.password - Password
 * @param attributes.setPassword - Password setter callback
 * */
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

/**
 * This React component is responsible for input type selection.
 *
 * @param attributes - React JSX attributes
 * @param attributes.type - Input type
 * @param attributes.setType - Input type setter callback
 * */
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

        const label = makeLabel(inputType);

        return (
          <Form.Check
            inline
            label={label}
            key={label}
            type="radio"
            onChange={() => setType(inputType)}
            checked={type === inputType}
          />
        );
      })}
    </div>
  );
}

/**
 * This React component is responsible for submission buttons.
 * @param attributes - React JSX attributes
 * @param attributes.urlMode - Boolean flag, needed for two-step input in URL mode
 * @param attributes.onSubmit - Callback for submission
 * */
function Buttons({
  urlMode,
  onSubmit,
}: {
  urlMode: boolean;
  onSubmit: (mode: InputMode) => void;
}) {
  const restoreInputMode = () => {
    const oldInputMode = window.localStorage.getItem("inputMode");
    if (oldInputMode === null) {
      return InputMode.JSON;
    }
    if (oldInputMode in InputMode) {
      return oldInputMode as InputMode;
    }
    return InputMode.JSON;
  };

  const [inputMode, setInputMode] = useState(restoreInputMode());

  useEffect(() => {
    setInputMode(restoreInputMode());
  }, []);

  useEffect(() => {
    window.localStorage.setItem("inputMode", inputMode);
  }, [inputMode]);

  return (
    <>
      <div key="inline-radio" className="mb-3">
        {[InputMode.JSON, InputMode.V1].map((mode) => {
          return (
            <Form.Check
              inline
              label={mode}
              key={mode}
              value={mode}
              type="radio"
              onChange={() => setInputMode(mode)}
              checked={mode === inputMode}
            />
          );
        })}
        <Button variant="primary" onClick={() => onSubmit(inputMode)}>
          Process
        </Button>{" "}
        <Button
          variant={urlMode ? "primary" : "secondary"}
          onClick={() => onSubmit(InputMode.URL)}
        >
          Import from Server
        </Button>
      </div>
    </>
  );
}

/**
 * This React component is a demo component that throws an error during React rendering.
 * */
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

/**
 * This React component is responsible for additional buttons for developer mode.
 *
 * @param attributes - React JSX attributes
 * @param attributes.input - input text
 * @param attributes.visible - boolean flag, sets visibility of this component
 * @param attributes.setInput - input text setter callback
 * */
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
    <div key="inline-radio" className="mb-3">
      <Button variant="outline-primary" onClick={saveToLocalStorage}>
        Save to LocalStorage
      </Button>{" "}
      <Button variant="outline-primary" onClick={loadFromLocalStorage}>
        Load from LocalStorage
      </Button>{" "}
      <ErrorButton />
    </div>
  );
}

/**
 * This React component is responsible for getting user input.
 *
 * @param attributes - React JSX attributes
 * @param attributes.lastInput - initial value for input text area
 * @param attributes.passInput - callback for form submission
 */
export function Input({
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

  const [prosessing, setProcessing] = useState(false);

  const { showError } = useErrorMessage();

  const prepareImport = () => {
    setUrlMode(true);
  };

  const submitQuery = async () => {
    setProcessing(true);
    const credentials = btoa(`${username}:${password}`);
    try {
      await passInput(
        InputMode.URL,
        type,
        {
          url,
          query: input,
          credentials: `Basic ${credentials}`,
        },
        showError
      );
    } catch (err) {
      showError(asError(err));
    } finally {
      setProcessing(false);
      setUrlMode(false);
    }
  };

  const doPassInput = async (mode: InputMode) => {
    setProcessing(true);
    try {
      await passInput(mode, type, input, showError);
    } catch (err) {
      showError(asError(err));
    } finally {
      setProcessing(false);
    }
  };

  const dispatchSubmit = (mode: InputMode) => {
    switch (mode) {
      case InputMode.JSON:
        doPassInput(InputMode.JSON);
        break;
      case InputMode.URL:
        if (urlMode) {
          submitQuery();
        } else {
          prepareImport();
        }
        break;
      case InputMode.V1:
        doPassInput(InputMode.V1);
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
      {prosessing && <Spinner animation="border" variant="primary" />}
    </Form>
  );
}
