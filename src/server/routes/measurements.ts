import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { createMeasurementSchema } from '../../shared/schemas';
import { createDb } from '../db/client';
import {
  createMeasurement,
  deleteMeasurement,
  getMeasurementSeries,
  listMeasurements,
  listMeasurementTypes,
} from '../db/queries/measurements';
import { requireAuth } from '../middleware/auth';
import { rateLimitMutations } from '../middleware/rateLimit';
import type { AppEnv } from '../types';

export const measurements = new Hono<AppEnv>()
  .use(requireAuth)
  .use(rateLimitMutations)
  // Tipi di metrica (default + custom dell'utente)
  .get('/types', async (c) => {
    const types = await listMeasurementTypes(createDb(c.env.DB), c.get('user').id);
    return c.json(types);
  })
  // Storico misurazioni
  .get('/', async (c) => {
    const entries = await listMeasurements(createDb(c.env.DB), c.get('user').id);
    return c.json(entries);
  })
  // Crea misurazione
  .post('/', zValidator('json', createMeasurementSchema), async (c) => {
    const result = await createMeasurement(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.valid('json'),
    );
    if (!result.ok) {
      return c.json({ error: 'Tipo di metrica non valido' }, 400);
    }
    return c.json({ id: result.id }, 201);
  })
  // Serie temporale di una metrica (per i grafici)
  .get('/series/:typeId', async (c) => {
    const series = await getMeasurementSeries(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('typeId'),
    );
    return c.json(series);
  })
  // Elimina misurazione
  .delete('/:id', async (c) => {
    const deleted = await deleteMeasurement(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('id'),
    );
    if (!deleted) {
      return c.json({ error: 'Non trovata' }, 404);
    }
    return c.json({ ok: true });
  });
