import type { ManifestOptions } from 'vite-plugin-pwa';

/** Manifest PWA (condiviso tra `vite.config.ts` e i test). */
export const pwaManifest: Partial<ManifestOptions> = {
  name: 'Gym Tracker',
  short_name: 'Gym Tracker',
  description: 'Traccia misure, schede e allenamenti — anche offline',
  theme_color: '#4f46e5',
  background_color: '#0b0b10',
  display: 'standalone',
  start_url: '/',
  icons: [
    {
      src: 'pwa-icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    },
  ],
};
