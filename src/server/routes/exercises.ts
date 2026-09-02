import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  createExerciseSchema,
  exerciseFiltersSchema,
  updateExerciseSchema,
} from '../../shared/schemas';
import { createDb } from '../db/client';
import {
  createCustomExercise,
  deleteExercise,
  listExercises,
  updateExercise,
} from '../db/queries/exercises';
import { requireAuth } from '../middleware/auth';
import { rateLimitMutations } from '../middleware/rateLimit';
import type { AppEnv } from '../types';

export const exercises = new Hono<AppEnv>()
  .use(requireAuth)
  .use(rateLimitMutations)
  // Elenco: catalogo globale + custom dell'utente, con filtri opzionali.
  .get('/', zValidator('query', exerciseFiltersSchema), async (c) => {
    const rows = await listExercises(createDb(c.env.DB), c.get('user').id, c.req.valid('query'));
    return c.json(rows);
  })
  // Crea esercizio custom (testo libero).
  .post('/', zValidator('json', createExerciseSchema), async (c) => {
    const result = await createCustomExercise(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.valid('json'),
    );
    if (!result.ok) {
      return c.json({ error: 'Voce canonica non valida' }, 400);
    }
    return c.json(result.exercise, 201);
  })
  // Collega/scollega un custom a una voce canonica.
  .patch('/:id', zValidator('json', updateExerciseSchema), async (c) => {
    const result = await updateExercise(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('id'),
      c.req.valid('json'),
    );
    if (!result.ok) {
      if (result.error === 'not_found') return c.json({ error: 'Non trovato' }, 404);
      return c.json({ error: 'Voce canonica non valida' }, 400);
    }
    return c.json(result.exercise);
  })
  // Elimina un esercizio custom di proprietà.
  .delete('/:id', async (c) => {
    const deleted = await deleteExercise(createDb(c.env.DB), c.get('user').id, c.req.param('id'));
    if (!deleted) {
      return c.json({ error: 'Non trovato' }, 404);
    }
    return c.json({ ok: true });
  });
