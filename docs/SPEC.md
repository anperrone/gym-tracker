# Spec: Gym Tracker — App per il tracking di misure e allenamenti

> Stato: **APPROVED** (2026-09-01)
> Ultimo aggiornamento: 2026-09-01
> Documento vivo: va aggiornato quando cambiano decisioni o scope, e versionato insieme al codice.

---

## 1. Objective

### Cosa costruiamo e perché
Una **web app (PWA) mobile-first** per il fitness personale che permette a ogni utente di:
1. **Tracciare le misure corporee** nel tempo (peso + circonferenze) con storico e grafici di andamento.
2. **Gestire schede di allenamento strutturate** (esercizi, giorni, serie/ripetizioni/peso target).
3. **Registrare gli allenamenti** sessione per sessione, con **peso variabile per serie**, e visualizzare la **progressione** nel tempo per singolo esercizio.

L'obiettivo primario è supportare l'uso reale **in palestra da smartphone**, anche con connessione scarsa o assente (offline-first), e l'analisi dei progressi da desktop.

### Utenti (personas)
- **Utente standard** — la persona che si allena. Gestisce in autonomia le proprie misure, schede e log. Vede **solo i propri dati**.
- **Admin (tecnico)** — cura il **catalogo esercizi condiviso**, gestisce gli account (lista, ruolo, disabilitazione) e la manutenzione. **Non ha accesso ai dati personali** (misure/allenamenti) degli utenti.

### Come si misura il successo (a livello di prodotto)
- Un utente riesce ad accedere con Google e registrare la prima misurazione in **< 2 minuti**.
- Registrare una serie durante l'allenamento richiede **≤ 3 tap** e funziona **offline**.
- I dati inseriti offline si **sincronizzano automaticamente** e senza duplicati al ritorno online.
- L'utente vede un **grafico di progressione** (peso corporeo e carico per esercizio) senza configurazione.

---

## 2. Tech Stack

Stack **full-stack Cloudflare**, un unico Worker che serve sia l'API sia la SPA.

| Ambito | Scelta | Note |
|---|---|---|
| Linguaggio | **TypeScript** (strict) | Client + server + shared |
| Frontend | **React 19 + Vite** | SPA, mobile-first |
| Integrazione build | **`@cloudflare/vite-plugin`** | Dev server con runtime Workers, build unica |
| Routing client | **TanStack Router** (o React Router) | Type-safe |
| Server state / offline | **TanStack Query** + persistenza IndexedDB | Cache offline + mutation queue |
| Store offline locale | **Dexie (IndexedDB)** | Bozze sessioni + coda di sync |
| UI / stile | **Tailwind CSS** + componenti propri | Mobile-first, touch-friendly |
| Grafici | **Recharts** | Da rivalutare per bundle size (alt: uPlot) |
| Backend | **Hono** su **Cloudflare Workers** | API REST, client tipizzato |
| Validazione | **Zod** | Al confine API + schemi condivisi |
| Database | **Cloudflare D1** (SQLite) | Dati applicativi |
| ORM / migrazioni | **Drizzle ORM** + drizzle-kit | Schema in TS, migrazioni SQL |
| File storage | **Cloudflare R2** | Solo per **foto progressi (fase successiva)** |
| Auth | **OAuth 2.0 Google self-hosted** via **`arctic`** | PKCE + sessioni proprie in D1 |
| PWA / offline | **`vite-plugin-pwa`** (Workbox) | Installabile + service worker |
| Lint / format | **Biome** | Un solo tool, veloce |
| Test unit/integr. | **Vitest** + `@cloudflare/vitest-pool-workers` | Test contro D1 reale (Miniflare) |
| Test E2E | **Playwright** | Flussi critici |
| Deploy | **Wrangler** | `wrangler deploy` |

> Vincolo: nessun servizio a pagamento nel percorso critico. Tutto deve girare sul free tier Cloudflare.

---

## 3. Commands

```bash
# Sviluppo (Vite + runtime Workers + D1 locale)
npm run dev

# Build di produzione
npm run build

# Anteprima build
npm run preview

# Deploy su Cloudflare
npm run deploy

# Database (Drizzle + D1)
npm run db:generate      # genera migrazione SQL da schema Drizzle
npm run db:migrate       # applica migrazioni a D1 (locale)
npm run db:migrate:prod  # applica migrazioni a D1 (produzione)
npm run db:studio        # esplora il DB
npm run db:seed          # seed catalogo esercizi (per attrezzatura) + metriche default

# Qualità
npm run typecheck        # tsc --noEmit (client + server)
npm run lint             # biome lint
npm run format           # biome format --write
npm run validate         # biome check (lint + formatting + organize imports, read-only)
npm run validate:fix     # biome check --write (applica i fix)
npm run check            # typecheck + validate + test (gate CI/precommit)

# Test
npm test                 # vitest (unit + integration)
npm run test:watch
npm run test:coverage
npm run test:e2e         # playwright (pipeline E2E separata)
```

