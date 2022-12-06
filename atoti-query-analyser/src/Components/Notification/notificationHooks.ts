import { useNotificationContext } from "./NotificationWrapper";
import { StackTraceParser } from "../../library/devTools/stackTraceParser";

export function useErrorMessage() {
  const notificationContext = useNotificationContext();

  const asError = (catched: any): Error => {
    if (catched instanceof Error) {
      return catched;
    }
    return new Error(`${catched}`);
  };

  const showErrorMessage = (message: string) => {
    if (!notificationContext) {
      console.log(message);
      return;
    }
    notificationContext.newMessage("An error occurred", message, {
      bg: "warning",
    });
  };

  const showErrorWithoutProcessing = (e: Error) =>
    showErrorMessage(e.stack || e.message);

  const processStackLine = async (stackLine: string): Promise<string> => {
    const match = /^(\s*at.* )(\((\S+)\)|([^(]\S*))$/gm.exec(stackLine);
    if (!match) {
      return stackLine;
    }

    const locationInParentheses = !match[4];
    const location = match[3] || match[4];
    const mappedLocation = await StackTraceParser.getInstance().parse(location);
    return (
      match[1] +
      (locationInParentheses ? `(${mappedLocation})` : mappedLocation)
    );
  };

  const showError = (e: Error, tryUnbundle: boolean = true) => {
    if (!tryUnbundle) {
      return showErrorWithoutProcessing(e);
    }
    if (e.stack === undefined) {
      return showErrorWithoutProcessing(e);
    }
    const stack = e.stack;
    (async () => {
      try {
        const stackLines = stack.split("\n");
        const processedStackLines = await Promise.all(
          stackLines.map(processStackLine)
        );
        showErrorMessage(processedStackLines.join("\n"));
      } catch (processingError) {
        showErrorWithoutProcessing(asError(processingError));
        showErrorWithoutProcessing(e);
      }
    })();
  };

  return { showError, asError };
}
