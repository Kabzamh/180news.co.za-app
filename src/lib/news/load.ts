import { buildItem, finalize, isNewsItem, safeUrl } from '../feed/parse'
import type { FeedApiResponse, FeedDef, NewsItem, Snapshot } from '../feed/types'

export type LoadResult =
  | { ok: true; items: NewsItem[]; origin: 'live' | 'relay'; fetchedAt: number }
  | { ok: false; error: string }

function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms)
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

class HttpError extends Error {
  status: number
  constructor(status: number) {
    super(`HTTP ${status}`)
    this.status = status
  }
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const res = await fetch(url, { signal: timeoutSignal(timeoutMs), headers: { Accept: 'application/json' } })
  if (!res.ok) throw new HttpError(res.status)
  // A missing endpoint behind an SPA rewrite answers 200 with HTML.
  if (!(res.headers.get('content-type') ?? '').includes('json')) throw new Error('Unexpected response')
  return res.json()
}

function errorText(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') return 'Timed out'
    if (err.name === 'TypeError') return 'Network error'
    return err.message.slice(0, 100)
  }
  return 'Request failed'
}

/* ---------- 1. Our own feed endpoint (fast, edge-cached, compact) ---------- */

let apiDownUntil = 0

async function viaApi(defs: FeedDef[]): Promise<Record<string, { items: NewsItem[]; fetchedAt: number }>> {
  const ids = defs.map((d) => d.id).join(',')
  const data = (await fetchJson(`/api/feed?ids=${encodeURIComponent(ids)}`, 14_000)) as Partial<FeedApiResponse> | null
  if (!data || typeof data.feeds !== 'object' || data.feeds === null) throw new Error('Unexpected response')
  const now = Date.now()
  const out: Record<string, { items: NewsItem[]; fetchedAt: number }> = {}
  for (const def of defs) {
    const entry = data.feeds[def.id]
    if (entry && entry.ok && Array.isArray(entry.items)) {
      const items = entry.items.filter(isNewsItem)
      // The endpoint reports when it actually read the publisher's feed, which
      // can be earlier than now if the answer came from a cache.
      const fetchedAt = typeof entry.fetchedAt === 'number' && entry.fetchedAt > 0 ? Math.min(entry.fetchedAt, now) : now
      if (items.length) out[def.id] = { items, fetchedAt }
    }
  }
  return out
}

/* ---------- 2. Public RSS-to-JSON relay, one feed at a time ---------- */

interface RelayItem {
  title?: string
  link?: string
  pubDate?: string
  description?: string
  content?: string
  thumbnail?: string
  author?: string
  categories?: string[]
  enclosure?: { link?: string; type?: string }
}

let relayDownUntil = 0
let relayActive = 0
const relayQueue: Array<() => void> = []

async function relaySlot<T>(task: () => Promise<T>): Promise<T> {
  if (relayActive >= 3) await new Promise<void>((resolve) => relayQueue.push(resolve))
  relayActive += 1
  try {
    return await task()
  } finally {
    relayActive -= 1
    relayQueue.shift()?.()
  }
}

async function viaRelay(def: FeedDef): Promise<NewsItem[]> {
  if (Date.now() < relayDownUntil) throw new Error('Relay is rate-limited')
  let data: { status?: string; items?: RelayItem[] } | null
  try {
    data = (await fetchJson(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(def.url)}`, 12_000)) as typeof data
  } catch (err) {
    // The free relay has a small quota; once it says "too many requests", leave it alone for a while.
    if (err instanceof HttpError && err.status === 429) relayDownUntil = Date.now() + 10 * 60_000
    throw err
  }
  if (!data || data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('Relay could not read feed')
  const items: NewsItem[] = []
  for (const raw of data.items) {
    const enclosureImage =
      raw.enclosure?.link && (!raw.enclosure.type || raw.enclosure.type.startsWith('image/'))
        ? safeUrl(raw.enclosure.link)
        : undefined
    const parsed = raw.pubDate ? Date.parse(`${raw.pubDate.trim().replace(' ', 'T')}Z`) : NaN
    const item = buildItem(
      {
        title: raw.title ?? '',
        link: raw.link,
        descriptionHtml: raw.description ?? '',
        contentHtml: raw.content,
        image: safeUrl(raw.thumbnail) ?? enclosureImage,
        author: raw.author,
        categories: Array.isArray(raw.categories) ? raw.categories.filter((c) => typeof c === 'string') : [],
        published: Number.isNaN(parsed) ? null : parsed,
      },
      def,
    )
    if (item) items.push(item)
  }
  const out = finalize(items, 24)
  if (!out.length) throw new Error('Feed returned no stories')
  return out
}

/** Load a group of feeds: own endpoint first, public relay for anything it could not deliver. */
export async function loadFeeds(defs: FeedDef[]): Promise<Record<string, LoadResult>> {
  const out: Record<string, LoadResult> = {}

  if (Date.now() > apiDownUntil) {
    try {
      const got = await viaApi(defs)
      for (const [id, feed] of Object.entries(got)) out[id] = { ok: true, items: feed.items, origin: 'live', fetchedAt: feed.fetchedAt }
    } catch {
      // Endpoint missing or unreachable – skip it for a while instead of retrying every cycle.
      apiDownUntil = Date.now() + 10 * 60_000
    }
  }

  await Promise.all(
    defs
      .filter((def) => !out[def.id])
      .map((def) =>
        relaySlot(async () => {
          try {
            out[def.id] = { ok: true, items: await viaRelay(def), origin: 'relay', fetchedAt: Date.now() }
          } catch (err) {
            out[def.id] = { ok: false, error: errorText(err) }
          }
        }),
      ),
  )
  return out
}

/* ---------- 3. Saved copy shipped with the app ---------- */

let snapshotPromise: Promise<Snapshot | null> | null = null

export function loadSnapshot(): Promise<Snapshot | null> {
  snapshotPromise ??= fetchJson('/snapshot.json', 15_000)
    .then((data) => {
      const snap = data as Partial<Snapshot> | null
      if (!snap || typeof snap.generatedAt !== 'number' || typeof snap.feeds !== 'object' || !snap.feeds) return null
      return snap as Snapshot
    })
    .catch(() => {
      snapshotPromise = null
      return null
    })
  return snapshotPromise
}
