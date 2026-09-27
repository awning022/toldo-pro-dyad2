import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "./App.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {
      return undefined;
    });
  });
}
