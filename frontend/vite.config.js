import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// JSX dùng automatic runtime (jsxImportSource: react) - không cần `import React`
// ở từng file. Cần restart dev server sau khi đổi file này.
export default defineConfig({
    plugins: [react()],
});
