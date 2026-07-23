// Standard Vite config — replaces 妙搭's @lark-apaas/coding-vite-preset
import path from "path";
import fs from "fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: path.resolve(__dirname, "client"),
  base: "./",  // relative paths for Capacitor/Electron (file:// loading)
  plugins: [
    react(),
    tailwindcss(),
    // Remove crossorigin attribute from built HTML — Electron file:// loading
    // rejects crossorigin on module scripts, causing blank page
    {
      name: "remove-crossorigin",
      closeBundle() {
        const htmlPath = path.resolve(__dirname, "dist/client/index.html");
        if (!fs.existsSync(htmlPath)) return;
        let html = fs.readFileSync(htmlPath, "utf-8");
        html = html.replace(/ crossorigin/g, "");
        fs.writeFileSync(htmlPath, html);
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0", // allow LAN access from phone
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/client"),
    emptyOutDir: true,
  },
});
