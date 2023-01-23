import React from "react";
import { createRoot } from "react-dom/client";
import * as serviceWorker from "./serviceWorker";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import { App } from "./App";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  // Reason: application entry point
  // eslint-disable-next-line react/jsx-filename-extension
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
