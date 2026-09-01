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

## Deploy (Cloudflare via GitHub Actions)

Il workflow `CI` esegue i job `check` ed `e2e` su ogni push/PR; su push a `main`, se **entrambi verdi**, parte il job `deploy` (solo se `DEPLOY_ENABLED=true`). Il deploy applica le migrazioni al D1 remoto, builda, pubblica il Worker e sincronizza i secret.

### Setup una tantum

1. **Crea il database D1** e copia l'`database_id` in `wrangler.jsonc` (campo `d1_databases[0].database_id`):
   ```bash
   npx wrangler d1 create gym-tracker-db
   ```
2. **Cloudflare API token** — crea un token (template *Edit Cloudflare Workers*, con permessi Workers Scripts:Edit e D1:Edit) e l'**Account ID** (dashboard Cloudflare).
3. **Google OAuth (produzione)** — crea le credenziali e aggiungi il redirect URI di produzione:
   `https://gym-tracker.<tuo-subdomain>.workers.dev/auth/google/callback`
   (il dominio `workers.dev` esiste dopo il primo deploy; puoi fare un primo deploy, leggere l'URL, poi impostare il redirect URI e ridistribuire).
4. **Imposta i secret e la variabile su GitHub**:
   ```bash
   gh secret set CLOUDFLARE_API_TOKEN
   gh secret set CLOUDFLARE_ACCOUNT_ID
   gh secret set GOOGLE_CLIENT_ID
   gh secret set GOOGLE_CLIENT_SECRET
   gh secret set GOOGLE_REDIRECT_URI
   gh secret set ADMIN_EMAILS
   gh variable set DEPLOY_ENABLED --body true   # attiva il job di deploy
   ```

Da quel momento, ogni merge su `main` con `check` + `e2e` verdi pubblica automaticamente su Cloudflare.
