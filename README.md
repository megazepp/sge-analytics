# SGE Analytics 🦅

Ein inoffizielles Fan-Projekt für Daten, Performance und Spieltagsanalyse von Eintracht Frankfurt.

## Stack
- React + Vite
- Recharts
- Cloudflare Worker als API-Proxy
- API-Football als Datenquelle
- GitHub Pages für das Frontend

## Lokal starten
```bash
npm install
npm run dev
```

## Deployment
GitHub Actions baut die App bei jedem Push nach GitHub Pages.

In GitHub unter **Settings → Pages** als Source **GitHub Actions** auswählen.

Optional in **Settings → Secrets and variables → Actions → Variables** die Variable `VITE_API_BASE` mit der Cloudflare-Worker-URL setzen und erneut deployen.

## API verbinden
Die Anleitung liegt unter [worker/README.md](worker/README.md).

Den API-Football-Key ausschließlich als Cloudflare Worker Secret `API_FOOTBALL_KEY` hinterlegen – niemals im Frontend oder in einer öffentlichen GitHub-Datei.

**Hinweis:** Das Dashboard zeigt aktuell bewusst gekennzeichnete Demo-Inhalte. Es werden keine Demo-Ergebnisse als echte Eintracht-Daten ausgegeben.

Inoffizielles Fan-Projekt, nicht mit Eintracht Frankfurt e.V. verbunden.
