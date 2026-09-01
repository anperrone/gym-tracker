# CLAUDE.md — Gym Tracker

Guida di progetto per Claude Code. Documenti di riferimento: `docs/SPEC.md`, `docs/PLAN.md`, `docs/TASKS.md`.

## Workflow di sviluppo (obbligatorio)

1. **Feature branch sempre** — mai lavorare su `main`. Per ogni modifica creare un branch `feat/...`, `fix/...` o `chore/...`.
2. **`main` è protetto** — vietato commit/push diretti su `main`. Le modifiche arrivano solo via Pull Request.
3. **Review prima del push** — prima di ogni push eseguire una code review con la skill dedicata (`/agent-skills:review` o `/code-review`) e risolvere i finding.
4. **PR verso `main`** — pushare il feature branch, aprire una PR verso `main`, far girare la CI; review e merge sono dell'utente.
5. **Gate qualità** — ogni task chiude solo con `npm run check` verde. Il `pre-commit` (husky + lint-staged) enforce lint/format/typecheck.

## Comandi chiave

- `npm run dev` — dev server (Vite + Workers + D1 locale)
- `npm run check` — typecheck + `biome check` (lint+format) + test (gate CI/precommit)
- `npm test` — Vitest (unit + integrazione su workerd/D1)
- `npm run test:e2e` — Playwright (pipeline E2E separata)
- `npm run db:generate` / `db:migrate` — migrazioni Drizzle → D1

## Stack

React 19 + Vite (PWA) · Hono su Cloudflare Workers · D1 + Drizzle · R2 (foto, fase successiva) · Auth Google self-hosted · TanStack Router/Query · Tailwind v4 · Biome · Vitest + Playwright. Node ≥ 26.

## Convenzioni

- Identificatori in inglese; validazione al confine API con Zod; ogni query DB scoped per `userId` dalla sessione.
- Isolamento dati: un utente vede solo i propri dati; l'admin (tecnico) non accede ai dati personali altrui.
- Vedi `docs/SPEC.md` §8 per Boundaries (Always / Ask first / Never).
