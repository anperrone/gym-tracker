import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  createGlobalExerciseSchema,
  updateGlobalExerciseSchema,
  updateUserRoleSchema,
} from '../../shared/schemas';
import { createDb } from '../db/client';
import {
  createGlobalExercise,
  deleteGlobalExercise,
  listGlobalExercises,
  listUsers,
  updateGlobalExercise,
  updateUserRole,
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
  // Catalogo globale: elimina (solo voci globali, se non usato in nessuna scheda).
  .delete('/exercises/:id', async (c) => {
    const result = await deleteGlobalExercise(createDb(c.env.DB), c.req.param('id'));
    if (!result.ok) {
      if (result.error === 'in_use') {
        return c.json(
          { error: 'Esercizio in uso in una o più schede', planCount: result.planCount },
          409,
        );
      }
      return c.json({ error: 'Non trovato' }, 404);
    }
    return c.json({ ok: true });
  })
  // Utenti: elenco (senza dati personali).
  .get('/users', async (c) => {
    const rows = await listUsers(createDb(c.env.DB));
    return c.json(rows);
  })
  // Utenti: cambia ruolo (non il proprio → evita self-lockout).
  .patch('/users/:id', zValidator('json', updateUserRoleSchema), async (c) => {
    const result = await updateUserRole(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('id'),
      c.req.valid('json'),
    );
    if (!result.ok) {
      if (result.error === 'self_forbidden') {
        return c.json({ error: 'Non puoi cambiare il tuo ruolo' }, 409);
      }
      return c.json({ error: 'Non trovato' }, 404);
    }
    return c.json(result.user);
  });
