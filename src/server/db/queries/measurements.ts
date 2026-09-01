import { and, asc, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import type {
  CreateMeasurementInput,
  MeasurementEntryDto,
  MeasurementTypeDto,
} from '../../../shared/schemas';
import type { Db } from '../client';
import { measurementEntries, measurementTypes, measurementValues } from '../schema';

/** Tipi metrica visibili all'utente: default di sistema (user_id NULL) + suoi custom. */
export async function listMeasurementTypes(db: Db, userId: string): Promise<MeasurementTypeDto[]> {
  const rows = await db
    .select()
    .from(measurementTypes)
    .where(or(isNull(measurementTypes.userId), eq(measurementTypes.userId, userId)))
    .orderBy(asc(measurementTypes.sortOrder), asc(measurementTypes.label));

  return rows.map((t) => ({
    id: t.id,
    key: t.key,
    label: t.label,
    unit: t.unit,
    precision: t.precision,
    sortOrder: t.sortOrder,
    isCustom: t.userId !== null,
  }));
}

/** Insieme degli id-tipo utilizzabili dall'utente (per validare gli input). */
async function allowedTypeIds(db: Db, userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ id: measurementTypes.id })
    .from(measurementTypes)
    .where(or(isNull(measurementTypes.userId), eq(measurementTypes.userId, userId)));
  return new Set(rows.map((r) => r.id));
}

/** Storico misurazioni dell'utente (più recenti prima), con i valori. */
export async function listMeasurements(db: Db, userId: string): Promise<MeasurementEntryDto[]> {
  const entries = await db
    .select()
    .from(measurementEntries)
    .where(eq(measurementEntries.userId, userId))
    .orderBy(desc(measurementEntries.measuredAt));

  if (entries.length === 0) return [];

  const values = await db
    .select()
    .from(measurementValues)
    .where(
      inArray(
        measurementValues.entryId,
        entries.map((e) => e.id),
      ),
    );

  const byEntry = new Map<string, { typeId: string; value: number }[]>();
  for (const v of values) {
    const arr = byEntry.get(v.entryId) ?? [];
    arr.push({ typeId: v.typeId, value: v.value });
    byEntry.set(v.entryId, arr);
  }

  return entries.map((e) => ({
    id: e.id,
    measuredAt: e.measuredAt.toISOString(),
    notes: e.notes,
    values: byEntry.get(e.id) ?? [],
  }));
}

export type CreateMeasurementResult =
  | { ok: true; id: string }
  | { ok: false; error: 'invalid_type' };

/** Crea una misurazione con i suoi valori. Rifiuta typeId non ammessi per l'utente. */
export async function createMeasurement(
  db: Db,
  userId: string,
  input: CreateMeasurementInput,
): Promise<CreateMeasurementResult> {
  const allowed = await allowedTypeIds(db, userId);
  if (!input.values.every((v) => allowed.has(v.typeId))) {
    return { ok: false, error: 'invalid_type' };
  }

  const entryId = crypto.randomUUID();
  // Batch transazionale su D1: entry + valori atomici (niente entry orfana).
  await db.batch([
    db.insert(measurementEntries).values({
      id: entryId,
      userId,
      measuredAt: new Date(input.measuredAt),
      notes: input.notes ?? null,
      clientId: input.clientId ?? null,
    }),
    db.insert(measurementValues).values(
      input.values.map((v) => ({
        id: crypto.randomUUID(),
        entryId,
        typeId: v.typeId,
        value: v.value,
      })),
    ),
  ]);

  return { ok: true, id: entryId };
}

/** Elimina una misurazione dell'utente. Ritorna false se inesistente/non di proprietà. */
export async function deleteMeasurement(db: Db, userId: string, entryId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: measurementEntries.id })
    .from(measurementEntries)
    .where(and(eq(measurementEntries.id, entryId), eq(measurementEntries.userId, userId)));
  if (!existing) return false;

  await db.delete(measurementEntries).where(eq(measurementEntries.id, entryId));
  return true;
}

/** Serie temporale (crescente) di una metrica per l'utente. */
export async function getMeasurementSeries(db: Db, userId: string, typeId: string) {
  const rows = await db
    .select({ date: measurementEntries.measuredAt, value: measurementValues.value })
    .from(measurementValues)
    .innerJoin(measurementEntries, eq(measurementValues.entryId, measurementEntries.id))
    .where(and(eq(measurementEntries.userId, userId), eq(measurementValues.typeId, typeId)))
    .orderBy(asc(measurementEntries.measuredAt));

  return rows.map((r) => ({ date: r.date.toISOString(), value: r.value }));
}
