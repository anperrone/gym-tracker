import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  createPlanDaySchema,
  createPlanExerciseSchema,
  createPlanSchema,
  updatePlanExerciseSchema,
  updatePlanSchema,
} from '../../shared/schemas';
import { createDb } from '../db/client';
import {
  addPlanDay,
  addPlanExercise,
  createPlan,
  deletePlan,
  deletePlanDay,
  deletePlanExercise,
  getPlanDetail,
  listPlans,
  updatePlan,
  updatePlanExercise,
} from '../db/queries/plans';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

const notFound = 'Non trovata';

export const plans = new Hono<AppEnv>()
  .use(requireAuth)
  // --- Scheda ---
  .get('/', async (c) => {
    const rows = await listPlans(createDb(c.env.DB), c.get('user').id);
    return c.json(rows);
  })
  .post('/', zValidator('json', createPlanSchema), async (c) => {
    const plan = await createPlan(createDb(c.env.DB), c.get('user').id, c.req.valid('json'));
    return c.json(plan, 201);
  })
  .get('/:id', async (c) => {
    const detail = await getPlanDetail(createDb(c.env.DB), c.get('user').id, c.req.param('id'));
    if (!detail) return c.json({ error: notFound }, 404);
    return c.json(detail);
  })
  .patch('/:id', zValidator('json', updatePlanSchema), async (c) => {
    const plan = await updatePlan(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('id'),
      c.req.valid('json'),
    );
    if (!plan) return c.json({ error: notFound }, 404);
    return c.json(plan);
  })
  .delete('/:id', async (c) => {
    const deleted = await deletePlan(createDb(c.env.DB), c.get('user').id, c.req.param('id'));
    if (!deleted) return c.json({ error: notFound }, 404);
    return c.json({ ok: true });
  })
  // --- Giorni ---
  .post('/:id/days', zValidator('json', createPlanDaySchema), async (c) => {
    const detail = await addPlanDay(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('id'),
      c.req.valid('json'),
    );
    if (!detail) return c.json({ error: notFound }, 404);
    return c.json(detail, 201);
  })
  .delete('/:id/days/:dayId', async (c) => {
    const detail = await deletePlanDay(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('id'),
      c.req.param('dayId'),
    );
    if (!detail) return c.json({ error: notFound }, 404);
    return c.json(detail);
  })
  // --- Esercizi pianificati ---
  .post('/:id/days/:dayId/exercises', zValidator('json', createPlanExerciseSchema), async (c) => {
    const result = await addPlanExercise(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('id'),
      c.req.param('dayId'),
      c.req.valid('json'),
    );
    if (!result.ok) {
      if (result.error === 'invalid_exercise')
        return c.json({ error: 'Esercizio non valido' }, 400);
      return c.json({ error: notFound }, 404);
    }
    return c.json(result.detail, 201);
  })
  .patch(
    '/:id/days/:dayId/exercises/:peId',
    zValidator('json', updatePlanExerciseSchema),
    async (c) => {
      const detail = await updatePlanExercise(
        createDb(c.env.DB),
        c.get('user').id,
        c.req.param('id'),
        c.req.param('dayId'),
        c.req.param('peId'),
        c.req.valid('json'),
      );
      if (!detail) return c.json({ error: notFound }, 404);
      return c.json(detail);
    },
  )
  .delete('/:id/days/:dayId/exercises/:peId', async (c) => {
    const detail = await deletePlanExercise(
      createDb(c.env.DB),
      c.get('user').id,
      c.req.param('id'),
      c.req.param('dayId'),
      c.req.param('peId'),
    );
    if (!detail) return c.json({ error: notFound }, 404);
    return c.json(detail);
  });
