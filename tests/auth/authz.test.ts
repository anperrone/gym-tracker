import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/server';

/** Mocka le due chiamate outbound a Google (token + userinfo). */
function mockGoogle(user: { sub: string; email: string }): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('https://oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'test-access-token' }), {
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.startsWith('https://openidconnect.googleapis.com/v1/userinfo')) {
        return new Response(
          JSON.stringify({ sub: user.sub, email: user.email, email_verified: true, name: 'Test' }),
          { headers: { 'content-type': 'application/json' } },
        );
      }
      throw new Error(`fetch non mockato: ${url}`);
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

/** Estrae il valore (grezzo, ancora url-encoded) di un cookie da Set-Cookie. */
function getSetCookie(res: Response, name: string): string | null {
  for (const raw of res.headers.getSetCookie()) {
    const pair = raw.split(';')[0];
    const idx = pair.indexOf('=');
    if (pair.slice(0, idx) === name) return pair.slice(idx + 1);
  }
  return null;
}

/** Esegue login + callback con Google mockato, ritorna il cookie di sessione. */
async function loginAs(email: string, sub = `g-${email}`): Promise<string> {
  const loginRes = await app.request('/auth/google/login', {}, env);
  expect(loginRes.status).toBe(302);
  const location = loginRes.headers.get('location') ?? '';
  const state = new URL(location).searchParams.get('state');
  const oauthCookie = getSetCookie(loginRes, 'google_oauth');
  expect(state).toBeTruthy();
  expect(oauthCookie).toBeTruthy();

  mockGoogle({ sub, email });

  const cbRes = await app.request(
    `/auth/google/callback?code=fake-code&state=${state}`,
    { headers: { Cookie: `google_oauth=${oauthCookie}` } },
    env,
  );
  expect(cbRes.status).toBe(302);
  const session = getSetCookie(cbRes, 'session');
  expect(session).toBeTruthy();
  return session as string;
}

describe('autorizzazione e flusso auth', () => {
  it('GET /api/me senza cookie → 401', async () => {
    const res = await app.request('/api/me', {}, env);
    expect(res.status).toBe(401);
  });

  it('login → crea utente standard e /api/me lo restituisce', async () => {
    const session = await loginAs('mario@example.com');
    const res = await app.request('/api/me', { headers: { Cookie: `session=${session}` } }, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { email: string; role: string };
    expect(body.email).toBe('mario@example.com');
    expect(body.role).toBe('user');
  });

  it('email in allowlist → ruolo admin', async () => {
    const session = await loginAs('admin@example.com');
    const res = await app.request('/api/me', { headers: { Cookie: `session=${session}` } }, env);
    const body = (await res.json()) as { role: string };
    expect(body.role).toBe('admin');
  });

  it('logout invalida la sessione', async () => {
    const session = await loginAs('luigi@example.com');
    const logoutRes = await app.request(
      '/auth/logout',
      { method: 'POST', headers: { Cookie: `session=${session}` } },
      env,
    );
    expect(logoutRes.status).toBe(200);

    const meRes = await app.request('/api/me', { headers: { Cookie: `session=${session}` } }, env);
    expect(meRes.status).toBe(401);
  });

  it('callback con state non combaciante → 400', async () => {
    const loginRes = await app.request('/auth/google/login', {}, env);
    const oauthCookie = getSetCookie(loginRes, 'google_oauth');
    const res = await app.request(
      '/auth/google/callback?code=x&state=state-sbagliato',
      { headers: { Cookie: `google_oauth=${oauthCookie}` } },
      env,
    );
    expect(res.status).toBe(400);
  });
});
