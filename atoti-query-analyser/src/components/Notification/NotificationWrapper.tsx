import React, { createContext, useContext, useReducer } from "react";
import ToastContainer from "react-bootstrap/ToastContainer";
import { Toast, ToastProps } from "react-bootstrap";
import { stringifyFuzzyTimer, useFuzzyTimer } from "../../hooks/fuzzyTimer";
import "./NotificationWrapper.css";

/**
 * Internal interface which represents a notification message.
 * */
interface Message {
  /** Timestamp of message creation */
  creationTime: number;
  /** Main text of message */
  body: string;
  /** Message title */
  title: string;
  /** Properties to the Toast wrapper component */
  toastProps: ToastProps;
  /** Message id */
  id: number;
}

/**
 * This interface provides access to the notification service.
 * */
export interface NotificationContext {
  /**
   * Sends new message to the notification service.
   * @param title - message title
   * @param body - message body
   * @param props - optional properties for the Toast wrapper component (see {@link https://react-bootstrap.github.io/components/toasts/#toast-props})
   * */
  newMessage(title: string, body: string, props?: ToastProps): void;
}

const ctx = createContext<NotificationContext | null>(null);

/**
 * This hook provides access to the notification service.
 * */
export function useNotificationContext() {
  return useContext(ctx);
}

/**
 * This class represents state of the notification service.
 * */
class NotificationServiceState {
  constructor(
    private readonly messages: Message[],
    private readonly epoch: number
  ) {}

  /** Returns array of messages. */
  getMessages(): Message[] {
    return this.messages;
  }

  /** Returns an integer that increases after each state modification. */
  getEpoch(): number {
    return this.epoch;
  }

  /** Appends new message and returns new state (the current one remains unmodified). */
  addMessage(message: Message): NotificationServiceState {
    return new NotificationServiceState(
      [...this.messages, message],
      this.epoch + 1
    );
  }

  /** Removes the message with given id and returns new state (the current one remains unmodified). */
  deleteMessage(id: number): NotificationServiceState {
    return new NotificationServiceState(
      this.messages.filter((message) => message.id !== id),
      this.epoch + 1
    );
  }
}

/**
 * Dispatcher type for NotificationServiceState class and useReducer() React hook.
 * */
type NotificationAction =
  | { $action: "addMessage"; params: { message: Message } }
  | { $action: "deleteMessage"; params: { id: number } };

/**
 * Dispatcher function for NotificationServiceState class and useReducer() React hook.
 * */
function reduceNotificationServiceState(
  state: NotificationServiceState,
  action: NotificationAction
): NotificationServiceState {
  switch (action.$action) {
    case "addMessage":
      return state.addMessage(action.params.message);
    case "deleteMessage":
      return state.deleteMessage(action.params.id);
    default:
      throw new Error(`Unexpected action: ${action}`);
  }
}

/**
 * React component for message visualization.
 * */
function MessageToast({
  message,
  onClose,
}: {
  message: Message;
  onClose: () => void;
}) {
  const fuzzyTimer = useFuzzyTimer(message.creationTime);
  return (
    <Toast
      {...{
        ...message.toastProps,
        show: true,
        onClose,
      }}
    >
      <Toast.Header>
        <strong className="me-auto">{message.title}</strong>
        <small>{stringifyFuzzyTimer(fuzzyTimer)}</small>
      </Toast.Header>
      <Toast.Body style={{ overflow: "auto", maxHeight: "400px" }}>
        {message.body
          .split("\n")
          .map((line) => [line, <br key={line} />])
          .flat()}
      </Toast.Body>
    </Toast>
  );
}

/**
 * This React component is a wrapper that provides notifications service to its children.
 */
export function NotificationWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [serviceState, updateServiceState] = useReducer(
    reduceNotificationServiceState,
    new NotificationServiceState([], 0)
  );

  const newMessage = (title: string, body: string, props?: ToastProps) => {
    const message: Message = {
      title,
      body,
      toastProps: props || {},
      id: serviceState.getEpoch(),
      creationTime: Date.now(),
    };

    updateServiceState({ $action: "addMessage", params: { message } });
  };

  const deleteMessage = (id: number) => {
    updateServiceState({ $action: "deleteMessage", params: { id } });
  };

  return (
    <ctx.Provider value={{ newMessage }}>
      {children}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <ToastContainer position="bottom-end" className="p-3">
          {serviceState.getMessages().map((message) => (
            <MessageToast
              message={message}
              key={message.id}
              onClose={() => deleteMessage(message.id)}
            />
          ))}
        </ToastContainer>
      </div>
    </ctx.Provider>
  );
}
