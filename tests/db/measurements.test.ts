import { env } from 'cloudflare:test';
import { eq, isNull } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDb } from '../../src/server/db/client';
import {
  measurementEntries,
  measurementTypes,
  measurementValues,
  users,
} from '../../src/server/db/schema';

describe('misure — schema e seed', () => {
  it('le 9 metriche default sono seedate (user_id NULL)', async () => {
    const db = createDb(env.DB);
    const defaults = await db
      .select()
      .from(measurementTypes)
      .where(isNull(measurementTypes.userId));

    expect(defaults.length).toBe(9);
    const weight = defaults.find((t) => t.key === 'weight');
    expect(weight?.label).toBe('Peso');
    expect(weight?.unit).toBe('kg');
  });

  it('crea una misurazione con valori collegati', async () => {
    const db = createDb(env.DB);
    const userId = crypto.randomUUID();
    await db
      .insert(users)
      .values({ id: userId, googleSub: `s-${userId}`, email: `${userId}@example.com` });

    const entryId = crypto.randomUUID();
    await db.insert(measurementEntries).values({ id: entryId, userId, measuredAt: new Date() });
    await db.insert(measurementValues).values([
      { id: crypto.randomUUID(), entryId, typeId: 'mt_weight', value: 66.9 },
      { id: crypto.randomUUID(), entryId, typeId: 'mt_waist', value: 75.5 },
    ]);

    const vals = await db
      .select()
      .from(measurementValues)
      .where(eq(measurementValues.entryId, entryId));
    expect(vals.length).toBe(2);
    expect(vals.map((v) => v.value).sort((a, b) => a - b)).toEqual([66.9, 75.5]);
  });
});
