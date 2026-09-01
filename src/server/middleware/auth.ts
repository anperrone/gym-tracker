import { createMiddleware } from 'hono/factory';
import { getSessionToken, setSessionCookie } from '../auth/cookies';
import { validateSession } from '../auth/session';
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

  const result = await validateSession(createDb(c.env.DB), token);
  if (!result) {
    return c.json({ error: 'Non autenticato' }, 401);
  }

  if (result.renewed) {
    setSessionCookie(c, token);
  }
  c.set('user', result.user);
  c.set('session', result.session);
  await next();
});
