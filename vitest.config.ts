import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const clientAlias = {
  '@': new URL('./src/client', import.meta.url).pathname,
  '@shared': new URL('./src/shared', import.meta.url).pathname,
};

export default defineConfig(async () => {
  // Migrazioni Drizzle applicate al D1 di test (vedi tests/apply-migrations.ts).
  const migrations = await readD1Migrations('./migrations');

  return {
    test: {
      projects: [
        // Server / integrazione: worker reale (workerd) con binding D1.
        {
          plugins: [
            cloudflareTest({
              wrangler: { configPath: './wrangler.jsonc' },
              miniflare: {
                bindings: {
                  TEST_MIGRATIONS: migrations,
                  GOOGLE_CLIENT_ID: 'test-client-id',
                  GOOGLE_CLIENT_SECRET: 'test-client-secret',
                  GOOGLE_REDIRECT_URI: 'http://localhost:5173/auth/google/callback',
                  ADMIN_EMAILS: 'admin@example.com',
                },
              },
            }),
          ],
          test: {
            name: 'server',
            include: ['tests/**/*.test.ts'],
            setupFiles: ['./tests/apply-migrations.ts'],
          },
        },
        // Client / componenti: jsdom + React Testing Library.
        {
          plugins: [react()],
          resolve: { alias: clientAlias },
          test: {
            name: 'client',
            include: ['src/client/**/*.test.{ts,tsx}', 'src/shared/**/*.test.ts'],
            environment: 'jsdom',
            globals: true,
            setupFiles: ['./tests/setup.client.ts'],
          },
        },
      ],
    },
  };
});
