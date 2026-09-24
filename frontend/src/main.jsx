import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Self-hosted fonts (vietnamese subsets included) - no CDN, no FOUT flash:
// Archivo = headlines & UI chrome (sans, Styrene-like), Literata = long-form
// prose AND large editorial headings (serif, Copernicus-like) - the
// Anthropic-style serif/sans split.
import "@fontsource-variable/archivo";
import "@fontsource-variable/literata";

// Bootstrap first, theme AFTER so brand overrides (btn-primary = rust,
// form-focus rings, etc.) win the cascade instead of being reversed by
// Bootstrap's own CSS-variable defaults.
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/theme.css";
// Bootstrap JS: needed for dropdowns (user menu / logout) and the
// navbar collapse toggler, which use data-bs-toggle attributes.
import "bootstrap/dist/js/bootstrap.bundle.min.js";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
