import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Theme first so CSS variables override Bootstrap defaults.
import "./styles/theme.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
