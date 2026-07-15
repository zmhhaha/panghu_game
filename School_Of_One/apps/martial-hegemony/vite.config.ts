import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@school-of-one/core": resolve(__dirname, "../../packages/core/src/index.ts"),
      "@school-of-one/ui-core": resolve(__dirname, "../../packages/ui-core/src/index.ts"),
      "@school-of-one/api-client": resolve(__dirname, "../../packages/api-client/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
