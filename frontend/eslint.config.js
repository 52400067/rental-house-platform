import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import prettier from "eslint-config-prettier";

// Flat config (ESLint 9). Prettier config comes last so it disables
// stylistic core rules that would fight the formatter.
export default [
    { ignores: ["dist", "node_modules", "test-results", "playwright-report", ".browser-check"] },
    {
        // Node context for tooling configs (process.env in playwright.config.js).
        files: ["*.config.js", "e2e/**"],
        languageOptions: { globals: { ...globals.node } },
    },
    {
        files: ["**/*.{js,jsx}"],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.browser,
            parserOptions: {
                ecmaVersion: 2022,
                ecmaFeatures: { jsx: true },
                sourceType: "module",
            },
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...prettier.rules,
            ...reactHooks.configs.recommended.rules,
            // Compiler-style signals. set-state-in-effect is blocking:
            // all call sites now reset via the render-phase prev-comparison
            // idiom or move the reset into the fetch handler. purity/refs
            // stay as warnings until audited.
            "react-hooks/set-state-in-effect": "error",
            "react-hooks/purity": "warn",
            "react-hooks/refs": "warn",
            "react-refresh/only-export-components": [
                "warn",
                {
                    // Standard context/singleton pattern: Provider is a
                    // component, the paired hook is a function export.
                    allowExportNames: ["useToast", "useAuth"],
                },
            ],
            "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "no-console": "warn",
            "prefer-const": "error",
            eqeqeq: ["error", "smart"],
        },
    },
];
