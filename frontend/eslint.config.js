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
            // Compiler-style rules (set-state-in-effect, purity, refs) are
            // legit signals but their fixes belong to the planned component
            // splits (PLAN.md Phase 2) - demoted to warnings until then so
            // real errors stay visible.
            "react-hooks/set-state-in-effect": "warn",
            "react-hooks/purity": "warn",
            "react-hooks/refs": "warn",
            "react-refresh/only-export-components": "warn",
            "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "no-console": "warn",
            "prefer-const": "error",
            eqeqeq: ["error", "smart"],
        },
    },
];
