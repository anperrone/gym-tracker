import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../../src/server';
import { createSession } from '../../src/server/auth/session';
import { createDb } from '../../src/server/db/client';
import { users } from '../../src/server/db/schema';
import type { WorkoutSessionDetailDto, WorkoutSessionSummaryDto } from '../../src/shared/schemas';

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

describe('sync offline — idempotenza per client_id', () => {
  it('più replay dello stesso start non duplicano la sessione né i dati', async () => {
    const { cookie } = await seedUserWithSession();
    const clientId = crypto.randomUUID();

    // Primo avvio (201 = creata) + logging di una serie.
    const first = (await (
      await req(cookie, '/api/sessions', 'POST', { clientId })
    ).json()) as WorkoutSessionDetailDto;
    const withEx = (await (
      await req(cookie, `/api/sessions/${first.id}/exercises`, 'POST', { exerciseId: 'ex_squat' })
    ).json()) as WorkoutSessionDetailDto;
    await req(
      cookie,
      `/api/sessions/${first.id}/exercises/${withEx.exercises[0].id}/sets`,
      'POST',
      {
        weight: 60,
        reps: 10,
      },
    );

    // Replay ripetuti dello start (come farebbe la coda offline al ritorno online).
    for (let i = 0; i < 3; i++) {
      const replay = await req(cookie, '/api/sessions', 'POST', { clientId });
      expect(replay.status).toBe(200); // già esistente, non creata
      expect(((await replay.json()) as WorkoutSessionDetailDto).id).toBe(first.id);
    }

    // Una sola sessione, con i dati intatti (nessuna duplicazione).
    const list = (await (
      await req(cookie, '/api/sessions', 'GET')
    ).json()) as WorkoutSessionSummaryDto[];
    expect(list).toHaveLength(1);
    expect(list[0].exerciseCount).toBe(1);
    expect(list[0].setCount).toBe(1);
  });

  it('lo stesso client_id per due utenti resta isolato (sessioni distinte)', async () => {
    const a = await seedUserWithSession();
    const b = await seedUserWithSession();
    const clientId = crypto.randomUUID();

    const sa = (await (
      await req(a.cookie, '/api/sessions', 'POST', { clientId })
    ).json()) as WorkoutSessionDetailDto;
    const sb = (await (
      await req(b.cookie, '/api/sessions', 'POST', { clientId })
    ).json()) as WorkoutSessionDetailDto;

    expect(sa.id).not.toBe(sb.id);
    expect((await (await req(a.cookie, '/api/sessions', 'GET')).json()) as unknown[]).toHaveLength(
      1,
    );
    expect((await (await req(b.cookie, '/api/sessions', 'GET')).json()) as unknown[]).toHaveLength(
      1,
    );
  });
});
