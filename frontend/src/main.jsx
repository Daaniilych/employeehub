import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Load theme from localStorage and apply it before rendering
const loadTheme = () => {
  const savedTheme = localStorage.getItem("preferences_theme") || "light";
  if (savedTheme === "dark" || savedTheme === "high-contrast") {
    document.documentElement.setAttribute("data-theme", savedTheme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
};

// Apply theme immediately before React renders
loadTheme();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);








