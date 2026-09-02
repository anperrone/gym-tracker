import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { createGlobalExerciseSchema, updateGlobalExerciseSchema } from '../../shared/schemas';
import { createDb } from '../db/client';
import {
  createGlobalExercise,
  deleteGlobalExercise,
  listGlobalExercises,
  updateGlobalExercise,
} from '../db/queries/admin';
import { requireAdmin, requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

// Pannello tecnico: tutte le rotte sono role-gated (requireAuth → requireAdmin).
// Nessun accesso ai dati personali (misure/allenamenti): qui si gestisce solo
// il catalogo globale e (T8.3) utenti/ruoli.
export const admin = new Hono<AppEnv>()
  .use(requireAuth)
  .use(requireAdmin)
  // Catalogo globale: elenco.
  .get('/exercises', async (c) => {
    const rows = await listGlobalExercises(createDb(c.env.DB));
    return c.json(rows);
  })
  // Catalogo globale: crea.
  .post('/exercises', zValidator('json', createGlobalExerciseSchema), async (c) => {
    const created = await createGlobalExercise(createDb(c.env.DB), c.req.valid('json'));
    return c.json(created, 201);
  })
  // Catalogo globale: modifica (solo voci globali).
  .patch('/exercises/:id', zValidator('json', updateGlobalExerciseSchema), async (c) => {
    const result = await updateGlobalExercise(
      createDb(c.env.DB),
      c.req.param('id'),
      c.req.valid('json'),
    );
    if (!result.ok) return c.json({ error: 'Non trovato' }, 404);
    return c.json(result.exercise);
  })
  // Catalogo globale: elimina (solo voci globali).
  .delete('/exercises/:id', async (c) => {
    const deleted = await deleteGlobalExercise(createDb(c.env.DB), c.req.param('id'));
    if (!deleted) return c.json({ error: 'Non trovato' }, 404);
    return c.json({ ok: true });
  });
