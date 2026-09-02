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
 * Rate limiting basato su un contatore in **KV** a **finestra fissa**: la chiave
 * include lo slot temporale (`…:<floor(now/window)>`), così il contatore si
 * azzera naturalmente a ogni finestra invece di far slittare il TTL a ogni
 * scrittura.
 *
 * È **best-effort**: KV è a consistenza eventuale e il ciclo read→increment→write
 * non è atomico, quindi il conteggio è approssimato (può sotto-contare in caso di
 * corse). Sufficiente come difesa in profondità nell'MVP; per limiti rigorosi si
 * userebbe un Durable Object o il binding Rate Limiting di CF. In caso di errore
 * KV **fail-open**: non blocca il percorso critico (login/mutation).
 */
export function rateLimit(opts: RateLimitOptions) {
  const windowSeconds = Math.max(opts.windowSeconds ?? MIN_WINDOW_SECONDS, MIN_WINDOW_SECONDS);
  return createMiddleware<AppEnv>(async (c, next) => {
    if (opts.methods && !opts.methods.includes(c.req.method)) {
      return next();
    }
    const kv = c.env.RATE_LIMIT;
    const slot = Math.floor(Date.now() / (windowSeconds * 1000));
    const bucket = `rl:${opts.prefix}:${opts.keyFrom(c)}:${slot}`;
    try {
      const parsed = Number(await kv.get(bucket));
      const count = Number.isFinite(parsed) ? parsed : 0; // fail-safe su valori corrotti
      if (count >= opts.limit) {
        c.header('Retry-After', String(windowSeconds));
        return c.json({ error: 'Troppe richieste. Riprova più tardi.' }, 429);
      }
      await kv.put(bucket, String(count + 1), { expirationTtl: windowSeconds });
    } catch (err) {
      // KV non disponibile: il limiter è best-effort, non deve bloccare l'app.
      console.error('rateLimit: KV non disponibile, richiesta consentita:', String(err));
    }
    return next();
  });
}

/**
 * IP del client. Usa **solo** `CF-Connecting-IP` (impostato da Cloudflare, non
 * falsificabile dal client); mai `X-Forwarded-For`, che è manipolabile e
 * permetterebbe di ruotare la chiave per aggirare il limite. In dev/test
 * l'header è assente → fallback costante.
 */
export function clientIp(c: Context<AppEnv>): string {
  return c.req.header('CF-Connecting-IP') ?? 'local';
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
 * `requireAuth`, quindi `user` è sempre presente). Salta le sole letture (GET/HEAD).
 *
 * Il limite è ampio: il logging offline-first (M6) mette in coda le mutation e le
 * rigioca in blocco alla riconnessione; una soglia bassa le farebbe fallire (429)
 * e, senza retry, perdere. 300/min lascia margine a sessioni lunghe pur arginando
 * gli abusi automatici.
 */
export const rateLimitMutations = rateLimit({
  prefix: 'mut',
  limit: 300,
  methods: ['POST', 'PATCH', 'PUT', 'DELETE'],
  keyFrom: (c) => c.get('user').id,
});