**Runtime & quality gates**
- Node **≥ 26** (`.nvmrc`, `engines.node`).
- **Husky + lint-staged**: hook `pre-commit` che esegue Biome (lint+format, auto-fix sui file staged) e `typecheck`.
- **CI GitHub Actions**: `ci.yml` (esegue `npm run check`) + `e2e.yml` separato (Playwright/Chromium).

---

## 4. Project Structure

```
gym-tracker/
├── src/
│   ├── client/                  → React SPA (frontend)
│   │   ├── features/            → moduli per dominio
│   │   │   ├── auth/
│   │   │   ├── measurements/    → misure corporee + grafici
│   │   │   ├── exercises/       → catalogo esercizi
│   │   │   ├── plans/           → schede (builder)
│   │   │   └── workouts/        → log sessioni + progressione
│   │   ├── components/          → UI condivisa (Button, Chart, ...)
│   │   ├── lib/                 → api client, offline queue, dexie db, hooks
│   │   ├── routes/              → route components
│   │   └── main.tsx
│   ├── server/                  → Cloudflare Worker (Hono)
│   │   ├── routes/              → handler API (measurements, plans, workouts, exercises, admin)
│   │   ├── db/
│   │   │   ├── schema.ts        → schema Drizzle
│   │   │   ├── queries/         → query per dominio (sempre scoped per userId)
│   │   │   └── seed/            → dati seed (catalogo esercizi per attrezzatura, metriche default)
│   │   ├── auth/                → OAuth Google, sessioni, middleware
│   │   ├── middleware/          → auth, error handling, rate limit
│   │   └── index.ts             → entry Worker (Hono + static assets)
│   └── shared/                  → tipi + schemi Zod condivisi client/server
├── migrations/                  → migrazioni SQL D1 (output drizzle-kit)
├── tests/                       → unit + integration (vitest)
├── e2e/                         → Playwright
├── public/                      → icone PWA, manifest, static
├── wrangler.jsonc
├── drizzle.config.ts
├── vite.config.ts
├── biome.json
├── package.json
└── SPEC.md
```

---

## 5. Data Model (D1 / Drizzle)

Tutte le tabelle dati-utente hanno `user_id` e **ogni query è sempre filtrata per l'utente della sessione**. Le entità sincronizzabili offline hanno un `client_id` (UUID generato dal client) per garantire **idempotenza** del sync (upsert su `client_id`).

### Auth
- **`users`** — `id`, `google_sub` (unique), `email`, `name`, `avatar_url`, `role` (`'user' | 'admin'`), `created_at`, `updated_at`
- **`sessions`** — `id` (token hashed), `user_id`, `expires_at`, `created_at` (rinnovo scorrevole; revoca cancellando la riga)

### Misure corporee
- **`measurement_types`** — `id`, `user_id` (NULL = default di sistema), `key`, `label`, `unit`, `precision`, `sort_order`
  Seed default: `weight`(kg), `arm`, `chest`, `waist`, `abdomen`, `hips`, `thigh_prox`, `thigh_mid`, `calf` (cm, 1 decimale). L'utente può aggiungerne di **custom**.
- **`measurement_entries`** — `id`, `user_id`, `measured_at` (data), `notes`, `created_at`, `updated_at`, `client_id`
- **`measurement_values`** — `id`, `entry_id`, `type_id`, `value` (real)
  → una misurazione (data) contiene N valori, uno per metrica.

