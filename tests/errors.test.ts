import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../src/server';
import { createSession } from '../src/server/auth/session';
import { createDb } from '../src/server/db/client';
import { users } from '../src/server/db/schema';

async function seedCookie(): Promise<string> {
  const db = createDb(env.DB);
  const userId = crypto.randomUUID();
  await db
    .insert(users)
    .values({ id: userId, googleSub: `s-${userId}`, email: `${userId}@example.com` });
  const token = await createSession(db, userId);
  return `session=${token}`;
}

describe('error handling', () => {
  it('API sconosciuta → 404 JSON', async () => {
    const res = await app.request('/api/non-esiste', {}, env);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ error: 'Not found' });
  });

  it('JSON malformato su una POST → 400, non un crash', async () => {
    const cookie = await seedCookie();
    const res = await app.request(
      '/api/exercises',
      {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: '{ malformed',
      },
      env,
    );
    // Il body invalido è gestito al confine (validazione) → 400, mai un 500 non gestito.
    expect(res.status).toBe(400);
  });
});
