const API_HOST = 'https://v3.football.api-sports.io'

const ALLOWED_ENDPOINTS = new Set([
  'teams', 'players', 'fixtures', 'standings', 'leagues', 'injuries',
  'transfers', 'trophies', 'sidelined', 'coachs'
])

const CACHE_TTL = {
  players: 6 * 60 * 60,
  teams: 24 * 60 * 60,
  leagues: 24 * 60 * 60,
  standings: 10 * 60,
  fixtures: 5 * 60,
  injuries: 30 * 60,
  transfers: 60 * 60,
  trophies: 24 * 60 * 60,
  sidelined: 30 * 60,
  coachs: 24 * 60 * 60
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders
    }
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
    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'sge-analytics-api' }, 200, cors)
    }
    if (request.method !== 'GET' || !url.pathname.startsWith('/api/')) {
      return json({ error: 'Not found' }, 404, cors)
    }

    const endpoint = url.pathname.slice('/api/'.length)
    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return json({ error: 'Endpoint not allowed' }, 400, cors)
    }
    if (!env.API_FOOTBALL_KEY) {
      return json({ error: 'API key not configured. Add API_FOOTBALL_KEY as a Worker secret.' }, 503, cors)
    }

    const target = new URL(API_HOST + '/' + endpoint)
    for (const [key, value] of url.searchParams) target.searchParams.set(key, value)

    const cacheKey = new Request(target.toString(), { method: 'GET' })
    const ttl = CACHE_TTL[endpoint] || 60

    try {
      const cache = caches.default
      const cached = await cache.match(cacheKey)
      if (cached) {
        const headers = new Headers(cached.headers)
        for (const [key, value] of Object.entries(cors)) headers.set(key, value)
        headers.set('X-SGE-Cache', 'HIT')
        return new Response(cached.body, { status: cached.status, headers })
      }

      const upstream = await fetch(target, {
        headers: { 'x-apisports-key': env.API_FOOTBALL_KEY }
      })
      const body = await upstream.text()
      let data
      try { data = JSON.parse(body) } catch { data = null }

      const rateLimitError = data?.errors?.rateLimit
      if (rateLimitError) {
        return json({
          error: 'API-Football rate limit reached. The request was not retried to avoid consuming more quota.',
          details: rateLimitError,
          retryAfterSeconds: 60
        }, 429, { ...cors, 'Retry-After': '60', 'X-SGE-Cache': 'MISS' })
      }

      const headers = new Headers({
        ...cors,
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        'Cache-Control': `public, max-age=${ttl}`,
        'X-SGE-Cache': 'MISS'
      })
      for (const name of ['x-ratelimit-requests-limit', 'x-ratelimit-requests-remaining', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']) {
        const value = upstream.headers.get(name)
        if (value) headers.set(name, value)
      }

      const response = new Response(body, { status: upstream.status, headers })
      if (upstream.ok && data && !data.errors && Number(data.results ?? 0) >= 0) {
        await cache.put(cacheKey, response.clone())
      }
      return response
    } catch {
      return json({ error: 'Football data provider could not be reached' }, 502, cors)
    }
  }
}
