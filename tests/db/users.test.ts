import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDb } from '../../src/server/db/client';
import { users } from '../../src/server/db/schema';

describe('tabella users', () => {
  it('inserisce e rilegge un utente con i default', async () => {
    const db = createDb(env.DB);
    const id = crypto.randomUUID();

    await db.insert(users).values({
      id,
      googleSub: 'google-sub-123',
      email: 'mario@example.com',
      name: 'Mario',
    });

    const [row] = await db.select().from(users).where(eq(users.id, id));
    expect(row?.email).toBe('mario@example.com');
    expect(row?.role).toBe('user'); // default applicato dal DB
    expect(row?.createdAt).toBeInstanceOf(Date);
  });

  it('applica il vincolo unique su google_sub', async () => {
    const db = createDb(env.DB);
    await db
      .insert(users)
      .values({ id: crypto.randomUUID(), googleSub: 'dup-sub', email: 'a@example.com' });

    await expect(
      db
        .insert(users)
        .values({ id: crypto.randomUUID(), googleSub: 'dup-sub', email: 'b@example.com' }),
    ).rejects.toThrow();
  });
});
