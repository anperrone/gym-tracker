import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { createSession } from '../../src/server/auth/session';
import { createDb } from '../../src/server/db/client';
import { users } from '../../src/server/db/schema';
import { requireAdmin, requireAuth } from '../../src/server/middleware/auth';
import type { AppEnv } from '../../src/server/types';

// App di prova: monta requireAuth + requireAdmin su una rotta throwaway.
const testApp = new Hono<AppEnv>()
  .use(requireAuth)
  .use(requireAdmin)
  .get('/admin/ping', (c) => c.json({ ok: true }));

async function seedUser(role: 'user' | 'admin'): Promise<string> {
  const db = createDb(env.DB);
  const userId = crypto.randomUUID();
  await db
    .insert(users)
    .values({ id: userId, googleSub: `s-${userId}`, email: `${userId}@example.com`, role });
  const token = await createSession(db, userId);
  return `session=${token}`;
}

describe('middleware requireAdmin', () => {
  it('blocca gli anonimi (401)', async () => {
    const res = await testApp.request('/admin/ping', {}, env);
    expect(res.status).toBe(401);
  });

  it('blocca gli utenti standard (403)', async () => {
    const cookie = await seedUser('user');
    const res = await testApp.request('/admin/ping', { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(403);
  });

  it('consente gli admin (200)', async () => {
    const cookie = await seedUser('admin');
    const res = await testApp.request('/admin/ping', { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
