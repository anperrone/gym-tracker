import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types';

/** Finestra minima consentita da Cloudflare KV per `expirationTtl` (60s). */
const MIN_WINDOW_SECONDS = 60;

export type RateLimitOptions = {
  /** Prefisso logico del bucket: isola contatori di scopi diversi. */
  prefix: string;
  /** Numero massimo di richieste consentite nella finestra. */
  limit: number;
  /** Ampiezza della finestra in secondi (min 60, vincolo KV). Default 60. */
  windowSeconds?: number;
  /** Deriva la chiave di scoping dalla richiesta (per IP o per utente). */
  keyFrom: (c: Context<AppEnv>) => string;
  /** Se presente, conta solo questi metodi HTTP; gli altri passano liberi. */
  methods?: string[];
};

/**
 * Rate limiting basato su un contatore in **KV** con TTL sulla finestra.
 *
 * Nota: KV è a consistenza eventuale e il ciclo read→increment→write non è
 * atomico; il conteggio è quindi approssimato (può sotto-contare in caso di
 * corse). È sufficiente per proteggere endpoint sensibili nell'MVP; per limiti
 * rigorosi si passerebbe a Durable Objects o al prodotto Rate Limiting di CF.
 */
export function rateLimit(opts: RateLimitOptions) {
  const windowSeconds = Math.max(opts.windowSeconds ?? MIN_WINDOW_SECONDS, MIN_WINDOW_SECONDS);
  return createMiddleware<AppEnv>(async (c, next) => {
    if (opts.methods && !opts.methods.includes(c.req.method)) {
      return next();
    }
    const kv = c.env.RATE_LIMIT;
    const bucket = `rl:${opts.prefix}:${opts.keyFrom(c)}`;
    const count = Number((await kv.get(bucket)) ?? '0');
    if (count >= opts.limit) {
      c.header('Retry-After', String(windowSeconds));
      return c.json({ error: 'Troppe richieste. Riprova più tardi.' }, 429);
    }
    await kv.put(bucket, String(count + 1), { expirationTtl: windowSeconds });
    return next();
  });
}

/** IP del client dietro Cloudflare, con fallback per dev/test. */
export function clientIp(c: Context<AppEnv>): string {
  return c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'local';
}

/**
 * Throttle degli endpoint OAuth (login + callback), scoping **per IP**:
 * argina i tentativi ripetuti sul callback prima dell'autenticazione.
 */
export const rateLimitOAuth = rateLimit({
  prefix: 'oauth',
  limit: 30,
  keyFrom: clientIp,
});

/**
 * Throttle delle mutation autenticate, scoping **per utente** (va montato dopo
 * `requireAuth`). Salta le richieste di sola lettura (GET/HEAD).
 */
export const rateLimitMutations = rateLimit({
  prefix: 'mut',
  limit: 120,
  methods: ['POST', 'PATCH', 'PUT', 'DELETE'],
  keyFrom: (c) => c.get('user')?.id ?? clientIp(c),
});
