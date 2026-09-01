import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  addSessionExerciseSchema,
  createSetSchema,
  startSessionSchema,
  updateSessionSchema,
  updateSetSchema,
} from '../../shared/schemas';
import { createDb } from '../db/client';
import {
  addSessionExercise,
  addSet,
  deleteSession,
  deleteSessionExercise,
  deleteSet,
  getSessionDetail,
  listSessions,
  startSession,
  updateSession,
  updateSet,
} from '../db/queries/workouts';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

const notFound = 'Non trovata';

export const sessions = new Hono<AppEnv>()
  .use(requireAuth)
  // --- Sessione ---
  .get('/', async (c) => {
    const rows = await listSessions(createDb(c.env.DB), c.get('user').id);
    return c.json(rows);
  })
  .post('/', zValidator('json', startSessionSchema), async (c) => {
    const result = await startSession(createDb(c.env.DB), c.get('user').id, c.req.valid('json'));
    // Idempotente: 201 se creata, 200 se già esistente (replay dello stesso clientId).
    return c.json(result.detail, result.created ? 201 : 200);
  })
  .get('/:id', async (c) => {
    const detail = await getSessionDetail(createDb(c.env.DB), c.get('user').id, c.req.param('id'));
    if (!detail) return c.json({ error: notFound }, 404);
    return c.json(detail);
  })
  .patch('/:id', zValidator('json', updateSessionSchema), async (c) => {
    const detail = await updateSession(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('id'),
      c.req.valid('json'),
    );
    if (!detail) return c.json({ error: notFound }, 404);
    return c.json(detail);
  })
  .delete('/:id', async (c) => {
    const deleted = await deleteSession(createDb(c.env.DB), c.get('user').id, c.req.param('id'));
    if (!deleted) return c.json({ error: notFound }, 404);
    return c.json({ ok: true });
  })
  // --- Esercizi della sessione ---
  .post('/:id/exercises', zValidator('json', addSessionExerciseSchema), async (c) => {
    const result = await addSessionExercise(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('id'),
      c.req.valid('json'),
    );
    if (!result.ok) {
      if (result.error === 'invalid_exercise')
        return c.json({ error: 'Esercizio non valido' }, 400);
      return c.json({ error: notFound }, 404);
    }
    return c.json(result.detail, 201);
  })
  .delete('/:id/exercises/:seId', async (c) => {
    const detail = await deleteSessionExercise(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('id'),
      c.req.param('seId'),
    );
    if (!detail) return c.json({ error: notFound }, 404);
    return c.json(detail);
  })
  // --- Serie ---
  .post('/:id/exercises/:seId/sets', zValidator('json', createSetSchema), async (c) => {
    const detail = await addSet(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('id'),
      c.req.param('seId'),
      c.req.valid('json'),
    );
    if (!detail) return c.json({ error: notFound }, 404);
    return c.json(detail, 201);
  })
  .patch('/:id/exercises/:seId/sets/:setId', zValidator('json', updateSetSchema), async (c) => {
    const detail = await updateSet(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('id'),
      c.req.param('seId'),
      c.req.param('setId'),
      c.req.valid('json'),
    );
    if (!detail) return c.json({ error: notFound }, 404);
    return c.json(detail);
  })
  .delete('/:id/exercises/:seId/sets/:setId', async (c) => {
    const detail = await deleteSet(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('id'),
      c.req.param('seId'),
      c.req.param('setId'),
    );
    if (!detail) return c.json({ error: notFound }, 404);
    return c.json(detail);
  });
