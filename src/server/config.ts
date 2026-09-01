import type { Env } from "./types";

// Nomi cookie
export const SESSION_COOKIE = "session";
export const OAUTH_STATE_COOKIE = "google_oauth";

// TTL (secondi)
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 giorni
export const OAUTH_STATE_TTL_SECONDS = 60 * 10; // 10 minuti

/** Insieme (lowercase) delle email che ricevono il ruolo admin. */
export function adminEmails(env: Env): Set<string> {
  return new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(env: Env, email: string): boolean {
  return adminEmails(env).has(email.toLowerCase());
}
