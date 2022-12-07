import React, { useLayoutEffect } from "react";
import { asError } from "../../library/utilities/util";
import { Button } from "react-bootstrap";
import { useErrorMessage } from "../../hooks/notification";

function Fallback({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}) {
  const { showError } = useErrorMessage();
  useLayoutEffect(() => {
    showError(error, true);
  }, []);

  return (
    <div>
      <h1>Oops! Something went wrong</h1>
      <br />
      <h2>
        {error.name}: {error.message}
      </h2>
      <ul>
        {error.stack &&
          error.stack
            .toString()
            .split("\n")
            .map((line) => <li key={line}>{line}</li>)}
      </ul>
      <Button variant="primary" onClick={resetError}>
        Reset
      </Button>
    </div>
  );
}

interface ErrorBoundaryProps {}

interface ErrorBoundaryState {
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {};
  }

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { error: asError(error) };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.log(error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <Fallback
          error={this.state.error}
          resetError={() => this.setState({ error: undefined })}
        />
      );
    }

    return this.props.children;
  }
}
