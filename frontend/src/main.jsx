import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Theme first so CSS variables override Bootstrap defaults.
import "./styles/theme.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
// Bootstrap JS: needed for dropdowns (user menu / logout) and the
// navbar collapse toggler, which use data-bs-toggle attributes.
import "bootstrap/dist/js/bootstrap.bundle.min.js";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
