import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), cloudflare(), tailwindcss()],
  resolve: {
    alias: {
      "@": new URL("./src/client", import.meta.url).pathname,
      "@shared": new URL("./src/shared", import.meta.url).pathname,
    },
  },
});
