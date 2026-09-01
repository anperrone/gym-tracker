import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaManifest } from './src/client/pwaManifest';

export default defineConfig({
  plugins: [
    react(),
    cloudflare(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registrazione manuale in src/client/pwa.ts
      includeAssets: ['pwa-icon.svg'],
      manifest: pwaManifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // La SPA offline ricade su index.html, ma mai per le rotte server.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
      },
      // Abilita il SW anche in dev (necessario per gli E2E offline sul dev server).
      devOptions: { enabled: true, navigateFallbackAllowlist: [/^\/$/] },
    }),
  ],
  resolve: {
    alias: {
      '@': new URL('./src/client', import.meta.url).pathname,
      '@shared': new URL('./src/shared', import.meta.url).pathname,
    },
  },
});
