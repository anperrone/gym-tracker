# Plan tecnico: Gym Tracker

> Fase 2 del workflow spec-driven. Riferimento: `SPEC.md` (APPROVED 2026-09-01).
> Stato: **APPROVED** (2026-09-01)

Questo piano definisce **componenti**, **ordine di implementazione**, **rischi**, **cosa si parallelizza** e **checkpoint di verifica**. Dopo l'approvazione si passa alla Fase 3 (Tasks).

---

## 1. Componenti principali e dipendenze

```
                 ┌─────────────────────────┐
                 │  M0 Foundation / scaffold│  (blocca tutto)
                 └───────────┬─────────────┘
                             │
                 ┌───────────▼─────────────┐
                 │  M1 Auth (Google + sess) │  (blocca tutte le feature user-scoped)
                 └───────┬─────────┬────────┘
              ┌──────────┘         └──────────┐
     ┌────────▼────────┐            ┌──────────▼─────────┐
     │ M2 Misure       │            │ M3 Catalogo eserc. │
     │ (indipendente)  │            └───────┬─────────────┘
     └────────┬────────┘                    │
              │                    ┌─────────▼─────────┐
              │                    │ M4 Schede (plans) │
              │                    └─────────┬─────────┘
              │                    ┌─────────▼─────────┐
              │                    │ M5 Log allenamento│
              │                    └─────────┬─────────┘
              │            ┌─────────────────┼──────────────┐
     ┌────────▼────────────▼───┐   ┌─────────▼───────┐  ┌───▼──────────┐
     │ M7 Progressi & grafici  │   │ M6 Offline/PWA  │  │ M8 Admin     │
     └─────────────────────────┘   └─────────────────┘  └──────────────┘
                             │
                 ┌───────────▼─────────────┐
                 │ M9 Hardening & deploy    │
                 └─────────────────────────┘
```

| Componente | Descrizione | Dipende da |
|---|---|---|
| **M0 Foundation** | Scaffold monorepo (client/server/shared), Vite + `@cloudflare/vite-plugin`, Hono, wrangler.jsonc, D1 binding, Drizzle, Biome, Tailwind, Vitest + pool-workers, Playwright skeleton, CI | — |
| **M1 Auth** | Schema `users`/`sessions`, OAuth Google (`arctic` + PKCE), route login/callback/logout, middleware `requireAuth`, session cookie, contesto auth frontend, allowlist primo admin | M0 |
| **M2 Misure** | Schema `measurement_types/entries/values`, seed metriche default, API CRUD scoped, form inserimento, storico, grafici | M1 |
| **M3 Catalogo esercizi** | Schema `exercises`, seed (Appendix A), API list/search/create-custom/link-canonical, distinzione globale/custom | M1 |
| **M4 Schede** | Schema `workout_plans/plan_days/plan_exercises`, API CRUD, plan builder UI | M3 |
| **M5 Log allenamento** | Schema `workout_sessions/session_exercises/session_sets`, API upsert idempotente per `client_id`, UI logging con peso variabile per serie | M4 |
| **M6 Offline/PWA** | `vite-plugin-pwa` (manifest + SW), store Dexie, persistenza TanStack Query, coda mutation offline, sync idempotente | M5 (path critico) |
| **M7 Progressi & grafici** | Calcoli derivati (1RM Epley, volume, max, PR), endpoint aggregazione, grafici bodyweight + per-esercizio | M2 + M5 |
| **M8 Admin** | Route role-gated, gestione catalogo globale, gestione utenti/ruoli, **test autorizzazione** (admin non legge dati personali) | M1 + M3 |
| **M9 Hardening & deploy** | Rate limit, error handling, a11y, E2E completi, coverage gate, migrazioni D1 prod, deploy, verifica install PWA | tutti |

---

## 2. Ordine di implementazione

1. **M0 → M1** in sequenza (fondamenta obbligatorie).
2. Poi **M2** e **M3** in **parallelo** (indipendenti tra loro).
3. **M4 → M5** in sequenza dopo M3.
4. **M6**, **M7**, **M8** dopo M5 (M8 può iniziare già dopo M3).
5. **M9** in chiusura, con hardening continuo lungo il percorso.

**Principio trasversale**: ogni milestone segue TDD (test prima) su logica di business e autorizzazione, e implementazione incrementale (≤ ~5 file per task).

---

## 3. Cosa si parallelizza vs cosa è sequenziale

