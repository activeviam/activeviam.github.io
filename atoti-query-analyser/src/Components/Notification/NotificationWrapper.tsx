import React, { createContext, useContext, useReducer } from "react";
import ToastContainer from "react-bootstrap/ToastContainer";
import { Toast, ToastProps } from "react-bootstrap";
import { stringifyFuzzyTimer, useFuzzyTimer } from "../../hooks/fuzzyTimer";
import "./NotificationWrapper.css";

interface Message {
  creationTime: number;
  body: string;
  title: string;
  toastProps?: ToastProps;
  id: number;
}

export interface NotificationContext {
  /** Send new message to the notification service. */
  newMessage(title: string, body: string, props?: ToastProps): void;
}

const ctx = createContext<NotificationContext | null>(null);

/**
 * This hook provides access to the notification service.
 * */
export function useNotificationContext() {
  return useContext(ctx);
}

class NotificationManager {
  constructor(private readonly messages: Message[]) {}

  getMessages(): Message[] {
    return this.messages;
  }

  addMessage(message: Message): NotificationManager {
    return new NotificationManager([message, ...this.messages]);
  }

  deleteMessage(id: number): NotificationManager {
    return new NotificationManager(
      this.messages.filter((message) => message.id !== id)
    );
  }
}

type NotificationAction =
  | { $action: "addMessage"; params: { message: Message } }
  | { $action: "deleteMessage"; params: { id: number } };

function reduceNotificationManager(
  mgr: NotificationManager,
  action: NotificationAction
): NotificationManager {
  switch (action.$action) {
    case "addMessage":
      return mgr.addMessage(action.params.message);
    case "deleteMessage":
      return mgr.deleteMessage(action.params.id);
    default:
      throw new Error(`Unexpected action: ${action}`);
  }
}

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

let messageCount = 0;

/**
 * This React component is a wrapper that provides notifications service.
 */
export function NotificationWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mgr, updateMgr] = useReducer(
    reduceNotificationManager,
    new NotificationManager([])
  );

  const newMessage = (title: string, body: string, props?: ToastProps) => {
    const message: Message = {
      title,
      body,
      toastProps: props || {},
      id: ++messageCount,
      creationTime: Date.now(),
    };

    updateMgr({ $action: "addMessage", params: { message } });
  };

  const deleteMessage = (id: number) => {
    updateMgr({ $action: "deleteMessage", params: { id } });
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
          {mgr.getMessages().map((message) => (
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
