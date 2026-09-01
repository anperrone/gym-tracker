import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const clientAlias = {
  "@": new URL("./src/client", import.meta.url).pathname,
  "@shared": new URL("./src/shared", import.meta.url).pathname,
};

export default defineConfig({
  test: {
    projects: [
      // Server / integrazione: worker reale (workerd) con binding D1.
      {
        plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
        test: {
          name: "server",
          include: ["tests/**/*.test.ts"],
        },
      },
      // Client / componenti: jsdom + React Testing Library.
      {
        plugins: [react()],
        resolve: { alias: clientAlias },
        test: {
          name: "client",
          include: ["src/client/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          globals: true,
          setupFiles: ["./tests/setup.client.ts"],
        },
      },
    ],
  },
});
