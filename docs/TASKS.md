# Tasks: Gym Tracker

> Fase 3 del workflow spec-driven. Riferimenti: `SPEC.md` (APPROVED), `PLAN.md` (APPROVED), `SPEC-ui-redesign.md`.
> Stato: **APPROVED** (2026-09-01) — implementazione in corso. **Ripriorizzato 2026-09-01**: fatti M0/M1/M2/**MU**/**M3**/**M4**/**M5**/**M6**; in corso **M7 (Progressi & grafici)**, poi M8.

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

## M4 — Schede (workout plans) ✅ (branch `feat/m4-plans`)

> Avviato 2026-09-01 dopo M3. Branch: `feat/m4-plans`. Riferimento: `SPEC.md` §5 (Schede). Una scheda ha N **giorni** (es. "Giorno A / Push"), ogni giorno ha N **esercizi** con target (serie, reps come testo "8-12", peso/rest/note opzionali). Esercizi dal catalogo (globali+custom) via `ExercisePicker` (M3) + testo libero. Tutto scoped per `userId`. Ordine interno: schema → API plans → API giorni/esercizi → frontend lista → plan builder → E2E.

- [x] **T4.1 — Schema `workout_plans`/`plan_days`/`plan_exercises` + migrazione + test**
  - Acceptance: tabelle Drizzle con FK cascade (`plan_days`→`workout_plans`, `plan_exercises`→`plan_days` + `exercises`); indici per parent; `target_reps` text, `target_weight`/`rest_seconds`/`notes` nullable; migrazione `0003`
  - Verify: `npm run db:migrate` ok; test insert/cascade; `npm run check` verde
  - Files: `src/server/db/schema.ts`, `migrations/0003_*.sql`, `tests/db/plans.test.ts`

- [x] **T4.2 — API schede: CRUD plan + detail + Zod (scoped userId)**
  - Acceptance: `GET /api/plans` (lista), `POST /api/plans` (crea), `GET /api/plans/:id` (dettaglio: giorni+esercizi annidati), `PATCH /api/plans/:id` (name/description/isActive), `DELETE /api/plans/:id`. Ownership verificata su ogni op; Zod al confine
  - Verify: test integrazione (anon 401, CRUD, isolamento tra utenti); `npm run check` verde
  - Files: `src/shared/schemas.ts`, `src/server/db/queries/plans.ts`, `src/server/routes/plans.ts`, `src/server/index.ts`, `tests/plans/api.test.ts`

- [x] **T4.3 — API giorni & esercizi della scheda (nested CRUD + reorder)**
  - Acceptance: `POST/PATCH/DELETE /api/plans/:id/days[/:dayId]`; `POST/PATCH/DELETE .../days/:dayId/exercises[/:peId]` con target (`targetSets`, `targetReps`, `targetWeight?`, `restSeconds?`, `notes?`); `exerciseId` deve essere visibile all'utente (globale o custom proprio); ownership della scheda su ogni op
  - Verify: test integrazione (add/reorder/remove, validazione exerciseId, isolamento); `npm run check` verde
  - Files: `src/shared/schemas.ts`, `src/server/db/queries/plans.ts`, `src/server/routes/plans.ts`, `tests/plans/api.test.ts`

- [x] **T4.4 — Frontend: lista schede + hook + rotta/nav**
  - Acceptance: client API + hook TanStack Query (list/create/delete plan); `PlansPage` (lista schede con badge attiva, crea/elimina); voce nav "Schede" attivata + rotta `/plans`
  - Verify: test render/hook; `npm run check` verde
  - Files: `src/client/lib/api.ts`, `src/client/features/plans/usePlans.ts`, `PlansPage.tsx`, `src/client/routes/plans.tsx`, `src/client/components/AppShell.tsx`, `src/client/router.tsx`

- [x] **T4.5 — Plan builder UI (giorni, esercizi via picker + testo libero, target)**
  - Acceptance: `PlanDetailPage` — aggiungi/rinomina/elimina giorni; aggiungi esercizi via `ExercisePicker` (+ crea custom a testo libero inline); modifica target (serie/reps/peso/rest/note); rimuovi/riordina; stati loading/empty a tema
  - Verify: test render builder; `npm run check` verde
  - Files: `src/client/features/plans/PlanDetailPage.tsx`, `PlanDayEditor.tsx`, `PlanExerciseRow.tsx`, `usePlanDetail.ts`, `src/client/router.tsx`

- [x] **T4.6 — E2E scheda**
  - Acceptance: E2E — crea scheda, aggiungi giorno, aggiungi esercizio dal catalogo con target serie/reps, verifica persistenza; isolamento tra utenti
  - Verify: `npm test` + `npm run test:e2e` verdi
  - Files: `e2e/plans.spec.ts`

**Checkpoint M4**: creazione scheda con giorni ed esercizi (catalogo + testo libero) e target serie/reps; isolamento per utente; `npm run check` + E2E verdi. Chiusura via PR verso `main`.

---

## M5 — Log allenamento ✅ (branch `feat/m5-workouts`)

> Avviato 2026-09-01 dopo M4. Branch: `feat/m5-workouts`. Riferimento: `SPEC.md` §5 (Allenamenti svolti). Una sessione ha N esercizi, ogni esercizio N **serie** con **peso e reps indipendenti** (piramidali/drop set). `client_id` per idempotenza (replay/offline). Avvio libero o da un giorno di scheda (pre-popola gli esercizi). Ripresa sessione `in_progress`. Ordine: schema → API sessione → API esercizi/serie → frontend avvio/lista → UI logging → E2E.

- [x] **T5.1 — Schema `workout_sessions`/`session_exercises`/`session_sets` + migrazione + test**
  - Acceptance: tabelle Drizzle con FK cascade; `workout_sessions` (`plan_day_id` nullable, `status` in_progress/completed, `client_id`, `performed_at`, `duration_seconds`, `notes`); `session_sets` (`weight` real/nullable, `reps` int/nullable, `completed` bool, `set_number`); indici per parent + (`user_id`,`client_id`); migrazione `0004`
  - Verify: `npm run db:migrate` ok; test insert/cascade + serie a peso variabile; `npm run check` verde
  - Files: `src/server/db/schema.ts`, `migrations/0004_*.sql`, `tests/db/workouts.test.ts`

- [x] **T5.2 — API sessione: start idempotente + detail/list/complete/delete + Zod**
  - Acceptance: `POST /api/sessions` (idempotente per `userId`+`clientId`; opzionale `planDayId` → pre-popola esercizi dal giorno scheda); `GET /api/sessions` (lista, stato); `GET /api/sessions/:id` (dettaglio annidato: esercizi+serie); `PATCH /api/sessions/:id` (status `completed`, note, durata); `DELETE`. Ownership per op; Zod al confine
  - Verify: test integrazione (anon 401, idempotenza replay `clientId`, pre-popolazione da scheda, isolamento); `npm run check` verde
  - Files: `src/shared/schemas.ts`, `src/server/db/queries/workouts.ts`, `src/server/routes/sessions.ts`, `src/server/index.ts`, `tests/workouts/api.test.ts`

- [x] **T5.3 — API esercizi & serie della sessione (nested CRUD)**
  - Acceptance: `POST/DELETE /api/sessions/:id/exercises[/:seId]` (aggiungi esercizio visibile, rimuovi); `POST/PATCH/DELETE .../exercises/:seId/sets[/:setId]` con `weight`/`reps`/`completed`/`notes` **indipendenti per serie**; ownership della sessione su ogni op; le mutation annidate ritornano il dettaglio aggiornato
  - Verify: test integrazione (serie a peso variabile 60×12/70×10/80×8, completa serie, isolamento); `npm run check` verde
  - Files: `src/shared/schemas.ts`, `src/server/db/queries/workouts.ts`, `src/server/routes/sessions.ts`, `tests/workouts/api.test.ts`

- [x] **T5.4 — Frontend: avvio/lista sessioni + hook + rotta/nav "Allena"**
  - Acceptance: client API + hook TanStack Query (list/start/detail/complete/delete); `WorkoutPage` (avvia sessione libera o da giorno scheda, riprendi `in_progress`, storico completate); voce nav "Allena" attivata + rotta `/workout`
  - Verify: test render/hook; `npm run check` verde
  - Files: `src/client/lib/api.ts`, `src/client/features/workouts/useWorkouts.ts`, `WorkoutPage.tsx`, `src/client/routes/workout.tsx`, `src/client/components/AppShell.tsx`, `src/client/router.tsx`

- [x] **T5.5 — UI logging sessione (serie a peso variabile) + ripresa**
  - Acceptance: `WorkoutSessionPage` — aggiungi esercizi via `ExercisePicker`, aggiungi/modifica serie (peso, reps, completata) con ≤ pochi tap, quick-repeat serie; completa sessione; ripresa `in_progress`; stati loading/empty a tema
  - Verify: test render logging; `npm run check` verde
  - Files: `src/client/features/workouts/WorkoutSessionPage.tsx`, `SessionExerciseCard.tsx`, `SetRow.tsx`, `useWorkoutSession.ts`, `src/client/router.tsx`

- [x] **T5.6 — E2E log allenamento**
  - Acceptance: E2E — avvia sessione, aggiungi esercizio, registra serie a peso variabile (60×12, 70×10, 80×8), completa; ricarica e verifica persistenza + ripresa `in_progress`
  - Verify: `npm test` + `npm run test:e2e` verdi
  - Files: `e2e/workouts.spec.ts`

**Checkpoint M5**: log sessione con serie a peso variabile persistito; ripresa `in_progress`; idempotenza `clientId`; isolamento per utente; `npm run check` + E2E verdi. Chiusura via PR verso `main`.

---

## M6 — Offline/PWA ✅ (branch `feat/m6-offline`)

> Avviato 2026-09-01 dopo M5. Branch: `feat/m6-offline`. Riferimento: `SPEC.md` §3/§4 (offline-first) e criteri: *registrare una serie funziona offline; i dati offline si sincronizzano senza duplicati al ritorno online; app installabile*. **Scelta architetturale**: si usa la **persistenza nativa di TanStack Query su IndexedDB** (letture offline) al posto di un layer Dexie separato — più semplice e idiomatico; l'idempotenza dello start sessione è garantita dal `client_id` (indice UNIQUE, M5). **Scope coda mutation**: le mutation offline vanno in pausa in memoria e si **sincronizzano automaticamente alla riconnessione mentre l'app è aperta** (con optimistic update per il logging serie); non vengono persistite su IndexedDB (dopo un reload non sarebbero rieseguibili senza `mutationFn`) — una coda cross-restart è un'estensione futura. La cache persistita viene **svuotata al logout** (isolamento su dispositivo condiviso).

- [x] **T6.1 — PWA installabile (`vite-plugin-pwa` + manifest + SW)**
  - Acceptance: `vite-plugin-pwa` (Workbox) con `registerType: autoUpdate`; `manifest.webmanifest` (nome, tema, icone 192/512, `display: standalone`); precache app shell; registrazione SW in `main.tsx`; icone in `public/`
  - Verify: `npm run build` emette `sw.js` + `manifest.webmanifest`; test unit su presenza manifest/config; `npm run check` verde
  - Files: `vite.config.ts`, `src/client/main.tsx`, `public/` (icone), `src/client/pwa.ts`, test

- [x] **T6.2 — Persistenza query client su IndexedDB (letture offline)**
  - Acceptance: `PersistQueryClientProvider` con persister IndexedDB (`idb-keyval`); `gcTime` adeguato; le query già caricate sopravvivono a reload/offline; `resumePausedMutations` al restore
  - Verify: unit sul persister (round-trip); `npm run check` verde
  - Files: `src/client/lib/query.tsx`, `src/client/lib/idbPersister.ts`, test

- [x] **T6.3 — Coda mutation offline + optimistic sync (logging)**
  - Acceptance: le mutation offline vanno in **pausa** e si riprendono automaticamente al ritorno online; **optimistic update** per il logging serie (addSet/updateSet/deleteSet) così l'inserimento offline è immediato; rollback su errore; idempotenza al replay via `client_id`
  - Verify: unit sull'applicazione optimistic al detail cache; `npm run check` verde
  - Files: `src/client/features/workouts/useWorkoutSession.ts`, `src/client/lib/optimistic.ts`, test

- [x] **T6.4 — Test idempotenza sync (replay)**
  - Acceptance: integrazione — replay dello stesso `client_id` (start sessione) e delle mutation non duplica; unit sulla logica di coda/merge
  - Verify: `npm test` verde
  - Files: `tests/workouts/sync.test.ts`

- [x] **T6.5 — E2E offline→sync + install**
  - Acceptance: E2E — `context.setOffline(true)`, registra/aggiorna una serie offline (UI ottimistica), riconnessione → sync automatico senza duplicati; app carica offline dalla cache; manifest/SW presenti
  - Verify: `npm run test:e2e` verde
  - Files: `e2e/offline.spec.ts`

**Checkpoint M6**: log offline → riconnessione → sync senza duplicati; app installabile (manifest+SW validi); `npm run check` + E2E verdi. Chiusura via PR verso `main`.

---

## M7 — Progressi & grafici (priorità corrente)

> Avviato 2026-09-01 dopo M6. Branch: `feat/m7-progress`. Riferimento: `SPEC.md` §5 (Metriche derivate) e criteri: *grafico di progressione (peso corporeo e carico per esercizio) senza configurazione*. Dipende da M2 (misure) + M5 (log). Metriche derivate dalle serie: **peso massimo**, **volume** (Σ peso×reps), **1RM stimato** (Epley), **PR**. Aggregazione per esercizio nel tempo (per sessione). Grafico peso corporeo riusa la serie misure (M2).

- [ ] **T7.1 — Calcoli puri (Epley 1RM, volume) in shared + test**
  - Acceptance: `epley1RM(weight, reps)` = `weight·(1+reps/30)`, helper volume/arrotondamento; funzioni pure testabili (client+server)
  - Verify: unit su 1RM (reps=1 → weight), volume; `npm run check` verde
  - Files: `src/shared/calc.ts`, `src/shared/calc.test.ts`

- [ ] **T7.2 — API progressi: lista esercizi loggati + serie per esercizio (aggregazione) + Zod**
  - Acceptance: `GET /api/progress/exercises` (esercizi con dati loggati: nome, #sessioni, peso max, 1RM best, ultima data); `GET /api/progress/exercises/:exerciseId` (serie per sessione: data, peso max, volume, 1RM best). Scoped per `userId`; solo serie con peso+reps
  - Verify: test integrazione (aggregazione, PR/max, isolamento, anon 401); `npm run check` verde
  - Files: `src/shared/schemas.ts`, `src/server/db/queries/progress.ts`, `src/server/routes/progress.ts`, `src/server/index.ts`, `tests/progress/api.test.ts`

- [ ] **T7.3 — Frontend: pagina Progressi (selettore esercizio + metrica + grafico)**
  - Acceptance: client API + hook; `ProgressPage` con selettore esercizio, toggle metrica (peso max / 1RM / volume), grafico progressione (Recharts lazy, a tema); stati loading/empty; nav "Progressi" attivata + rotta `/progress`
  - Verify: test render; `npm run check` verde
  - Files: `src/client/lib/api.ts`, `src/client/features/progress/useProgress.ts`, `ProgressPage.tsx`, `ProgressChart.tsx`, `src/client/routes/progress.tsx`, `src/client/components/AppShell.tsx`, `src/client/router.tsx`

- [ ] **T7.4 — Andamento peso corporeo sulla pagina Progressi**
  - Acceptance: sezione peso corporeo che riusa la serie misure (M2, `mt_weight`) con `MeasurementChart`; stato vuoto a tema
  - Verify: test render; `npm run check` verde
  - Files: `src/client/features/progress/ProgressPage.tsx`

- [ ] **T7.5 — E2E progressi**
  - Acceptance: E2E — log di una sessione con serie → pagina Progressi mostra l'esercizio e il grafico di progressione; isolamento
  - Verify: `npm run test:e2e` verde
  - Files: `e2e/progress.spec.ts`

**Checkpoint M7**: grafico progressione carico per esercizio; andamento peso corporeo; `npm run check` + E2E verdi. Chiusura via PR verso `main`.

---

## Resto — da dettagliare al proprio turno

> **Dopo M7.** Granularità alta ora; scomposizione in task al momento dell'implementazione.
- **M8 Admin** — route role-gated; gestione catalogo globale; gestione utenti/ruoli; test "admin non legge dati personali".
- **M9 Hardening & deploy** — rate limit (KV), error handling, a11y, E2E completi, coverage gate, migrazioni prod, deploy, verifica install PWA.

---

## Prossimo passo

Prossima implementazione: **M7 — Progressi & grafici**, a partire da **T7.1** (calcoli puri). Un task alla volta, `npm run check` verde prima di procedere; chiusura milestone via PR verso `main`. Poi **M8 Admin**.
