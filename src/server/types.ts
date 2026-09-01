import type { Session, User } from "./db/schema";

/**
 * Binding e variabili d'ambiente del Worker.
 * I secret (GOOGLE_*, ADMIN_EMAILS) arrivano da `.dev.vars` in locale
 * e da Wrangler secrets / vars in produzione.
 */
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  ADMIN_EMAILS: string;
}

/** Variabili impostate a runtime (es. dal middleware di auth). */
export interface Variables {
  user: User;
  session: Session;
}

export type AppEnv = { Bindings: Env; Variables: Variables };
