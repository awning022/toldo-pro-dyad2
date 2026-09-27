import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "./App.css";

const isIA = window.location.pathname === "/ia" || window.location.pathname.indexOf("/ia/") === 0;

if (isIA) {
  const manifest = document.createElement("link");
  manifest.rel = "manifest";
  manifest.href = "/ia/manifest.webmanifest";
  document.head.appendChild(manifest);

  [
    ["name", "mobile-web-app-capable", "yes"],
    ["name", "apple-mobile-web-app-capable", "yes"],
    ["name", "apple-mobile-web-app-status-bar-style", "default"],
    ["name", "apple-mobile-web-app-title", "Toldo Pro IA"]
  ].forEach(function ([attribute, value, content]) {
    const meta = document.createElement("meta");
    meta.setAttribute(attribute, value);
    meta.content = content;
    document.head.appendChild(meta);
  });

  const appleIcon = document.createElement("link");
  appleIcon.rel = "apple-touch-icon";
  appleIcon.href = "/icon-192.png";
  document.head.appendChild(appleIcon);
}

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      registrations.forEach(function (registration) {
        if (registration.scope === window.location.origin + "/") registration.unregister();
      });

      if (isIA) {
        navigator.serviceWorker.register("/ia/sw.js", { scope: "/ia/" }).catch(function () {
          return undefined;
        });
      }
    });
  });
}
