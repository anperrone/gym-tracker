import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../../src/server';
import { createSession } from '../../src/server/auth/session';
import { createDb } from '../../src/server/db/client';
import { users } from '../../src/server/db/schema';
import type { WorkoutSessionDetailDto } from '../../src/shared/schemas';

async function seedUserWithSession(): Promise<{ userId: string; cookie: string }> {
  const db = createDb(env.DB);
  const userId = crypto.randomUUID();
  await db
    .insert(users)
    .values({ id: userId, googleSub: `s-${userId}`, email: `${userId}@example.com` });
  const token = await createSession(db, userId);
  return { userId, cookie: `session=${token}` };
}

function req(cookie: string, path: string, method: string, body?: unknown) {
  return app.request(
    path,
    {
      method,
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
    env,
  );
}

/** Avvia una sessione con un esercizio e ritorna id sessione + id esercizio-sessione. */
async function sessionWithExercise(cookie: string) {
  const started = (await (
    await req(cookie, '/api/sessions', 'POST', { clientId: crypto.randomUUID() })
  ).json()) as WorkoutSessionDetailDto;
  const withEx = (await (
    await req(cookie, `/api/sessions/${started.id}/exercises`, 'POST', { exerciseId: 'ex_squat' })
  ).json()) as WorkoutSessionDetailDto;
  return { sessionId: started.id, seId: withEx.exercises[0].id };
}

describe('API allenamenti — ciclo di vita serie/esercizi', () => {
  it('aggiorna una serie (peso/reps/completata/note)', async () => {
    const { cookie } = await seedUserWithSession();
    const { sessionId, seId } = await sessionWithExercise(cookie);
    const created = (await (
      await req(cookie, `/api/sessions/${sessionId}/exercises/${seId}/sets`, 'POST', {
        weight: 60,
        reps: 10,
      })
    ).json()) as WorkoutSessionDetailDto;
    const setId = created.exercises[0].sets[0].id;

    const res = await req(
      cookie,
      `/api/sessions/${sessionId}/exercises/${seId}/sets/${setId}`,
      'PATCH',
      { weight: 65, reps: 8, completed: true, notes: 'buona' },
    );
    expect(res.status).toBe(200);
    const detail = (await res.json()) as WorkoutSessionDetailDto;
    const set = detail.exercises[0].sets[0];
    expect(set.weight).toBe(65);
    expect(set.reps).toBe(8);
    expect(set.completed).toBe(true);
    expect(set.notes).toBe('buona');
  });

  it('un PATCH serie vuoto è un no-op valido (nessun campo cambiato)', async () => {
    const { cookie } = await seedUserWithSession();
    const { sessionId, seId } = await sessionWithExercise(cookie);
    const created = (await (
      await req(cookie, `/api/sessions/${sessionId}/exercises/${seId}/sets`, 'POST', {
        weight: 50,
        reps: 12,
      })
    ).json()) as WorkoutSessionDetailDto;
    const setId = created.exercises[0].sets[0].id;

    const res = await req(
      cookie,
      `/api/sessions/${sessionId}/exercises/${seId}/sets/${setId}`,
      'PATCH',
      {},
    );
    expect(res.status).toBe(200);
    const detail = (await res.json()) as WorkoutSessionDetailDto;
    expect(detail.exercises[0].sets[0].weight).toBe(50);
  });

  it('elimina una serie', async () => {
    const { cookie } = await seedUserWithSession();
    const { sessionId, seId } = await sessionWithExercise(cookie);
    const created = (await (
      await req(cookie, `/api/sessions/${sessionId}/exercises/${seId}/sets`, 'POST', { reps: 10 })
    ).json()) as WorkoutSessionDetailDto;
    const setId = created.exercises[0].sets[0].id;

    const res = await req(
      cookie,
      `/api/sessions/${sessionId}/exercises/${seId}/sets/${setId}`,
      'DELETE',
    );
    expect(res.status).toBe(200);
    const detail = (await res.json()) as WorkoutSessionDetailDto;
    expect(detail.exercises[0].sets).toHaveLength(0);
  });

  it('elimina un esercizio dalla sessione', async () => {
    const { cookie } = await seedUserWithSession();
    const { sessionId, seId } = await sessionWithExercise(cookie);
    const res = await req(cookie, `/api/sessions/${sessionId}/exercises/${seId}`, 'DELETE');
    expect(res.status).toBe(200);
    const detail = (await res.json()) as WorkoutSessionDetailDto;
    expect(detail.exercises).toHaveLength(0);
  });

  it('numera le serie in modo incrementale', async () => {
    const { cookie } = await seedUserWithSession();
    const { sessionId, seId } = await sessionWithExercise(cookie);
    await req(cookie, `/api/sessions/${sessionId}/exercises/${seId}/sets`, 'POST', { reps: 10 });
    const second = (await (
      await req(cookie, `/api/sessions/${sessionId}/exercises/${seId}/sets`, 'POST', { reps: 8 })
    ).json()) as WorkoutSessionDetailDto;
    expect(second.exercises[0].sets.map((s) => s.setNumber)).toEqual([1, 2]);
  });

  describe('id serie generato dal client', () => {
    it('usa l’id fornito ed è idempotente sul replay', async () => {
      const { cookie } = await seedUserWithSession();
      const { sessionId, seId } = await sessionWithExercise(cookie);
      const id = crypto.randomUUID();
      const path = `/api/sessions/${sessionId}/exercises/${seId}/sets`;

      const first = await req(cookie, path, 'POST', { id, weight: 70 });
      expect(first.status).toBe(201);
      const created = (await first.json()) as WorkoutSessionDetailDto;
      expect(created.exercises[0].sets.map((s) => s.id)).toEqual([id]);

      // Replay (es. coda offline): nessuna serie duplicata.
      const replay = (await (
        await req(cookie, path, 'POST', { id, weight: 70 })
      ).json()) as WorkoutSessionDetailDto;
      expect(replay.exercises[0].sets.map((s) => s.id)).toEqual([id]);

      // Subito modificabile con lo stesso id.
      const patched = await req(cookie, `${path}/${id}`, 'PATCH', { weight: 80 });
      expect(patched.status).toBe(200);
    });

    it('rifiuta un id già usato da una serie di un altro utente (404)', async () => {
      const a = await seedUserWithSession();
      const b = await seedUserWithSession();
      const sa = await sessionWithExercise(a.cookie);
      const sb = await sessionWithExercise(b.cookie);
      const id = crypto.randomUUID();
      await req(a.cookie, `/api/sessions/${sa.sessionId}/exercises/${sa.seId}/sets`, 'POST', {
        id,
        weight: 70,
      });

      const res = await req(
        b.cookie,
        `/api/sessions/${sb.sessionId}/exercises/${sb.seId}/sets`,
        'POST',
        { id, weight: 1 },
      );
      expect(res.status).toBe(404);
      expect(JSON.stringify(await res.json())).not.toContain('70');
    });

    it('rifiuta un id non UUID (400)', async () => {
      const { cookie } = await seedUserWithSession();
      const { sessionId, seId } = await sessionWithExercise(cookie);
      const res = await req(cookie, `/api/sessions/${sessionId}/exercises/${seId}/sets`, 'POST', {
        id: 'temp-1',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('percorsi 404 su risorse inesistenti', () => {
    const missing = crypto.randomUUID();

    it('PATCH sessione inesistente → 404', async () => {
      const { cookie } = await seedUserWithSession();
      const res = await req(cookie, `/api/sessions/${missing}`, 'PATCH', { status: 'completed' });
      expect(res.status).toBe(404);
    });

    it('DELETE sessione inesistente → 404', async () => {
      const { cookie } = await seedUserWithSession();
      expect((await req(cookie, `/api/sessions/${missing}`, 'DELETE')).status).toBe(404);
    });

    it('DELETE esercizio inesistente → 404', async () => {
      const { cookie } = await seedUserWithSession();
      const { sessionId } = await sessionWithExercise(cookie);
      expect(
        (await req(cookie, `/api/sessions/${sessionId}/exercises/${missing}`, 'DELETE')).status,
      ).toBe(404);
    });

    it('POST serie su esercizio inesistente → 404', async () => {
      const { cookie } = await seedUserWithSession();
      const { sessionId } = await sessionWithExercise(cookie);
      const res = await req(
        cookie,
        `/api/sessions/${sessionId}/exercises/${missing}/sets`,
        'POST',
        { reps: 5 },
      );
      expect(res.status).toBe(404);
    });

    it('PATCH/DELETE serie inesistente → 404', async () => {
      const { cookie } = await seedUserWithSession();
      const { sessionId, seId } = await sessionWithExercise(cookie);
      const base = `/api/sessions/${sessionId}/exercises/${seId}/sets/${missing}`;
      expect((await req(cookie, base, 'PATCH', { reps: 1 })).status).toBe(404);
      expect((await req(cookie, base, 'DELETE')).status).toBe(404);
    });
  });
});
