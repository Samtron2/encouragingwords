import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme immediately to prevent flash
const savedTheme = localStorage.getItem("ew-theme");
document.documentElement.classList.add(savedTheme === "dark" ? "theme-dark" : "theme-light");

// Guard: unregister SW in preview/iframe contexts
const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
const isPreviewHost = window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
} else if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Visibility change guard — never navigate or redirect on tab resume
document.addEventListener("visibilitychange", () => {
  // Intentionally empty: prevents any framework from triggering
  // auth re-checks or route changes when the tab regains focus.
  // Auth session refresh is handled silently by the Supabase client.
});

createRoot(document.getElementById("root")!).render(<App />);