### Esercizi (catalogo)
- **`exercises`** — `id`, `user_id` (NULL = catalogo globale, curato dall'admin), `name`, `muscle_group`, `equipment` (`'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'cardio' | 'other'`), `is_custom`, `canonical_exercise_id` (nullable → collega un esercizio custom/testo libero a una voce di catalogo per **unificare la progressione**), `created_at`
  - Catalogo **predefinito** organizzato per **attrezzatura** e gruppo muscolare, selezionabile da tutti. Seed iniziale in **Appendix A**.
  - **Testo libero**: l'utente digita un nome non in lista → crea un esercizio custom, poi opzionalmente lo collega a una voce canonica.

### Schede (workout plans)
- **`workout_plans`** — `id`, `user_id`, `name`, `description`, `is_active`, `created_at`, `updated_at`
- **`plan_days`** — `id`, `plan_id`, `name` (es. "Giorno A / Push"), `sort_order`
- **`plan_exercises`** — `id`, `plan_day_id`, `exercise_id`, `sort_order`, `target_sets`, `target_reps` (text, es. "8-12"), `target_weight` (nullable), `rest_seconds` (nullable), `notes`

### Allenamenti svolti (log)
- **`workout_sessions`** — `id`, `user_id`, `plan_day_id` (nullable → allenamento libero), `performed_at`, `duration_seconds` (nullable), `notes`, `status` (`'in_progress' | 'completed'`), `client_id`, `created_at`, `updated_at`
- **`session_exercises`** — `id`, `workout_session_id`, `exercise_id`, `sort_order`
- **`session_sets`** — `id`, `session_exercise_id`, `set_number`, `weight` (real, nullable), `reps` (int, nullable), `notes` (nullable), `completed` (bool)
  → **peso e ripetizioni indipendenti per ogni serie** (supporta piramidali/drop set).

### Metriche derivate (calcolate, non memorizzate)
- Andamento peso corporeo e circonferenze nel tempo.
- Per esercizio: **peso massimo**, **volume totale** (Σ peso×reps), **1RM stimato** (formula di Epley), **PR** (personal record).

---

## 6. Code Style

Un esempio vale più di mille regole. Convenzioni: identificatori in **inglese**, `camelCase` per variabili/funzioni, `PascalCase` per componenti/tipi, file di componenti `PascalCase.tsx`, altri file `kebab-case.ts`. Validazione **sempre** al confine API con Zod. Query **sempre** scoped per `userId`.

```typescript
// src/server/routes/measurements.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createMeasurementSchema } from "../../shared/schemas";
import { requireAuth } from "../middleware/auth";
import { insertMeasurement, listMeasurements } from "../db/queries/measurements";
import type { AppEnv } from "../types";

export const measurements = new Hono<AppEnv>()
  .use(requireAuth)
  .get("/", async (c) => {
    const user = c.get("user"); // sempre dalla sessione, mai dal client
    const rows = await listMeasurements(c.env.DB, user.id);
    return c.json(rows);
  })
  .post("/", zValidator("json", createMeasurementSchema), async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");
    const created = await insertMeasurement(c.env.DB, user.id, input);
    return c.json(created, 201);
  });
```

```tsx
// src/client/features/measurements/WeightChart.tsx
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { fetchWeightSeries } from "@/lib/api";

