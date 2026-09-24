import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Self-hosted font (vietnamese subset included) - no CDN, no FOUT flash:
// Space Grotesk is the single family for the whole site. Personality
// comes from weight contrast (500 body / 700 display), not from
// mixing faces - the Positivus way.
import "@fontsource-variable/space-grotesk";

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
