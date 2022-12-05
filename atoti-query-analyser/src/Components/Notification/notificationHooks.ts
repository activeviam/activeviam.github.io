import { useNotificationContext } from "./NotificationWrapper";

export function useErrorMessage() {
  const notificationContext = useNotificationContext();

  const showError = (e: Error) => {
    notificationContext?.newMessage("An error occurred", e.stack || e.message, { bg: "warning" });
  };

  return { showError };
}