# Gym Tracker

App PWA per il tracking di misure corporee e allenamenti.
Stack: React + Cloudflare Workers (Hono) + D1/Drizzle. Requisiti: **Node ≥ 26** (`.nvmrc`).
Doc: `docs/SPEC.md`, `docs/PLAN.md`, `docs/TASKS.md`, `CLAUDE.md`.

---

## 1. Servizi third-party (obbligatori)

Questi passi si fanno sui provider esterni e sono **prerequisiti** sia per il run locale (Google) sia per il deploy (Cloudflare + Google).

### Cloudflare

1. **Crea il database D1** e copia l'`database_id` restituito dentro `wrangler.jsonc` (`d1_databases[0].database_id`):
   ```bash
   npx wrangler d1 create gym-tracker-db
   ```
2. **Crea il namespace KV** (rate limiting) e copia l'`id` restituito dentro `wrangler.jsonc` (`kv_namespaces[0].id`), sostituendo il placeholder:
   ```bash
   npx wrangler kv namespace create RATE_LIMIT
   ```
3. **API token** — crea un token con template *Edit Cloudflare Workers* (permessi *Workers Scripts:Edit*, *D1:Edit* e *Workers KV Storage:Edit*).
4. **Account ID** — dalla dashboard Cloudflare (Workers & Pages → Overview).

### Google (OAuth 2.0)

1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client ID** (tipo *Web application*).
2. **Authorized redirect URIs**:
   - Dev: `http://localhost:5173/auth/google/callback`
   - Prod: `https://gym-tracker.<tuo-subdomain>.workers.dev/auth/google/callback`
     (il dominio `workers.dev` nasce col **primo deploy**: puoi deployare una prima volta, leggere l'URL reale, poi aggiungere il redirect URI e ridistribuire).
3. Ottieni **Client ID** e **Client Secret**.

---

## 2. Configurazione dell'applicativo

### Per il run locale — `.dev.vars`

```bash
npm install
cp .dev.vars.example .dev.vars     # compila i valori
npm run db:migrate                 # applica le migrazioni al D1 locale
```

In `.dev.vars` imposta:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback`
- `ADMIN_EMAILS` — email (separate da virgola) che ricevono il ruolo admin al primo login

### Per il deploy — GitHub Secrets + variabile

I segreti restano su GitHub e vengono sincronizzati verso Cloudflare dalla pipeline:

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set GOOGLE_CLIENT_ID
gh secret set GOOGLE_CLIENT_SECRET
gh secret set GOOGLE_REDIRECT_URI       # URL di produzione
gh secret set ADMIN_EMAILS
gh variable set DEPLOY_ENABLED --body true   # attiva il job di deploy (fallo per ultimo)
```

Per **ruotare** i secret (o in caso di esposizione) vedi `docs/RUNBOOK-secrets.md`.

---

## 3. Comandi (test, build, run locale, deploy)

### Test & qualità
```bash
npm run check        # typecheck + Biome (lint/format) + test — gate di CI/precommit
npm test             # Vitest (unit + integrazione su workerd/D1)
npm run test:e2e     # Playwright (E2E)
```

### Run locale
```bash
npm run dev          # http://localhost:5173
```

### Build & deploy
```bash
npm run build        # build di produzione (Vite → dist/)
npm run deploy       # build + deploy manuale su Cloudflare (dist/gym_tracker/wrangler.json)

npm run db:generate  # genera una migrazione dallo schema Drizzle
npm run db:migrate:prod   # applica le migrazioni al D1 remoto
```

**Deploy automatico (consigliato):** ogni **merge su `main`** avvia i job `check` ed `e2e`; se **entrambi verdi** e `DEPLOY_ENABLED=true`, il job `deploy` applica le migrazioni al D1 remoto → build → pubblica il Worker → sincronizza i secret. Vedi `.github/workflows/ci.yml`.

---

## Workflow di sviluppo

Feature branch → review (`/agent-skills:review`) prima del push → PR verso `main` (protetto: PR obbligatoria, CI verde). Mai commit/push diretti su `main`. Dettagli in `CLAUDE.md`.
