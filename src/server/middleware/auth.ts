import { createMiddleware } from 'hono/factory';
import { getSessionToken, setSessionCookie } from '../auth/cookies';
import { invalidateSession, validateSession } from '../auth/session';
import { createDb } from '../db/client';
import type { AppEnv } from '../types';

/**
 * Middleware default-deny: richiede una sessione valida.
 * Popola `c.get("user")` e `c.get("session")`; rinnova il cookie se necessario.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = getSessionToken(c);
  if (!token) {
    return c.json({ error: 'Non autenticato' }, 401);
  }

  const db = createDb(c.env.DB);
  const result = await validateSession(db, token);
  if (!result) {
    return c.json({ error: 'Non autenticato' }, 401);
  }

  // Account disabilitato dall'admin: revoca la sessione e nega l'accesso.
  if (result.user.disabledAt) {
    await invalidateSession(db, token);
    return c.json({ error: 'Account disabilitato' }, 403);
  }

  if (result.renewed) {
    setSessionCookie(c, token);
  }
  c.set('user', result.user);
  c.set('session', result.session);
  await next();
});

/**
 * Middleware role-gated: richiede un utente **admin**. Va usato dopo `requireAuth`,
 * che popola `c.get("user")`. Anonimo → 401 (difensivo); utente standard → 403.
 */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Non autenticato' }, 401);
  }
  if (user.role !== 'admin') {
    return c.json({ error: 'Accesso negato' }, 403);
  }
  await next();
});
