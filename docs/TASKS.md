# Tasks: Gym Tracker

> Fase 3 del workflow spec-driven. Riferimenti: `SPEC.md` (APPROVED), `PLAN.md` (APPROVED).
> Stato: **APPROVED** (2026-09-01) — implementazione in corso

Task discreti, ordinati per dipendenza. Ogni task: ≤ ~5 file, criteri di accettazione e passo di verifica espliciti. Dettagliati per **M0** e **M1**; M2–M9 restano a granularità alta e verranno scomposti al loro turno.

Convenzione: `[ ]` da fare · `[~]` in corso · `[x]` fatto. Ogni task chiude solo con `npm run check` verde.

---

## M0 — Foundation / Scaffolding

- [x] **T0.1 — Init progetto & tooling base**
  - Acceptance: `package.json` con scripts dello SPEC (placeholder dove serve); TypeScript strict; Biome (lint+format); `.gitignore`, `.editorconfig`; `.dev.vars.example`
  - Verify: `npm run lint` e `npm run typecheck` passano su progetto vuoto
  - Files: `package.json`, `tsconfig.json`, `biome.json`, `.gitignore`, `.dev.vars.example`

- [x] **T0.2 — Vite + React + Cloudflare plugin + Worker Hono**
  - Acceptance: `@cloudflare/vite-plugin` configurato; SPA React monta; Worker Hono con `GET /api/health` → `{ ok: true }`; assets binding con fallback SPA
  - Verify: `npm run dev` serve SPA + risponde su `/api/health`; `npm run build` produce output
  - Files: `vite.config.ts`, `src/client/main.tsx`, `src/server/index.ts`, `index.html`

- [x] **T0.3 — wrangler.jsonc + binding D1 + tipi env**
  - Acceptance: `wrangler.jsonc` con binding **D1** (`DB`), assets con `not_found_handling: single-page-application`; `wrangler types` genera i tipi env
  - Verify: `npm run typecheck` include tipi env; `wrangler dev` avvia con D1 locale
  - Files: `wrangler.jsonc`, `worker-configuration.d.ts` (generato), `src/server/types.ts`

- [x] **T0.4 — Drizzle ORM + flusso migrazioni**
  - Acceptance: `drizzle.config.ts`, helper connessione D1, script `db:generate`/`db:migrate`/`db:studio`; migrazione iniziale vuota applicabile
  - Verify: `npm run db:generate` + `npm run db:migrate` (locale) senza errori
  - Files: `drizzle.config.ts`, `src/server/db/schema.ts` (stub), `src/server/db/client.ts`, `migrations/`

- [x] **T0.5 — Tailwind + shell UI mobile-first**
  - Acceptance: Tailwind attivo; layout base responsive (app shell + navigazione bottom su mobile) con placeholder
  - Verify: `npm run dev` mostra shell responsive; nessun errore console
  - Files: `tailwind.config.ts`, `src/client/index.css`, `src/client/components/AppShell.tsx`

- [x] **T0.6 — Infrastruttura di test (Vitest + Playwright)**
  - Acceptance: Vitest + `@cloudflare/vitest-pool-workers` (test integrazione su D1) con test di `/api/health`; RTL+jsdom con test di un componente; **Playwright** con smoke E2E (home + stato API + nav).
  - Verify: `npm test` verde (4 test, 2 progetti); `npm run test:e2e` verde (2 test, Chromium).
  - Files: `vitest.config.ts`, `tests/health.test.ts`, `tests/setup.client.ts`, `src/client/vitest.d.ts`, `playwright.config.ts`, `e2e/smoke.spec.ts`

- [x] **T0.7 — Shared (Zod) + data layer client**
  - Acceptance: cartella `shared/` con Zod base e tipi; client API tipizzato (hono client); provider **TanStack Query**; **TanStack Router** con 1 rotta
  - Verify: type-check end-to-end client↔server; una fetch reale a `/api/health` dalla UI
  - Files: `src/shared/schemas.ts`, `src/client/lib/api.ts`, `src/client/lib/query.tsx`, `src/client/routes/`

- [x] **T0.8 — CI + git hooks + Node 26**
  - Acceptance: `ci.yml` (Node 26) esegue `npm run check` (lint+format+typecheck+test) su push/PR; **pipeline E2E separata** `e2e.yml` (Playwright/Chromium); **husky + lint-staged** con hook `pre-commit` (lint/format auto-fix + typecheck); Node **≥26** (`.nvmrc`, `engines`).
  - Verify: `npm run check` verde; hook `pre-commit` verde (exit 0); E2E verde in locale. Verifica "pipeline verde" su GitHub → al primo push.
  - Files: `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`, `.husky/pre-commit`, `.nvmrc`, `package.json` (scripts, lint-staged, engines)

**Checkpoint M0**: `npm run dev`/`build` ok, D1 migra, `npm run check` verde, E2E smoke verde, pre-commit hook attivo.

**Delivery M0**: repo **pubblico** `anperrone/gym-tracker`; consegnato via PR #1 (squash) → `main`. CI verde (`check` + `e2e` + GitGuardian). Hardening: **ruleset attivo** su `main` (PR obbligatoria, check `check`/`e2e` richiesti, no force-push/delete, linear history) + merge solo squash/rebase + auto-delete branch + Dependabot; hook `pre-push` blocca push su `main`.

