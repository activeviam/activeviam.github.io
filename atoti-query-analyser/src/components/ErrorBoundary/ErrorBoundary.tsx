import React, { ReactNode, useLayoutEffect } from "react";
import { asError } from "library/utilities/util";
import { Button } from "react-bootstrap";
import { useErrorMessage } from "hooks/notification";

/**
 * This React component is shown by {@link ErrorBoundary} instead of its children
 * if a rendering error has occurred.
 * */
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // The line above is not an error, we really need "launch once" logic.

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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error?: Error;
}

/**
 * This React component is a wrapper that catches rendering errors. If an error
 * is caught, the subcomponent tree is replaced with an error message.
 * Additionally, if ErrorBoundary is wrapped with a
 * {@link "components/Notification/NotificationWrapper"!NotificationWrapper NotificationWrapper},
 * an error notification will be shown.
 * */
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
    console.error(error, errorInfo);
  }

  render() {
    const { error } = this.state;
    const { children } = this.props;

    if (error) {
      return (
        <Fallback
          error={error}
          resetError={() => this.setState({ error: undefined })}
        />
      );
    }

    return children;
  }
}
