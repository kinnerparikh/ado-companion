import React from "react";
import ReactDOM from "react-dom/client";
import "./mocks/chrome-api";
import DevShell from "./DevShell";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DevShell />
  </React.StrictMode>
);