---

## M1 — Auth (Google OAuth + sessioni)

- [x] **T1.1 — Schema `users` + `sessions`**
  - Acceptance: tabelle Drizzle `users` (con `google_sub` unique, `role` user/admin) e `sessions` (id = hash token, `expires_at`, FK cascade); migrazione `0000_absurd_spirit.sql` generata e applicata. Infra test: migrazioni auto-applicate al D1 pool-workers.
  - Verify: `npm run db:migrate` ok; test `tabella users` (insert/read + unique) verde; `npm run check` verde (6 test).
  - Files: `src/server/db/schema.ts`, `migrations/0000_absurd_spirit.sql`, `tests/db/users.test.ts`, `tests/apply-migrations.ts`, `vitest.config.ts`

- [x] **T1.2 — Config OAuth Google (Web Crypto, no arctic) + segreti**
  - Acceptance: OAuth 2.0 + PKCE (S256) implementato con Web Crypto (arctic **rimosso**, deprecato); `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` da env; redirect URI dev/prod in README
  - Verify: typecheck ok; `.dev.vars.example` + README aggiornati; nessun segreto nel repo
  - Files: `src/server/auth/oauth.ts`, `src/server/auth/crypto.ts`, `src/server/config.ts`, `.dev.vars.example`, `README.md`

- [x] **T1.3 — Route auth (login / callback / logout)**
  - Acceptance: `GET /auth/google/login` (state+PKCE in cookie, redirect Google); `GET /auth/google/callback` (scambio code, fetch userinfo, upsert `users`, crea sessione, set cookie); `POST /auth/logout` (revoca)
  - Verify: login reale in dev crea utente e sessione; logout invalida
  - Files: `src/server/routes/auth.ts`, `src/server/index.ts`

- [x] **T1.4 — Modulo sessioni (D1)**
  - Acceptance: create/validate/renew (sliding)/revoke; token **hashed** in D1; cookie HttpOnly+Secure+SameSite=Lax
  - Verify: unit test su hashing/scadenza/rinnovo; test revoca
  - Files: `src/server/auth/session.ts`, `tests/auth/session.test.ts`

- [x] **T1.5 — Middleware `requireAuth` + allowlist admin**
  - Acceptance: middleware default-deny che popola `c.get('user')`; email in **allowlist** → ruolo `admin` al primo login
  - Verify: test — anonimo bloccato (401); email allowlist ottiene `admin`
  - Files: `src/server/middleware/auth.ts`, `src/server/config.ts`, `tests/auth/authz.test.ts`

- [x] **T1.6 — Frontend auth (login + rotte protette)**
  - Acceptance: contesto/hook auth; pagina login con bottone Google; `GET /api/me`; wrapper rotte protette che redirige gli anonimi
  - Verify: E2E — flusso login (Google mockato) porta a home autenticata
  - Files: `src/client/features/auth/*`, `src/server/routes/me.ts`, `src/client/routes/`

- [x] **T1.7 — Test auth (integrazione + E2E)**
  - Acceptance: integrazione (requireAuth blocca anon; callback crea utente; logout invalida); E2E login con Google mockato
  - Verify: `npm test` + `npm run test:e2e` verdi
  - Files: `tests/auth/*.test.ts`, `e2e/auth.spec.ts`

**Checkpoint M1** ✅: OAuth Google (Web Crypto+PKCE), sessioni D1, `requireAuth` + allowlist admin, frontend login/rotte protette/logout. 15 test unit/integrazione + 3 E2E verdi; build ok. E2E usa un seam dev `/auth/test-login` (gated `import.meta.env.DEV`, **assente in produzione** — verificato). Login reale con Google richiede credenziali OAuth in `.dev.vars`.

---

## M2–M9 — da dettagliare al proprio turno

Granularità alta ora; scomposizione in task al momento dell'implementazione (dopo M1).

- **M2 Misure** — schema `measurement_types/entries/values` + seed metriche default; API CRUD scoped; form inserimento; storico; grafico peso.
- **M3 Catalogo esercizi** — schema `exercises` + seed (Appendix A); API list/search/create-custom/link-canonical; picker UI.
- **M4 Schede** — schema `workout_plans/plan_days/plan_exercises`; API CRUD; plan builder UI.
- **M5 Log allenamento** — schema `workout_sessions/session_exercises/session_sets`; API upsert idempotente (`client_id`); UI logging peso variabile per serie.
- **M6 Offline/PWA** — `vite-plugin-pwa` (manifest+SW); Dexie; persistenza TanStack Query; coda mutation offline; sync idempotente + test replay.
- **M7 Progressi & grafici** — calcoli (1RM Epley, volume, max, PR); endpoint aggregazione; grafici bodyweight + per-esercizio.
- **M8 Admin** — route role-gated; gestione catalogo globale; gestione utenti/ruoli; test "admin non legge dati personali".
- **M9 Hardening & deploy** — rate limit (KV), error handling, a11y, E2E completi, coverage gate, migrazioni prod, deploy, verifica install PWA.

---

## Prossimo passo

Dopo l'**approvazione** di questi task si passa alla **Fase 4 — Implement**: si parte da **T0.1** seguendo TDD e implementazione incrementale (un task alla volta, `npm run check` verde prima di procedere).
