# Spec: UI Redesign — grafica moderna "fit-tracking" + fix grafici

> Feature spec derivata da `docs/SPEC.md` (master). Riguarda **solo la grafica** delle
> schermate reali attuali e la **correttezza dei grafici**. Nessuna modifica a API, schema
> DB, autenticazione o modello dati.

## 0. Decisioni di design (proposte — dimmi se cambiare)

Queste sono le scelte che guidano lo spec. Sono **proposte**: se una non ti convince, la
cambiamo prima di implementare.

| # | Tema | Proposta |
|---|---|---|
| D1 | **Direzione visiva** | Dark-first, pulita, "atletica": card arrotondate, gerarchia forte, numeri grandi (stat tiles), micro-dettagli con stile. Riferimenti: Whoop / Hevy / Apple Fitness. |
| D2 | **Colore accento** | Verde "energia" (**emerald**, `#10b981` famiglia) come firma per CTA, linea grafico e progressi. Alternative in un attimo: arancio (Strava) o violetto elettrico. |
| D3 | **Tema chiaro/scuro** | **Entrambi**: default dal sistema (`prefers-color-scheme`) + **toggle** manuale persistito. Design pensato dark-first ma pienamente leggibile in light. |
| D4 | **Scope** | Restyle delle schermate reali (AppShell/nav, Login, pagina Misure: overview + form + grafico + storico) **+ fix grafici**. Le voci nav placeholder (Schede/Allena/Progressi) restano disabilitate. Nessuna nuova rotta. |
| D5 | **Grafici** | Linea pulita **arricchita con misura**: area con gradiente accento, ultimo punto evidenziato, tooltip a tema, riferimenti min/max discreti. Niente over-engineering. |
| D6 | **Delta misure** | Le variazioni (Δ vs misura precedente) si mostrano con freccia direzionale e colore **neutro/muted**, **non** verde=buono/rosso=cattivo (per il corpo "in giù" non è universalmente positivo). |

---

## 1. Objective

### Cosa costruiamo e perché
Rinnovare l'aspetto dell'app da "funzionale spartano" (slate + linea monocroma) a una
grafica **moderna, pulita e con stile**, tipica delle app di fitness tracking, e **risolvere
il bug di rendering dei grafici** (asse Y tagliato). L'obiettivo è aumentare la piacevolezza
d'uso e la leggibilità dei progressi, senza toccare la logica di dominio.

### Utenti target
Utente singolo che registra le proprie misure corporee da mobile (PWA), vuole vedere a colpo
d'occhio lo stato attuale e l'andamento nel tempo.

### Come si misura il successo
- I grafici mostrano **l'asse Y completo** (etichette mai tagliate) su mobile e desktop.
- L'app ha un'identità visiva coerente (token di tema unici, non colori sparsi).
- Leggibilità AA (contrasto) in **entrambi** i temi.
- Nessuna regressione funzionale: `npm run check` e la E2E restano verdi.
- Bundle non peggiora in modo sensibile (Recharts resta lazy-loaded).

---

## 2. Tech Stack (invariato)
React 19 + Vite (PWA) · Tailwind v4 · Recharts (già presente, lazy) · TanStack Router/Query.
**Nessuna** nuova dipendenza UI pesante (no component library) senza conferma. Icone: set
**SVG inline** leggero (sostituisce le emoji della nav) — self-contained, tema-aware.

---

## 3. Commands (invariati)
```bash
npm run dev          # sviluppo
npm run check        # typecheck + biome + test (gate)
npm test             # unit/integrazione
npm run test:e2e     # Playwright
```

---

## 4. Design System (nuovo)

### 4.1 Token di tema (Tailwind v4 `@theme` + variabili CSS)
Definiti **una sola volta** in `src/client/index.css`. Toggle via `data-theme` sul `<html>`
(default = sistema). Nessun colore hex sparso nei componenti: si usano i token.

Token semantici (nomi indicativi):
`--color-bg`, `--color-surface`, `--color-surface-2`, `--color-border`,
`--color-text`, `--color-text-muted`, `--color-accent`, `--color-accent-fg`,
`--color-positive`, `--color-negative`, `--color-chart-line`, `--color-chart-area`.

Palette proposta (da validare a AA in implementazione):

| Token | Dark | Light |
|---|---|---|
| bg | `#0b0f14` | `#f6f7f9` |
| surface | `#11161d` | `#ffffff` |
| surface-2 | `#171e27` | `#f0f2f5` |
| border | `#232c38` | `#e5e8ec` |
| text | `#e6edf3` | `#0f172a` |
| text-muted | `#8b96a5` | `#64748b` |
| accent | `#34d399` | `#059669` |
| accent-fg | `#07130d` | `#ffffff` |
| positive | `#34d399` | `#059669` |
| negative | `#f87171` | `#dc2626` |

> Nota: i colori dei **grafici** verranno validati con il metodo della skill `dataviz`
> (contrasto, leggibilità in entrambi i temi) in fase di implementazione.

### 4.2 Tipografia & forma
- Font: **system stack** (zero costo/offline) + `font-variant-numeric: tabular-nums` sui
  valori numerici (allineamento stat tiles). Font display (es. Inter/Space Grotesk) **solo
  se** approvato (vedi Boundaries — impatto perf/PWA).
- Raggi: card `rounded-2xl`; controlli `rounded-xl`. Bordi sottili + ombre molto tenui
  (quasi assenti in dark). Spaziatura generosa, gerarchia tipografica chiara.

