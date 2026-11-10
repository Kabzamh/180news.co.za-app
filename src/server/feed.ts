import { FeedError, describeError, fetchFeed } from '../lib/feed/fetchFeed'
import { FEED_BY_ID, feedTtlSeconds } from '../lib/feed/sources'
import type { FeedApiEntry, FeedApiResponse, NewsItem } from '../lib/feed/types'

/**
 * GET /api/feed?ids=iol-sa,dm-main
 *
 * Fetches publisher RSS feeds server-side (they do not send CORS headers) and
 * returns compact, normalised JSON. Only feed ids from the allowlist in
 * sources.ts are accepted, so this can never be used as an open proxy.
 * Bundled to api/feed.js by `npm run build:api`.
 */

interface Req {
  url?: string
  method?: string
}
interface Res {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

const MAX_IDS = 8

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('X-Content-Type-Options', 'nosniff')

  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET, HEAD')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  let ids: string[] = []
  try {
    const params = new URL(req.url ?? '/', 'http://localhost').searchParams
    ids = (params.get('ids') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((id) => Object.prototype.hasOwnProperty.call(FEED_BY_ID, id))
  } catch {
    ids = []
  }
  ids = [...new Set(ids)].slice(0, MAX_IDS)

  if (ids.length === 0) {
    res.statusCode = 400
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify({ error: 'Pass ?ids= with one or more known feed ids' }))
    return
  }

  const body: FeedApiResponse = { generatedAt: Date.now(), feeds: {} }
  let failures = 0
  await Promise.all(
    ids.map(async (id) => {
      const entry = await getFeed(id)
      if (!entry.ok) failures += 1
      body.feeds[id] = entry
    }),
  )

  // Let the CDN hold a good answer for as long as the quickest-moving feed in
  // the group allows; hold failures only briefly so a publisher hiccup clears fast.
  const ttl = Math.min(...ids.map((id) => feedTtlSeconds(FEED_BY_ID[id])))
  const cache =
    failures === 0
      ? `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 4}`
      : failures < ids.length
        ? 'public, s-maxage=45, stale-while-revalidate=120'
        : 'public, s-maxage=10'
  res.setHeader('Cache-Control', cache)
  res.statusCode = 200
  res.end(JSON.stringify(body))
}

/* A warm instance remembers its last good copy of each feed: it spares the
   publisher repeat requests inside the TTL, and covers for it when a later
   request is refused (the copy keeps its original fetch time, so the app can
   tell how old it is). After a refusal we also back off before asking again,
   honouring Retry-After when the publisher sends one. */
const KEEP_ON_ERROR_MS = 3 * 60 * 60 * 1000
const BACKOFF_MS = 60_000
const MAX_BACKOFF_MS = 10 * 60_000
const memory = new Map<string, { at: number; items: NewsItem[] }>()
const backoff = new Map<string, { until: number; error: string }>()
const inFlight = new Map<string, Promise<FeedApiEntry>>()

function fallback(id: string, error: string): FeedApiEntry {
  const kept = memory.get(id)
  if (kept && Date.now() - kept.at < KEEP_ON_ERROR_MS) return { ok: true, items: kept.items, fetchedAt: kept.at }
  return { ok: false, error }
}

function getFeed(id: string): Promise<FeedApiEntry> {
  const def = FEED_BY_ID[id]
  const kept = memory.get(id)
  if (kept && Date.now() - kept.at < feedTtlSeconds(def) * 1000) {
    return Promise.resolve({ ok: true, items: kept.items, fetchedAt: kept.at })
  }
  const waiting = backoff.get(id)
  if (waiting && Date.now() < waiting.until) return Promise.resolve(fallback(id, waiting.error))

  const running = inFlight.get(id)
  if (running) return running

  const job = fetchFeed(def)
    .then((items): FeedApiEntry => {
      const at = Date.now()
      memory.set(id, { at, items })
      backoff.delete(id)
      return { ok: true, items, fetchedAt: at }
    })
    .catch((err): FeedApiEntry => {
      const error = describeError(err)
      const asked = err instanceof FeedError && err.retryAfterSeconds ? err.retryAfterSeconds * 1000 : BACKOFF_MS
      backoff.set(id, { until: Date.now() + Math.min(asked, MAX_BACKOFF_MS), error })
      return fallback(id, error)
    })
    .finally(() => inFlight.delete(id))
  inFlight.set(id, job)
  return job
}
