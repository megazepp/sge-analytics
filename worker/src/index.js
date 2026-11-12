const API_HOST = 'https://v3.football.api-sports.io'

const ALLOWED_ENDPOINTS = new Set([
  'teams', 'players', 'fixtures', 'standings', 'leagues', 'injuries',
  'transfers', 'trophies', 'sidelined', 'coachs'
])

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders }
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || '*'
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    }

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (url.pathname === '/api/health') return new Response(JSON.stringify({ ok: true, service: 'sge-analytics-api' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    if (request.method !== 'GET' || !url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404, cors)

    const endpoint = url.pathname.slice('/api/'.length)
    if (!ALLOWED_ENDPOINTS.has(endpoint)) return json({ error: 'Endpoint not allowed' }, 400, cors)
    if (!env.API_FOOTBALL_KEY) return json({ error: 'API key not configured. Add API_FOOTBALL_KEY as a Worker secret.' }, 503, cors)

    const target = new URL(API_HOST + '/' + endpoint)
    for (const [key, value] of url.searchParams) target.searchParams.set(key, value)

    try {
      const upstream = await fetch(target, {
        headers: { 'x-apisports-key': env.API_FOOTBALL_KEY }
      })
      const body = await upstream.text()
      return new Response(body, {
        status: upstream.status,
        headers: {
          ...cors,
          'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
          'Cache-Control': 'public, max-age=30'
        }
      })
    } catch {
      return json({ error: 'Football data provider could not be reached' }, 502, cors)
    }
  }
}