### 4.3 Componenti base (nuovi, in `src/client/components/`)
- `ThemeToggle` + hook `useTheme` (persistenza `localStorage`, fallback sistema).
- `Card`, `StatTile` (etichetta + valore grande + unità + Δ), `IconButton`, set icone SVG.

---

## 5. Core features & Acceptance Criteria

### 5.1 AppShell / navigazione
- Header e bottom-nav ridisegnati con i token; **icone SVG** al posto delle emoji; stato
  attivo con accento. Toggle tema accessibile dall'header.
- **AC**: `AppShell.test.tsx` esistente continua a passare (adeguato ai nuovi marker se
  necessario); nav resta `aria-label`ata; voci placeholder ancora `disabled`.

### 5.2 Login
- **AC**: pagina restyled a tema (dark/light), bottone Google coerente con l'accento,
  leggibile AA.

### 5.3 Pagina Misure — Overview (nuovo, contenuto)
- Riga di **stat tiles** in cima: per le metriche chiave, ultimo valore + Δ vs precedente
  (colore neutro, D6). Deriva dai dati già disponibili (nessuna nuova API).
- **AC**: con dati presenti mostra ultimo valore e Δ corretti; con 0 dati mostra stato vuoto
  a tema.

### 5.4 Grafico — fix + arricchimento (punto critico)
Bug attuale: in `MeasurementChart.tsx` `margin.left = -16` tira il plot oltre il bordo e
`YAxis width={48}` con `unit` appeso ai tick rende le etichette più larghe → **asse Y
tagliato**.
- **AC-fix (bloccante)**:
  - `margin.left ≥ 0` e `YAxis width` sufficiente: le etichette dell'asse Y sono
    **completamente visibili** (nessun clipping) a 320px, 390px e desktop.
  - Unità **fuori** dai tick numerici (nel titolo/etichetta sezione o label asse), tick
    con `tickFormatter` numerico.
- **AC-arricchimento**:
  - Linea in accento + **area con gradiente** accento a bassa opacità.
  - Ultimo punto evidenziato; tooltip ristilizzato a tema (leggibile dark/light).
  - Griglia/assi discreti; date x-axis formattate e non affollate.
  - Stati loading (skeleton) e vuoto a tema.

### 5.5 Storico
- **AC**: lista misurazioni come card pulite a tema; azione "Elimina" chiara ma non
  invadente; wrap dei valori leggibile con `tabular-nums`.

---

## 6. Project Structure (file toccati / nuovi)
```
src/client/
  index.css                         # + @theme token, dark variant, base
  lib/theme.ts                      # (nuovo) useTheme + persistenza
  components/
    ThemeToggle.tsx                 # (nuovo)
    Card.tsx, StatTile.tsx          # (nuovi) primitive
    icons.tsx                       # (nuovo) set SVG per nav/azioni
    AppShell.tsx                    # restyle
  features/
    auth/LoginPage.tsx              # restyle
    measurements/
      StatOverview.tsx              # (nuovo) riga stat tiles
      MeasurementsPage.tsx          # layout aggiornato
      MeasurementChart.tsx          # fix asse Y + arricchimento
      MeasurementHistory.tsx        # restyle
      MeasurementForm.tsx           # restyle
      chartTheme.ts                 # (nuovo) colori grafico dai token
```

---

## 7. Code Style
- Identificatori in inglese; classi Tailwind con **token semantici**, niente hex sparsi.
- Recharts riceve colori da un unico modulo `chartTheme.ts` mappato sui token del tema
  corrente (no stringhe colore hardcoded nei componenti grafico).
- Componenti piccoli e componibili; nessuno stile inline salvo prop necessarie a Recharts.
- Biome (lint+format) e typecheck devono restare verdi.

---

## 8. Testing Strategy
- **Unit (Vitest)**: helper del grafico (`tickFormatter`, calcolo dominio, calcolo Δ);
  `useTheme` (default sistema, toggle, persistenza).
- **Component**: `AppShell.test.tsx` aggiornato; smoke di `StatTile`/`StatOverview`.
- **E2E (Playwright)** — regressione del bug:
  - Aprire Misure, selezionare una metrica con dati: le **tick label dell'asse Y sono
    visibili** (testo presente e dentro il box del grafico, non a x negativa) a viewport
    320/390/desktop.
  - Toggle tema commuta `data-theme` e resta persistito dopo reload.
- **A11y**: contrasto AA su testo/accento in entrambi i temi (check manuale o axe).
- Gate finale: `npm run check` verde + review con la skill dedicata prima del push (workflow).

---

## 9. Boundaries

### Always
- Mobile-first e PWA-safe (safe-area, offline invariato).
- Tema-aware: entrambi i temi leggibili e AA; token unici come fonte di verità dei colori.
- Preservare comportamento funzionale, isolamento dati e API/DB **invariati**.
- Recharts resta lazy; attenzione al peso del bundle.

### Ask first
- Aggiungere web font esterni (impatto perf/offline).
- Cambiare l'**information architecture**/struttura nav o aggiungere nuove rotte.
- Introdurre qualunque dipendenza UI (component/animation library).
- Sostituire Recharts con un'altra libreria di grafici.

### Never
- Modificare schema DB, API, auth o modello dati per questa feature.
- Rompere l'offline/PWA o l'isolamento dati.
- Codificare i Δ delle misure corporee come "verde=buono / rosso=cattivo" (D6).
- Committare/pushare su `main` (solo feature branch + PR).

---

## 10. Prossimo passo
Alla conferma di questo spec (e delle scelte in §0), si passa al piano task incrementale
(`/agent-skills:plan` o `agent-skills:build`) partendo da: token di tema → fix grafico
(bloccante) → primitive/overview → restyle schermate.
