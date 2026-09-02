import { Hono } from 'hono';
import {
  clearOAuthCookie,
  clearSessionCookie,
  getOAuthCookie,
  getSessionToken,
  setOAuthCookie,
  setSessionCookie,
} from '../auth/cookies';
import {
  buildAuthorizationUrl,
  exchangeCodeForUser,
  type GoogleOAuthConfig,
  generateCodeVerifier,
  generateState,
} from '../auth/oauth';
import { createSession, invalidateSession } from '../auth/session';
import { isAdminEmail } from '../config';
import { createDb } from '../db/client';
import { upsertUserFromGoogle } from '../db/queries/users';
import type { AppEnv, Env } from '../types';

function oauthConfig(env: Env): GoogleOAuthConfig {
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  };
}

export const auth = new Hono<AppEnv>()
  // Avvio login: genera state + PKCE, li salva in cookie, redirige a Google.
  .get('/google/login', async (c) => {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    setOAuthCookie(c, { state, codeVerifier });
    const url = await buildAuthorizationUrl(oauthConfig(c.env), state, codeVerifier);
    return c.redirect(url);
  })
  // Callback: valida state, scambia il code, upsert utente, crea sessione.
  .get('/google/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const stored = getOAuthCookie(c);
    clearOAuthCookie(c);

    if (!code || !state || !stored || stored.state !== state) {
      return c.json({ error: 'Stato OAuth non valido' }, 400);
    }

    let googleUser: Awaited<ReturnType<typeof exchangeCodeForUser>>;
    try {
      googleUser = await exchangeCodeForUser(oauthConfig(c.env), code, stored.codeVerifier);
    } catch {
      return c.json({ error: 'Autenticazione fallita' }, 401);
    }

    if (!googleUser.emailVerified) {
      return c.json({ error: 'Email Google non verificata' }, 403);
    }

    const db = createDb(c.env.DB);
    const user = await upsertUserFromGoogle(db, googleUser, isAdminEmail(c.env, googleUser.email));
    const token = await createSession(db, user.id);
    setSessionCookie(c, token);
    return c.redirect('/');
  })
  // Logout: revoca la sessione e pulisce il cookie.
  .post('/logout', async (c) => {
    const token = getSessionToken(c);
    if (token) {
      await invalidateSession(createDb(c.env.DB), token);
    }
    clearSessionCookie(c);
    return c.json({ ok: true });
  });

// Seam di test SOLO in dev (per gli E2E): crea una sessione senza passare da Google.
// In build di produzione `import.meta.env.DEV` è false → la rotta non viene montata.
if (import.meta.env.DEV) {
  auth.post('/test-login', async (c) => {
    const email = c.req.query('email') ?? 'e2e@example.com';
    // `admin=1` forza il ruolo admin (E2E deterministici, indipendenti da ADMIN_EMAILS).
    const forceAdmin = c.req.query('admin') === '1';
    const db = createDb(c.env.DB);
    const user = await upsertUserFromGoogle(
      db,
      { sub: `e2e-${email}`, email, emailVerified: true, name: 'E2E', picture: null },
      forceAdmin || isAdminEmail(c.env, email),
    );
    const token = await createSession(db, user.id);
    setSessionCookie(c, token);
    return c.json({ ok: true });
  });
}
