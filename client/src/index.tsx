// Client entry
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import App from "./app";
import "./index.css";

// file:// protocol (Electron loadFile) doesn't support History API.
// Use HashRouter for file://, BrowserRouter for http:// (dev/prod server).
const isFileProtocol = window.location.protocol === "file:";
const Router = isFileProtocol ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </StrictMode>,
);
