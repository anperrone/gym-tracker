import { getTableColumns } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { Db } from './client';

/** Limite di D1 sui parametri bindati per singola query. */
export const D1_MAX_BOUND_PARAMS = 100;

/**
 * INSERT multi-riga spezzate per restare sotto il limite parametri di D1, da eseguire
 * dentro un `db.batch` (atomico). Stima per eccesso: un parametro per ogni colonna della
 * tabella, anche quelle omesse (Drizzle binda i default JS).
 */
export function chunkedInserts<T extends SQLiteTable>(
  db: Db,
  table: T,
  rows: T['$inferInsert'][],
): BatchItem<'sqlite'>[] {
  const rowsPerInsert = Math.floor(
    D1_MAX_BOUND_PARAMS / Object.keys(getTableColumns(table)).length,
  );
  const inserts: BatchItem<'sqlite'>[] = [];
  for (let i = 0; i < rows.length; i += rowsPerInsert) {
    inserts.push(db.insert(table).values(rows.slice(i, i + rowsPerInsert)));
  }
  return inserts;
}
