import { Hono } from 'hono';
import { createDb } from '../db/client';
import { getExerciseProgress, listProgressExercises } from '../db/queries/progress';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

export const progress = new Hono<AppEnv>()
  .use(requireAuth)
  // Esercizi con dati loggati (per il selettore dei progressi).
  .get('/exercises', async (c) => {
    const rows = await listProgressExercises(createDb(c.env.DB), c.get('user').id);
    return c.json(rows);
  })
  // Serie temporale di progressione di un esercizio.
  .get('/exercises/:id', async (c) => {
    const rows = await getExerciseProgress(createDb(c.env.DB), c.get('user').id, c.req.param('id'));
    return c.json(rows);
  });
