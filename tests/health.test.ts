import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../src/server';

describe('GET /api/health', () => {
  it('risponde con { ok: true }', async () => {
    const res = await app.request('/api/health', {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('rende disponibile il binding D1', () => {
    expect(env.DB).toBeDefined();
  });
});
