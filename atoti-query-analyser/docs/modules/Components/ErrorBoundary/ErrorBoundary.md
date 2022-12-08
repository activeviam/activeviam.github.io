src/Components/ErrorBoundary/ErrorBoundary.tsx
===
This is a helper component used to handle rendering errors.

Tasks:

* If an error occurs while rendering one of the child React components, that component catches it, replaces its content
  with an error message, and sends a message to the notification service.