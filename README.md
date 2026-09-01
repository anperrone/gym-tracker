# Gym Tracker

App PWA per il tracking di misure corporee e allenamenti.
Stack: React + Cloudflare Workers (Hono) + D1/Drizzle. Vedi `docs/SPEC.md`, `docs/PLAN.md`, `docs/TASKS.md` e `CLAUDE.md`.

## Requisiti

- Node **≥ 26** (vedi `.nvmrc`)

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars   # poi compila i valori reali
npm run db:migrate               # applica le migrazioni al D1 locale
npm run dev                      # http://localhost:5173
```

## Login con Google (OAuth 2.0 + PKCE)

1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client ID** (tipo *Web application*).
2. Imposta gli **Authorized redirect URIs**:
   - Dev: `http://localhost:5173/auth/google/callback`
   - Prod: `https://<tuo-dominio>/auth/google/callback`
3. Copia Client ID/Secret in `.dev.vars` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`).
4. `ADMIN_EMAILS` = email (separate da virgola) che ricevono il ruolo admin al primo login.

In produzione i segreti vanno impostati come Wrangler secrets:

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

## Comandi utili

```bash
npm run check        # typecheck + lint/format (Biome) + test
npm test             # Vitest (unit + integrazione su workerd/D1)
npm run test:e2e     # Playwright
npm run db:generate  # genera migrazione da schema Drizzle
npm run build        # build di produzione
npm run deploy       # deploy su Cloudflare
```

## Workflow

Feature branch → review (`/agent-skills:review`) prima del push → PR verso `main` (protetto). Vedi `CLAUDE.md`.
