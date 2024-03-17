import React, { useEffect, useState } from "react";
import {
  Button,
  ButtonGroup,
  Col,
  Form,
  Row,
  Spinner,
  ToggleButton,
} from "react-bootstrap";
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

export enum InputSource {
  TEXT_AREA = "Text area",
  FILE = "File upload",
  SERVER = "Server query",
}

/**
 * Callback on form submission.
 * */
export type OnInput = (
  mode: InputMode,
  type: InputType,
  input: string | ServerInput,
  showError: (error: Error) => void,
  statusLine: (message: string) => void
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

function SourceInput({
  source,
  setSource,
}: {
  source: InputSource;
  setSource: (newSource: InputSource) => void;
}) {
  return (
    <>
      {[InputSource.TEXT_AREA, InputSource.FILE, InputSource.SERVER].map(
        (src) => {
          return (
            <Form.Check
              inline
              label={src}
              key={src}
              value={src}
              type="radio"
              onChange={() => setSource(src)}
              checked={src === source}
            />
          );
        }
      )}
    </>
  );
}

function TooBigInput({ data }: { data: string }) {
  const [forceRender, setForceRender] = useState(false);
  return (
    <div>
      <p>Data size exceeds 1 MiB. Its rendering may cause freezing.</p>
      <ButtonGroup>
        <ToggleButton
          id="forceRenderCheck"
          type="checkbox"
          checked={forceRender}
          onChange={(e) => {
            setForceRender(e.currentTarget.checked);
          }}
          value="1"
        >
          Render anyway
        </ToggleButton>
      </ButtonGroup>
      {forceRender && (
        <Form.Control as="textarea" rows={10} value={data} readOnly />
      )}
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
  onDropData,
}: {
  urlMode: boolean;
  onSubmit: (mode: InputMode) => void;
  onDropData: () => void;
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
        {urlMode ? (
          <Button
            variant={urlMode ? "primary" : "secondary"}
            onClick={() => onSubmit(InputMode.URL)}
          >
            Import
          </Button>
        ) : (
          <>
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
            </Button>
          </>
        )}{" "}
        <Button variant="outline-danger" onClick={onDropData}>
          Drop data
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

  const [source, setSource] = useState(InputSource.FILE);
  const [input, setInput] = useState(lastInput);
  const [type, setType] = useState(InputType.CLASSIC);
  const [urlMode, setUrlMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const devMode = location.search.includes("dev"); // Backward compatibility
  const [statusLine, setStatusLine] = useState("");

  const [processing, setProcessing] = useState(false);

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
        showError,
        setStatusLine
      );
    } catch (err) {
      showError(asError(err));
    } finally {
      setProcessing(false);
      setUrlMode(false);
    }
  };

  const doPassInput = async (data: string, mode: InputMode) => {
    setProcessing(true);
    try {
      await passInput(mode, type, data, showError, setStatusLine);
    } catch (err) {
      showError(asError(err));
    } finally {
      setProcessing(false);
    }
  };

  const dispatchSubmit = (mode: InputMode) => {
    switch (mode) {
      case InputMode.JSON:
        doPassInput(input, InputMode.JSON);
        break;
      case InputMode.URL:
        if (urlMode) {
          submitQuery();
        } else {
          prepareImport();
        }
        break;
      case InputMode.V1:
        doPassInput(input, InputMode.V1);
        break;
      default:
        throw new Error(`Unexpected input mode: ${mode} ${InputMode[mode]}`);
    }
  };

  const prettySize = (size: number) => {
    const suffixes = ["bytes", "KiB", "MiB", "GiB", "TiB"];
    let suffixIdx = 0;
    let mutableSize = size;
    while (mutableSize > 1024 && suffixIdx + 1 < suffixes.length) {
      mutableSize /= 1024;
      ++suffixIdx;
    }
    return `${mutableSize.toFixed(suffixIdx === 0 ? 0 : 1)} ${
      suffixes[suffixIdx]
    }`;
  };

  let sourceForm;
  switch (source) {
    case InputSource.TEXT_AREA:
      sourceForm =
        input.length > 1 << 20 ? (
          <TooBigInput data={input} />
        ) : (
          <Form.Group controlId="query-input-textarea">
            <Form.Control
              as="textarea"
              rows={10}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </Form.Group>
        );
      break;
    case InputSource.FILE:
      sourceForm = (
        <Form.Group controlId="query-input-file">
          <Form.Control
            type="file"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const inputNode = e.target;
              if (!inputNode.files || inputNode.files.length === 0) {
                return;
              }
              const file = inputNode.files[0];

              const reader = new FileReader();
              reader.onload = (readerEvent) => {
                const target = readerEvent.target;
                if (!target) {
                  return;
                }
                const result = target.result;
                if (typeof result !== "string") {
                  return;
                }
                setInput(result);
                setProcessing(false);
                console.log(result.length);
              };
              reader.onerror = (readerEvent) => {
                showError(
                  readerEvent.target?.error || new Error("An error occurred")
                );
                setProcessing(false);
              };

              reader.readAsText(file);
              setProcessing(true);
            }}
          ></Form.Control>
        </Form.Group>
      );
      break;
    case InputSource.SERVER:
      sourceForm = (
        <Form.Group controlId="query-input-textarea">
          <URLInput
            url={url}
            setUrl={setUrl}
            username={username}
            setUsername={setUsername}
            password={password}
            setPassword={setPassword}
          />
          <Form.Control
            as="textarea"
            placeholder="Enter a MDX query"
            rows={10}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ marginTop: 10 }}
          />
        </Form.Group>
      );
      break;
  }

  const loadFromServer = source === InputSource.SERVER;
  return (
    <Form className="m-4">
      <SourceInput source={source} setSource={setSource} />
      {sourceForm}
      <TypeInput type={type} setType={setType} />
      {loadFromServer ? null : (
        <p>
          Data size: {input.length} ({prettySize(input.length)})
        </p>
      )}
      <Buttons
        urlMode={loadFromServer}
        onSubmit={dispatchSubmit}
        onDropData={() => setInput("")}
      />
      <DevButtons
        visible={devMode || type === InputType.DEVELOPER}
        input={input}
        setInput={setInput}
      />
      {processing && (
        <div>
          <Spinner animation="border" variant="primary" />
          <span>{statusLine}</span>
        </div>
      )}
    </Form>
  );
}