export function WeightChart() {
  const { data, isPending } = useQuery({
    queryKey: ["measurements", "weight"],
    queryFn: fetchWeightSeries,
  });

  if (isPending) return <ChartSkeleton />;

  return (
    <LineChart width={340} height={200} data={data}>
      <XAxis dataKey="date" />
      <YAxis unit="kg" domain={["dataMin - 1", "dataMax + 1"]} />
      <Tooltip />
      <Line type="monotone" dataKey="weight" strokeWidth={2} dot={false} />
    </LineChart>
  );
}
```

---

## 7. Testing Strategy

| Livello | Strumento | Cosa copre |
|---|---|---|
| Unit | Vitest | Logica pura: calcolo 1RM/volume/PR, merge/sync offline, schemi Zod |
| Integration | Vitest + `@cloudflare/vitest-pool-workers` | Route API contro **D1 reale** (Miniflare), incluse le **regole di autorizzazione** |
| Component | Vitest + React Testing Library (jsdom) | Componenti UI e hook |
| E2E | Playwright | Flussi critici (login mock, misura, scheda, log offline→sync) |

**Requisiti di copertura**
- **≥ 80%** sulla logica di business del server e sui calcoli/validazioni in `shared/`.
- Percorsi **auth/autorizzazione** con test **obbligatori**, in particolare:
  - un utente **non** può leggere/scrivere dati di un altro utente;
  - un **admin non** può leggere i dati personali (misure/allenamenti) degli utenti;
  - il sync offline è **idempotente** (replay dello stesso `client_id` non duplica).

**Flussi E2E minimi**
1. Login Google (mockato) → onboarding.
2. Inserimento misurazione → compare nel grafico e nello storico.
3. Creazione scheda con esercizio da catalogo + uno a testo libero.
4. **Log allenamento offline** (rete disattivata) → riconnessione → sync senza duplicati.

---

## 8. Boundaries

### Always do
- Eseguire `npm run check` (typecheck + validate + test) prima di ogni push; il `pre-commit` (husky + lint-staged) enforce lint/format/typecheck su ogni commit.
- Validare **ogni** input con Zod al confine API.
- **Scopare ogni query per `userId`** preso dalla sessione (mai da input client).
- Usare **migrazioni** per ogni modifica di schema D1.
- Tenere i segreti in **Wrangler secrets / `.dev.vars`** (mai nel repo).
- Cookie di sessione **HttpOnly, Secure, SameSite=Lax**; token di sessione hashati in D1.
- Rispettare mobile-first e accessibilità (target touch ≥ 44px, contrasto AA).

### Ask first (chiedere conferma prima di procedere)
- Aggiungere **nuove dipendenze**.
- Modifiche allo **schema D1** / nuove migrazioni.
- Cambiare il **flusso di auth** o la strategia di **sync/conflict offline**.
- Introdurre un **servizio esterno gestito**.
- Abilitare la **fase foto (R2)**.
- Cambiare libreria grafici o UI framework.

### Never do
- Committare segreti (`.dev.vars`, client secret Google, token).
- Permettere a un utente di accedere ai dati personali di un altro.
- Dare all'admin accesso in lettura ai dati personali (misure/allenamenti) degli utenti.
- Loggare PII o token.
- Disabilitare/saltare test falliti per far passare la CI senza approvazione.
- Memorizzare password (solo Google OAuth).

---

## 9. Roadmap per fasi

### MVP (v0.1) — nucleo utilizzabile
- Login Google (OAuth self-hosted) + sessioni.
- Misure corporee: set predefinito + custom, inserimento, **storico e grafici**.
- Catalogo esercizi con seed (per attrezzatura: macchine, bilanciere, manubri, cavi, corpo libero) + testo libero.
- **Plan builder**: schede strutturate (giorni, esercizi, serie/reps/peso target).
- **Log allenamento** con peso variabile per serie.
- **PWA installabile + logging offline con sync idempotente**.
- Dashboard progressi base (peso corporeo + carico per esercizio).

### v1 — rifinitura
- Grafici avanzati: **1RM stimato**, volume, **PR**, confronto periodi.
- **Timer di recupero** tra le serie.
- **Pannello admin**: gestione catalogo esercizi + utenti/ruoli.
- Export dati **CSV**; eliminazione account (GDPR).

### Fasi successive
- **Foto progressi** (upload R2, private) allegate alle misurazioni.
- Import scheda da **PDF/foto (OCR)**.
- Reminder/notifiche (push).
- Unità imperiali; internazionalizzazione (EN).

---

## 10. Success Criteria (testabili)

- [ ] Un utente accede con Google; senza account viene creato al primo login con ruolo `user`.
- [ ] Un utente inserisce una misurazione con le 9 metriche predefinite e la rivede nello storico e in un grafico.
- [ ] Un utente crea una scheda con almeno un esercizio da catalogo e uno a testo libero.
- [ ] Un utente registra un allenamento con **serie a peso variabile** (es. 60×12, 70×10, 80×8) e i valori sono persistiti.
- [ ] Con la rete disattivata, l'utente registra una sessione completa; riconnettendosi i dati si sincronizzano **senza duplicati**.
- [ ] Il grafico di progressione di un esercizio mostra l'andamento del carico nel tempo.
- [ ] Un utente A **non** può leggere i dati dell'utente B (verificato a livello API).
- [ ] Un admin **non** può leggere misure/allenamenti di un utente (verificato a livello API); può gestire il catalogo esercizi globale.
- [ ] L'app è installabile come PWA su iOS e Android (manifest + service worker validi).
- [ ] `npm run check` passa (typecheck + lint + test) e la copertura rispetta le soglie.

---

## 11. Open Questions (da chiarire, non bloccanti)

1. **Grafici MVP**: quali esattamente al lancio? (proposta: peso corporeo nel tempo + carico max/volume per esercizio selezionato). 1RM stimato in v1.
2. **Timer di recupero**: MVP o v1? (proposta: v1).
3. **Seed catalogo esercizi**: la lista base per attrezzatura è in **Appendix A**. Da rifinire con gli esercizi/macchine effettivamente presenti nella tua palestra (mandami foto o l'elenco quando vuoi).
4. **Reminder/notifiche**: interessano? (proposta: fase successiva).
5. **Export/GDPR**: export CSV e cancellazione account in v1 sono ok?
6. **Lingua**: solo italiano per l'MVP? (assunto: sì).
7. **Unità**: solo metrico (kg/cm)? (assunto: sì).
8. **Onboarding admin**: come si nomina il primo admin? (proposta: allowlist di email in configurazione / promozione manuale via seed).

---

## 12. Prossimo passo

Dopo l'**approvazione** di questo spec si passa alla **Fase 2 — Plan** (piano tecnico di implementazione), poi **Tasks** e **Implement**.

---

## Appendix A — Seed catalogo esercizi (per attrezzatura)

Catalogo base neutro (marchio-agnostico) per il seed iniziale, organizzato per `equipment` e gruppo muscolare. È una base ragionevole per l'MVP, da estendere/rifinire con gli esercizi realmente usati. Le **panche** non sono esercizi a sé: l'inclinazione (piana / inclinata / declinata) è parte del nome dell'esercizio con bilanciere o manubri.

### Macchine (`equipment = 'machine'`)

| Esercizio | Gruppo muscolare |
|---|---|
| Leg Press | Quadricipiti / Glutei |
| Hack Squat | Quadricipiti / Glutei |
| Leg Extension | Quadricipiti |
| Leg Curl (seduto / sdraiato) | Femorali |
| Calf Raise (macchina) | Polpacci |
| Hip Abduction (abduttori) | Abduttori / Glutei |
| Hip Adduction (adduttori) | Adduttori |
| Chest Press | Pettorali |
| Pectoral / Pec Deck | Pettorali |
| Shoulder Press | Spalle |
| Reverse Fly (macchina) | Deltoidi posteriori |
| Lat Machine / Lat Pulldown | Dorsali |
| Vertical Traction | Dorsali |
| Seated Row (pulley) | Dorsali / Schiena |
| Biceps Curl (macchina) | Bicipiti |
| Triceps Extension (macchina) | Tricipiti |
| Back Extension (lombare) | Lombari |
| Abdominal Crunch (macchina) | Addominali / Core |

### Bilanciere (`equipment = 'barbell'`)

| Esercizio | Gruppo muscolare |
|---|---|
| Squat | Quadricipiti / Glutei |
| Front Squat | Quadricipiti |
| Stacco da terra (Deadlift) | Catena posteriore / Schiena |
| Stacco rumeno (Romanian Deadlift) | Femorali / Glutei |
| Hip Thrust | Glutei |
| Affondi con bilanciere | Quadricipiti / Glutei |
| Panca piana | Pettorali |
| Panca inclinata | Pettorali alti |
| Panca declinata | Pettorali bassi |
| Military Press / Lento avanti | Spalle |
| Rematore con bilanciere | Dorsali |
| Curl con bilanciere | Bicipiti |
| French Press / Skull Crusher | Tricipiti |

### Manubri (`equipment = 'dumbbell'`)

| Esercizio | Gruppo muscolare |
|---|---|
| Panca piana con manubri | Pettorali |
| Panca inclinata con manubri | Pettorali alti |
| Croci su panca | Pettorali |
| Lento avanti con manubri | Spalle |
| Alzate laterali | Deltoidi laterali |
| Alzate frontali | Deltoidi anteriori |
| Rematore con manubrio (1 braccio) | Dorsali |
| Curl con manubri | Bicipiti |
| Curl a martello (Hammer) | Bicipiti / Brachiale |
| French press con manubrio | Tricipiti |
| Affondi con manubri | Quadricipiti / Glutei |
| Stacco rumeno con manubri | Femorali / Glutei |

### Cavi (`equipment = 'cable'`)

| Esercizio | Gruppo muscolare |
|---|---|
| Croci ai cavi (Cable Crossover) | Pettorali |
| Lat pulldown ai cavi | Dorsali |
| Pulley basso (Cable Row) | Dorsali / Schiena |
| Face Pull | Deltoidi posteriori |
| Pushdown ai cavi | Tricipiti |
| Curl ai cavi | Bicipiti |
| Crunch ai cavi | Addominali / Core |

### Corpo libero (`equipment = 'bodyweight'`)

| Esercizio | Gruppo muscolare |
|---|---|
| Trazioni (Pull-up) | Dorsali |
| Trazioni presa inversa (Chin-up) | Dorsali / Bicipiti |
| Dip alle parallele | Pettorali / Tricipiti |
| Piegamenti (Push-up) | Pettorali |
| Squat a corpo libero | Quadricipiti / Glutei |
| Affondi | Quadricipiti / Glutei |
| Hyperextension | Lombari |
| Plank | Core |
| Crunch | Addominali |
| Calf Raise a corpo libero | Polpacci |

> Catalogo iniziale indicativo, non esaustivo. L'utente può sempre aggiungere esercizi a **testo libero** e collegarli a una voce canonica per unificare i grafici di progressione. L'admin può estendere il catalogo globale.
