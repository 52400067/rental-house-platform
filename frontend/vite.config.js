import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// JSX dùng automatic runtime (jsxImportSource: react) - không cần `import React`
// ở từng file. Cần restart dev server sau khi đổi file này.
export default defineConfig({
    plugins: [react()],
    // Deps cache nam ngoai node_modules: thu muc .vite trong sandbox co
    // file do root so huu khong the ghi/xoa -> Vite tra 404 cho moi route.
    cacheDir: "/tmp/trosv-vite-cache",
    build: {
        target: "es2020",
        cssMinify: true,
        // Keep the first paint fast: vendor libs get their own cached chunk.
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules")) {
                        if (id.includes("leaflet") || id.includes("@map")) {
                            return "leaflet";
                        }
                        return "vendor";
                    }
                },
            },
        },
    },
    esbuild: {
        // Legal-safe: keep THIRD-PARTY license comments (/*! */) in bundles,
        // drop everything else.
        legalComments: "inline",
    },
    minify: "terser",
    terserOptions: {
        compress: {
            passes: 2,
            drop_console: ["log", "debug", "info"],
            drop_debugger: true,
        },
        format: {
            // "some" (default) preserves /*! ... */ license comments
            // (fonts/libs) while stripping everything else.
            comments: "some",
        },
    },
});
