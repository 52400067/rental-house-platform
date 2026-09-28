import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import prettier from "eslint-config-prettier";

// Flat config (ESLint 9). Prettier config comes last so it disables
// stylistic core rules that would fight the formatter.
export default tseslint.config(
    { ignores: ["dist", "node_modules", "test-results", "playwright-report", ".browser-check"] },
    {
        // Node context for tooling configs (process.env in playwright.config.js).
        files: ["*.config.js", "e2e/**"],
        languageOptions: { globals: { ...globals.node } },
    },
    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.browser,
        },
        plugins: {
            "@typescript-eslint": tseslint.plugin,
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...prettier.rules,
            ...reactHooks.configs.recommended.rules,
            // Compiler-style signals, all blocking: render stays pure and
            // refs stay out of render. set-state-in-effect call sites now
            // reset via the render-phase prev-comparison idiom or move the
            // reset into the fetch handler.
            "react-hooks/set-state-in-effect": "error",
            "react-hooks/purity": "error",
            "react-hooks/refs": "error",
            "react-refresh/only-export-components": [
                "warn",
                {
                    // Standard context/singleton pattern: Provider is a
                    // component, the paired hook is a function export.
                    allowExportNames: ["useToast", "useAuth"],
                },
            ],
            "no-unused-vars": "off",
            // TS compiler bat noUnusedLocals/Parameters - eslint chi de
            // convention args bat dau bang _ la duoc.
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "no-console": "warn",
            "prefer-const": "error",
            eqeqeq: ["error", "smart"],
        },
    },
    // Type-checked rules cho TS: bat ky gia tri any ro rang (explicit any)
    // trong code app - implicit any da bi compiler chan.
    ...tseslint.configs.recommended.map((c) => ({
        ...c,
        files: ["src/**/*.{ts,tsx}"],
        rules: {
            ...c.rules,
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
        },
    }))
);
