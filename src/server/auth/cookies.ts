import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_SECONDS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from '../config';

// In dev (http://localhost) i cookie Secure non verrebbero inviati: attiviamo
// Secure solo su https. SameSite=Lax consente l'invio nel redirect da Google.
function isHttps(c: Context): boolean {
  return new URL(c.req.url).protocol === 'https:';
}

export function setSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isHttps(c),
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export function getSessionToken(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

export interface OAuthState {
  state: string;
  codeVerifier: string;
}

export function setOAuthCookie(c: Context, value: OAuthState): void {
  setCookie(c, OAUTH_STATE_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    secure: isHttps(c),
    sameSite: 'Lax',
    path: '/',
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });
}

export function getOAuthCookie(c: Context): OAuthState | null {
  const raw = getCookie(c, OAUTH_STATE_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OAuthState;
    if (typeof parsed.state === 'string' && typeof parsed.codeVerifier === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearOAuthCookie(c: Context): void {
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/' });
}
