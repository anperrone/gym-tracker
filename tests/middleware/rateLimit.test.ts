import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import app from '../../src/server';
import { rateLimit } from '../../src/server/middleware/rateLimit';
import type { AppEnv } from '../../src/server/types';

/** App di prova che conta le richieste per una chiave fissa, con limite basso. */
function makeApp(limit: number, keyFrom: (ip: string) => string = () => 'k') {
  return new Hono<AppEnv>()
    .use(
      '*',
      rateLimit({
        prefix: `t-${crypto.randomUUID()}`, // bucket isolato per test
        limit,
        keyFrom: (c) => keyFrom(c.req.header('X-Forwarded-For') ?? 'x'),
      }),
    )
    .get('/', (c) => c.text('ok'))
    .post('/', (c) => c.text('created'));
}

function call(app: Hono<AppEnv>, method = 'GET') {
  return app.request('/', { method }, env);
}

describe('rateLimit middleware', () => {
  it('consente fino al limite e blocca oltre con 429 + Retry-After', async () => {
    const app = makeApp(3);
    for (let i = 0; i < 3; i++) {
      expect((await call(app)).status).toBe(200);
    }
    const blocked = await call(app);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    const body = (await blocked.json()) as { error: string };
    expect(body.error).toMatch(/troppe richieste/i);
  });

  it('scopa i contatori per chiave (IP diversi non si sommano)', async () => {
    const app = makeApp(2, (ip) => ip);
    const reqAs = (ip: string) => app.request('/', { headers: { 'X-Forwarded-For': ip } }, env);

    expect((await reqAs('1.1.1.1')).status).toBe(200);
    expect((await reqAs('1.1.1.1')).status).toBe(200);
    expect((await reqAs('1.1.1.1')).status).toBe(429);
    // Un IP diverso ha un contatore separato.
    expect((await reqAs('2.2.2.2')).status).toBe(200);
  });

  it('conta solo i metodi indicati (le GET non consumano il budget POST)', async () => {
    const app = new Hono<AppEnv>()
      .use(
        '*',
        rateLimit({
          prefix: `m-${crypto.randomUUID()}`,
          limit: 1,
          methods: ['POST'],
          keyFrom: () => 'k',
        }),
      )
      .get('/', (c) => c.text('ok'))
      .post('/', (c) => c.text('created'));

    // Le GET non vengono contate.
    expect((await call(app, 'GET')).status).toBe(200);
    expect((await call(app, 'GET')).status).toBe(200);
    // La prima POST passa, la seconda supera il limite.
    expect((await call(app, 'POST')).status).toBe(200);
    expect((await call(app, 'POST')).status).toBe(429);
  });
});

describe('rate limit — wiring sulle rotte', () => {
  it('throttla gli endpoint OAuth per IP (429 oltre soglia)', async () => {
    const ip = '203.0.113.7';
    let statusAt429 = 0;
    for (let i = 1; i <= 40; i++) {
      const res = await app.request(
        '/auth/google/login',
        { headers: { 'CF-Connecting-IP': ip } },
        env,
      );
      if (res.status === 429) {
        statusAt429 = i;
        break;
      }
      expect(res.status).toBe(302); // redirect a Google finché sotto soglia
    }
    // Il 31° tentativo (limite 30) deve essere bloccato.
    expect(statusAt429).toBe(31);
  });
});
