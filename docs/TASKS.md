# Tasks: Gym Tracker

> Fase 3 del workflow spec-driven. Riferimenti: `SPEC.md` (APPROVED), `PLAN.md` (APPROVED), `SPEC-ui-redesign.md`.
> Stato: **APPROVED** (2026-09-01) — implementazione in corso. **Ripriorizzato 2026-09-01**: fatti M0/M1/M2/**MU**; in corso **M3 (Catalogo esercizi)**, poi M4→M5.

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

## M2 — Misure ✅ (branch `feat/m2-measurements`)

- [x] **T2.1** schema `measurement_types/entries/values` + seed 9 metriche default (migrazione `0001`) + test
- [x] **T2.2** API scoped per utente: GET tipi (default+custom), CRUD misurazioni (create con valori, storico) + Zod
- [x] **T2.3** Frontend: pagina Misure, form inserimento (9 metriche), storico
- [x] **T2.4** Grafico andamento (peso + circonferenze) con Recharts
- [x] **T2.5** Test integrazione (isolamento per utente) + E2E

---

## MU — UI Redesign & Design System (priorità corrente)

> Ripriorizzato 2026-09-01: la UI ha precedenza sugli allenamenti (M3→M5). Riferimento: `SPEC-ui-redesign.md`. Branch: `feat/ui-modern-redesign`. Ordine interno: token tema → fix grafico (bloccante) → primitive/overview → restyle schermate.

- [x] **TU.1 — Design tokens & tema (dark/light) + toggle**
  - Acceptance: token semantici (bg/surface/border/text/accent/positive/negative/chart-*) definiti **una sola volta** in `index.css` con variante `data-theme`; `useTheme` con default da `prefers-color-scheme`, toggle e persistenza `localStorage`; `ThemeToggle` accessibile
  - Verify: unit `useTheme` (default sistema, toggle, persistenza); `npm run check` verde
  - Files: `src/client/index.css`, `src/client/lib/theme.ts`, `src/client/components/ThemeToggle.tsx`, test

- [x] **TU.2 — Fix grafico asse Y (bloccante) + arricchimento**
  - Acceptance: `margin.left ≥ 0` e `YAxis width` adeguata → **etichette asse Y mai tagliate** a 320/390/desktop; unità fuori dai tick (`tickFormatter` numerico); area con gradiente accento + ultimo punto evidenziato; tooltip e stati loading/empty a tema; colori da `chartTheme.ts`
  - Verify: unit su `tickFormatter`/dominio; E2E che le tick label dell'asse Y sono presenti e dentro il box (x non negativa); `npm run check` verde
  - Files: `src/client/features/measurements/MeasurementChart.tsx`, `chartTheme.ts`, test, `e2e/measurements-chart.spec.ts`

- [x] **TU.3 — Primitive UI (Card / StatTile / IconButton / icone SVG)**
  - Acceptance: primitive a tema, `tabular-nums` sui valori; set icone SVG per nav/azioni (sostituisce le emoji); smoke test render
  - Verify: test render primitive; `npm run check` verde
  - Files: `src/client/components/Card.tsx`, `StatTile.tsx`, `IconButton.tsx`, `icons.tsx`, test

- [x] **TU.4 — Restyle AppShell + Login**
  - Acceptance: header + bottom-nav ridisegnati con token e icone SVG; stato attivo con accento; `ThemeToggle` nell'header; voci placeholder ancora `disabled` + `aria-label`; Login a tema (bottone Google coerente)
  - Verify: `AppShell.test.tsx` aggiornato passa; `npm run check` verde
  - Files: `src/client/components/AppShell.tsx`, `src/client/features/auth/LoginPage.tsx`, `AppShell.test.tsx`

- [x] **TU.5 — Pagina Misure: stat overview + restyle form/storico**
  - Acceptance: riga di **stat tiles** (ultimo valore + Δ vs precedente, colore **neutro** non giudicante) dai dati esistenti; stato vuoto a tema; `MeasurementsPage`, `MeasurementHistory`, `MeasurementForm` restyled a tema
  - Verify: unit calcolo Δ; E2E overview mostra ultimo valore + Δ; `npm run check` verde
  - Files: `src/client/features/measurements/StatOverview.tsx`, `MeasurementsPage.tsx`, `MeasurementHistory.tsx`, `MeasurementForm.tsx`, test

- [x] **TU.6 — A11y + regressione E2E finale**
  - Acceptance: contrasto **AA** su testo/accento in entrambi i temi; E2E completo (toggle tema persistito dopo reload + asse Y visibile) verde; bundle non peggiora sensibilmente (Recharts resta lazy)
  - Verify: `npm run check` + `npm run test:e2e` verdi; check contrasto (axe/manuale)
  - Files: `e2e/*.spec.ts`, eventuale nota in `docs/`

**Checkpoint MU**: asse Y completo su tutte le viewport; tema dark/light con toggle persistito (default sistema); schermate restyled AA; `npm run check` + E2E verdi. Chiusura via PR verso `main`.

---

## M3 — Catalogo esercizi ✅ (branch `feat/m3-exercises`)

> Avviato 2026-09-01 dopo MU. Branch: `feat/m3-exercises`. Riferimento: `SPEC.md` §5 (Esercizi) + Appendix A. Catalogo **globale** (`user_id` NULL, curato dall'admin) + esercizi **custom** per-utente; testo libero collegabile a una voce canonica per unificare la progressione. Ordine interno: schema+seed → API → frontend → picker/nav → test.

- [x] **T3.1 — Schema `exercises` + migrazione + seed (Appendix A)**
  - Acceptance: tabella Drizzle `exercises` (`id`, `user_id` NULL=globale, `name`, `muscle_group`, `equipment` enum, `is_custom`, `canonical_exercise_id` self-ref nullable, `created_at`); indici su `user_id` ed `equipment`; migrazione `0002` con seed del catalogo globale (Appendix A, `user_id` NULL)
  - Verify: `npm run db:migrate` ok; test conteggio catalogo di default per `equipment`; `npm run check` verde
  - Files: `src/server/db/schema.ts`, `migrations/0002_*.sql`, `tests/db/exercises.test.ts`

- [x] **T3.2 — API esercizi (list/search/create-custom/link-canonical) + Zod**
  - Acceptance: `GET /api/exercises` (globali + custom dell'utente, filtro `search`/`equipment`); `POST /api/exercises` (crea custom, testo libero, `canonicalExerciseId` opzionale); `PATCH /api/exercises/:id` (link/unlink canonica, solo custom di proprietà); `DELETE /api/exercises/:id` (solo custom di proprietà). Query scoped per `userId`; Zod al confine
  - Verify: test integrazione (anon 401, list globali+custom, create, link, isolamento); `npm run check` verde
  - Files: `src/shared/schemas.ts`, `src/server/db/queries/exercises.ts`, `src/server/routes/exercises.ts`, `src/server/index.ts`, `tests/exercises/api.test.ts`

- [x] **T3.3 — Frontend: API client + hook + pagina Esercizi**
  - Acceptance: client API tipizzato + hook TanStack Query (list con filtri, create, delete); `ExercisesPage` con ricerca, filtro per attrezzatura, badge globale/custom, form creazione a testo libero; stati loading/empty a tema
  - Verify: test render/hook; `npm run check` verde
  - Files: `src/client/lib/api.ts`, `src/client/features/exercises/useExercises.ts`, `ExercisesPage.tsx`, `ExerciseForm.tsx`, `src/client/routes/exercises.tsx`

- [x] **T3.4 — ExercisePicker (riusabile) + nav/rotta**
  - Acceptance: componente `ExercisePicker` (ricerca+selezione dal catalogo, riusabile in M4); voce nav "Schede"→placeholder invariata, nuova voce/rotta Esercizi accessibile; link canonica dalla UI custom
  - Verify: test render picker (seleziona voce); `AppShell` aggiornato; `npm run check` verde
  - Files: `src/client/features/exercises/ExercisePicker.tsx`, `LinkCanonicalDialog.tsx`, `src/client/router.tsx`, `src/client/components/AppShell.tsx`

- [x] **T3.5 — E2E catalogo + isolamento**
  - Acceptance: E2E — ricerca/selezione dal catalogo seed, creazione esercizio a testo libero, link a voce canonica; verifica isolamento custom tra utenti (già in T3.2, ribadito)
  - Verify: `npm test` + `npm run test:e2e` verdi
  - Files: `e2e/exercises.spec.ts`

**Checkpoint M3**: ricerca/selezione da catalogo seed; creazione esercizio a testo libero; link a voce canonica; isolamento custom per utente; `npm run check` + E2E verdi. Chiusura via PR verso `main`.

---

## Allenamenti & resto — da dettagliare al proprio turno

> **Dopo M3.** Granularità alta ora; scomposizione in task al momento dell'implementazione. Catena allenamenti: **M4 → M5**.

- **M4 Schede** — schema `workout_plans/plan_days/plan_exercises`; API CRUD; plan builder UI.
- **M5 Log allenamento** — schema `workout_sessions/session_exercises/session_sets`; API upsert idempotente (`client_id`); UI logging peso variabile per serie.
- **M6 Offline/PWA** — `vite-plugin-pwa` (manifest+SW); Dexie; persistenza TanStack Query; coda mutation offline; sync idempotente + test replay.
- **M7 Progressi & grafici** — calcoli (1RM Epley, volume, max, PR); endpoint aggregazione; grafici bodyweight + per-esercizio.
- **M8 Admin** — route role-gated; gestione catalogo globale; gestione utenti/ruoli; test "admin non legge dati personali".
- **M9 Hardening & deploy** — rate limit (KV), error handling, a11y, E2E completi, coverage gate, migrazioni prod, deploy, verifica install PWA.

---

## Prossimo passo

Prossima implementazione: **M3 — Catalogo esercizi**, a partire da **T3.1** (schema + seed Appendix A). Un task alla volta, TDD dove ha senso, `npm run check` verde prima di procedere; chiusura milestone via PR verso `main`. Poi **M4 Schede → M5 Log**.
