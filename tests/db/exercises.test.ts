import { env } from 'cloudflare:test';
import { eq, isNull } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDb } from '../../src/server/db/client';
import { EQUIPMENT, exercises } from '../../src/server/db/schema';

describe('esercizi — schema e seed', () => {
  it('il catalogo globale (user_id NULL) è seedato', async () => {
    const db = createDb(env.DB);
    const globals = await db.select().from(exercises).where(isNull(exercises.userId));

    expect(globals.length).toBe(60);
    // Tutti globali: non custom e senza canonica.
    expect(globals.every((e) => e.isCustom === false)).toBe(true);
    expect(globals.every((e) => e.canonicalExerciseId === null)).toBe(true);
    // Equipment sempre entro l'enum consentito.
    expect(globals.every((e) => (EQUIPMENT as readonly string[]).includes(e.equipment))).toBe(true);
  });

  it('copre le attrezzature principali del seed', async () => {
    const db = createDb(env.DB);
    const globals = await db.select().from(exercises).where(isNull(exercises.userId));
    const byEquipment = new Map<string, number>();
    for (const e of globals) byEquipment.set(e.equipment, (byEquipment.get(e.equipment) ?? 0) + 1);

    expect(byEquipment.get('machine')).toBe(18);
    expect(byEquipment.get('barbell')).toBe(13);
    expect(byEquipment.get('dumbbell')).toBe(12);
    expect(byEquipment.get('cable')).toBe(7);
    expect(byEquipment.get('bodyweight')).toBe(10);
  });

  it('un esercizio noto ha gruppo muscolare e attrezzatura attesi', async () => {
    const db = createDb(env.DB);
    const [squat] = await db.select().from(exercises).where(eq(exercises.id, 'ex_squat'));
    expect(squat.name).toBe('Squat');
    expect(squat.equipment).toBe('barbell');
    expect(squat.muscleGroup).toBe('Quadricipiti / Glutei');
  });
});
