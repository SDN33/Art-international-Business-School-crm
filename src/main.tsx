import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// When Supabase redirects to the root URL (e.g. http://host/#access_token=...&type=recovery)
// instead of /auth-callback.html, we forward the hash tokens through auth-callback.html so
// the normal recovery flow kicks in.
(function interceptRootAuthTokens() {
  const hash = window.location.hash.substring(1);
  if (!hash || hash.startsWith("/")) return; // normal hash-route, do nothing
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const type = params.get("type");
  if (accessToken && type) {
    // Replace the current entry so the back button doesn't loop
    window.location.replace("./auth-callback.html" + window.location.hash);
  }
})();

// After a new deploy, the service worker may replace its pre-cache while
// the page still holds old chunk references. A reload picks up the new
// HTML + new SW cache. A sessionStorage guard prevents infinite loops.
// See https://vite.dev/guide/build.html#load-error-handling
window.addEventListener("vite:preloadError", () => {
  const key = "chunk-reload";
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, "1");
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
