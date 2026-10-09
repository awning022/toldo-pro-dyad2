import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "./App.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      registrations.forEach(function (registration) {
        if (
          registration.scope === window.location.origin + "/" ||
          registration.scope === window.location.origin + "/ia/"
        ) {
          registration.unregister();
        }
      });
    });
  });
}
