# SGE Analytics API Worker

## Deploy
1. Install Wrangler: `npm install -g wrangler`
2. From this directory run: `wrangler login`
3. Add your API-Football key: `wrangler secret put API_FOOTBALL_KEY`
4. Deploy: `wrangler deploy`

The worker exposes a restricted proxy under `/api/*`. Allowed endpoints are teams, players, fixtures, standings, leagues, injuries, transfers, trophies, sidelined and coachs.

Example: `/api/fixtures?team=169&season=2026&last=5`

Never put the API key in the frontend or a public GitHub file.