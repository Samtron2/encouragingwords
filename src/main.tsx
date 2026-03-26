import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme immediately to prevent flash
const savedTheme = localStorage.getItem("ew-theme");
document.documentElement.classList.add(savedTheme === "dark" ? "theme-dark" : "theme-light");

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failed — app works fine without it
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
