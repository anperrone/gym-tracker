# Runbook — Gestione e rotazione dei secret

Procedure operative per i segreti di Gym Tracker: dove vivono, come ruotarli, cosa fare in caso di esposizione. **Nessun valore reale va scritto in questo documento** — solo placeholder.

## Principi

- **Mai** committare secret nel repo. I file che li contengono (`.dev.vars`) sono git-ignored.
- Ogni secret vive in **tre possibili sedi**, a seconda del contesto d'uso:
  - **GitHub Secrets** — usati dalla pipeline CI (`.github/workflows/ci.yml`, job `deploy`) per sincronizzarli sul Worker a ogni deploy.
  - **Worker secrets** (Cloudflare) — valori cifrati letti a runtime dall'app in produzione (`wrangler secret put`).
  - **`.dev.vars`** (locale, git-ignored) — solo per lo sviluppo con `wrangler dev` / `npm run dev`.
- Quando esegui una rotazione, **lancia i comandi tu in locale**: non incollare i nuovi valori in chat o in ticket.

## Inventario dei secret

| Nome | GitHub Secret | Worker secret | `.dev.vars` | Sensibile |
|---|:---:|:---:|:---:|:---:|
| `CLOUDFLARE_API_TOKEN` | ✅ | — | — | 🔴 sì |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | — | — | 🟡 identificativo |
| `GOOGLE_CLIENT_SECRET` | ✅ | ✅ | ✅ | 🔴 sì |
| `GOOGLE_CLIENT_ID` | ✅ | ✅ | ✅ | 🟢 no (pubblico) |
| `GOOGLE_REDIRECT_URI` | ✅ | ✅ | ✅ | 🟢 no (pubblico) |
| `ADMIN_EMAILS` | ✅ | ✅ | ✅ | 🟡 dato personale |

> `GOOGLE_CLIENT_ID` e `GOOGLE_REDIRECT_URI` non sono segreti (compaiono nel redirect OAuth lato browser): **non** richiedono rotazione.

I comandi `wrangler` che agiscono sul Worker remoto richiedono in ambiente:

```bash
export CLOUDFLARE_API_TOKEN='<token-cf-valido>'
export CLOUDFLARE_ACCOUNT_ID='<account-id>'
```

## Rotazione — Cloudflare API token

Il token CF vive **solo** come GitHub Secret (non è in `.dev.vars` né sul Worker).

1. **Crea il nuovo token** — Dashboard Cloudflare → *My Profile → API Tokens* → **Create Token** → template *Edit Cloudflare Workers* (permessi **Workers Scripts: Edit** + **D1: Edit**). Copia il valore.
2. **Aggiorna il GitHub Secret** e verifica che il nuovo token funzioni:
   ```bash
   printf %s 'NUOVO_CF_TOKEN' | gh secret set CLOUDFLARE_API_TOKEN
   CLOUDFLARE_API_TOKEN='NUOVO_CF_TOKEN' CLOUDFLARE_ACCOUNT_ID='<account-id>' npx wrangler d1 list
   ```
3. **Revoca il vecchio token** dalla dashboard (Delete).

## Rotazione — Google client secret

Il client secret vive in **tre sedi**: aggiornale tutte.

1. **Crea il nuovo secret** — Google Cloud Console → *APIs & Services → Credentials* → apri l'OAuth Client → **Add secret** (il vecchio resta attivo durante la transizione). Copia il valore.
2. **Aggiorna le tre sedi:**
   ```bash
   # (a) GitHub Secret — fonte per la CI
   printf %s 'NUOVO_GOOGLE_SECRET' | gh secret set GOOGLE_CLIENT_SECRET

   # (b) Worker secret — effetto immediato in produzione, senza attendere un deploy
   export CLOUDFLARE_API_TOKEN='<token-cf-valido>'
   export CLOUDFLARE_ACCOUNT_ID='<account-id>'
   printf %s 'NUOVO_GOOGLE_SECRET' | npx wrangler secret put GOOGLE_CLIENT_SECRET

   # (c) .dev.vars locale — apri il file e sostituisci il valore di GOOGLE_CLIENT_SECRET
   ```
3. **Elimina il vecchio secret** dalla Console (invalida quello precedente).

## In caso di esposizione di un secret

Se un secret finisce in chiaro (log, chat, commit, screenshot):

1. Ruotalo **subito** con la procedura sopra (crea nuovo → aggiorna sedi → revoca vecchio).
2. Se è stato committato per errore: rimuovilo, ma considera comunque il valore compromesso e **ruotalo** — riscrivere la history non basta.
3. Per il token CF: controlla gli audit log dell'account. Per Google: verifica i client OAuth attivi.

## Riferimenti

- Pipeline: `.github/workflows/ci.yml` (job `deploy`, step *Push secrets del Worker*).
- Config Worker: `wrangler.jsonc`.
- Setup iniziale e comandi: `README.md`.
- URL produzione: <https://gym-tracker.gym-tracker-01.workers.dev>
