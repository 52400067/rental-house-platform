import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Self-hosted fonts (vietnamese subsets included) - no CDN, no FOUT flash:
// Bricolage Grotesque = display, Be Vietnam Pro = body, IBM Plex Mono = data.
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";

// Bootstrap first, theme AFTER so brand overrides (btn-primary = teal,
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
