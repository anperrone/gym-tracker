import { applyD1Migrations, env } from "cloudflare:test";

// Applica le migrazioni Drizzle al D1 di test prima di ogni file di test.
// `TEST_MIGRATIONS` è fornito da vitest.config.ts (readD1Migrations).
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