| Sequenziale (dipendenze forti) | Parallelizzabile |
|---|---|
| M0 → M1 (tutto parte da qui) | M2 ∥ M3 (dopo M1) |
| M3 → M4 → M5 (catena schede→log) | M8 può partire dopo M3, in parallelo a M4/M5 |
| M6 hardening dopo path online M5 | M7 dopo che M2+M5 producono dati |

> Nota: lavorando da soli, l'ordine resta lineare; la colonna "parallelizzabile" indica dove *non* c'è dipendenza, utile se si aggiungono più esecutori o per riordinare le priorità.

---

## 4. Rischi e mitigazioni

| # | Rischio | Impatto | Mitigazione |
|---|---|---|---|
| R1 | **Sync offline non idempotente / conflitti** (duplicati al replay) | Alto | `client_id` UUID su sessioni/set → **upsert idempotente**; log append-only per utente; last-write-wins su `updated_at`; **test di integrazione** che replicano lo stesso `client_id` e verificano zero duplicati |
| R2 | **OAuth su Workers** (PKCE, cookie SameSite, redirect URI localhost vs prod) | Alto | `arctic` (libreria collaudata); redirect URI documentati per dev/prod; segreti in `.dev.vars`/Wrangler secrets; **mock Google in E2E** |
| R3 | **Limiti D1/SQLite** (no transazioni lunghe, batch) | Medio | Query semplici, `drizzle` batch per scritture multiple, niente operazioni cross-request; indici su `user_id`+date |
| R4 | **Bundle size PWA** (Recharts pesante su mobile) | Medio | Misurare bundle; lazy-load dei grafici; fallback a **uPlot** se oltre budget |
| R5 | **Complessità grafici progressione** | Medio | MVP con grafici semplici (linea peso + carico per esercizio); metriche avanzate (1RM/PR) in v1 |
| R6 | **Isolamento dati** (leak tra utenti / admin che vede dati personali) | Alto | Ogni query scoped per `userId` da sessione; **test di autorizzazione obbligatori**; middleware che nega di default |
| R7 | **UX logging in palestra** (troppi tap, tastiera numerica) | Medio | Prototipo early del flusso set; input numerici, quick-repeat serie, ≤ 3 tap per serie |

---

## 5. Decisioni tecniche da fissare in M0 (Ask-first)

Decisioni confermate all'approvazione del piano (2026-09-01):
- **Sessioni**: tabella `sessions` in **D1** ✅ (single store, revoca semplice).
- **Router client**: **TanStack Router** ✅ (type-safe, si integra con TanStack Query).
- **Grafici**: **Recharts** ✅ con budget bundle; fallback uPlot se oltre budget.
- **Primo admin**: **allowlist email** in config ✅ (l'email in allowlist diventa `admin` al primo login).
- **Rate limiting**: middleware base in **M9** (KV counter); non necessario nell'MVP iniziale.

---

## 6. Checkpoint di verifica (gate per milestone)

Ogni milestone è "done" solo se `npm run check` è verde **e** i criteri sotto passano.

| Milestone | Verifica |
|---|---|
| **M0** | `npm run dev` avvia Worker+SPA; `npm run build` ok; D1 locale migra; CI verde su repo vuoto |
| **M1** | Login Google reale in dev crea utente `user`; sessione persistente; `requireAuth` blocca anonimi (test); logout invalida sessione |
| **M2** | Inserimento misurazione con 9 metriche default → visibile in storico + grafico; utente A non vede dati di B (test) |
| **M3** | Ricerca/selezione da catalogo seed; creazione esercizio a testo libero; link a voce canonica |
| **M4** | Creazione scheda con esercizi da catalogo + testo libero; giorni e target serie/reps |
| **M5** | Log sessione con **serie a peso variabile** (60×12, 70×10, 80×8) persistito; ripresa sessione `in_progress` |
| **M6** | Log completo **offline** → riconnessione → sync **senza duplicati** (E2E); app installabile PWA (manifest+SW validi) |
| **M7** | Grafico progressione carico per esercizio; andamento peso corporeo |
| **M8** | Admin gestisce catalogo globale; **admin NON legge** misure/allenamenti utente (test); gestione ruoli |
| **M9** | E2E completi verdi; coverage ≥ soglie SPEC; deploy prod ok; install PWA verificata su iOS/Android |

---

## 7. Prossimo passo

Dopo l'**approvazione** di questo piano si passa alla **Fase 3 — Tasks**: scomposizione di ogni milestone in task discreti (≤ ~5 file, criteri di accettazione e verifica espliciti, ordinati per dipendenza), a partire da **M0** e **M1**.
