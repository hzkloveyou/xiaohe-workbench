import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RoutedApp } from "./app/RoutedApp";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/tokens.css";
import "./styles/global.css";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary><RoutedApp /></ErrorBoundary>
  </StrictMode>
);
