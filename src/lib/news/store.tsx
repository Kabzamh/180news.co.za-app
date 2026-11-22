import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { FEEDS, SECTIONS, feedsForSection, type FeedDef } from '../feeds'
import { dedupeItems, interleave, isArticle, normalizeItem, byNewest, type Article } from './parse'
import { useControl, ownToArticle } from '../control'
import { loadCmsArticles } from '../cms'

export interface FeedState {
  items: Article[]
  origin: 'live' | 'relay' | 'cache' | 'snapshot' | 'none'
  fetchedAt: number
  error?: string
}

export interface NewsStatus {
  kind: 'live' | 'loading' | 'saved' | 'offline'
  at: number | null
  live: number
  total: number
}

interface NewsValue {
  ready: boolean
  refreshing: boolean
  now: number
  feeds: Record<string, FeedState>
  bySection: Record<string, Article[]>
  byId: Map<string, Article>
  all: Article[]
  featured: Article | undefined
  headlines: Article[]
  status: NewsStatus
  pendingCount: number
  applyPending: () => void
  refresh: () => void
}

const CACHE_KEY = '180news:feeds:v1'
const CACHE_FRESH_MS = 30 * 60000
const LIVE_RECENT_MS = 20 * 60000
const FIRST_BOOT_DELAY_MS = 3500
const STALE_REFRESH_MS = 6 * 60000
const PRIORITY_SECTIONS = ['south-africa', 'politics', 'business']
const FEED_ITEM_LIMIT = 24
const CACHE_LIMIT = 16

function readCache(): { feeds: Record<string, FeedState>; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { savedAt?: unknown; feeds?: unknown }
    if (typeof parsed.savedAt !== 'number' || !parsed.feeds || typeof parsed.feeds !== 'object') return null
    const feeds: Record<string, FeedState> = {}
    for (const feed of FEEDS) {
      const entry = (parsed.feeds as Record<string, unknown>)[feed.id]
      if (!entry || typeof entry !== 'object') continue
      const items = (entry as { items?: unknown }).items
      const fetchedAt = (entry as { fetchedAt?: unknown }).fetchedAt
      if (!Array.isArray(items) || typeof fetchedAt !== 'number') continue
      const valid = items.filter(isArticle)
      if (valid.length) feeds[feed.id] = { items: valid, origin: 'cache', fetchedAt }
    }
    return Object.keys(feeds).length ? { feeds, savedAt: parsed.savedAt } : null
  } catch {
    return null
  }
}

function writeCache(feeds: Record<string, FeedState>): void {
  try {
    const out: Record<string, { items: Article[]; fetchedAt: number }> = {}
    for (const [id, state] of Object.entries(feeds)) {
      if ((state.origin === 'live' || state.origin === 'relay' || state.origin === 'cache') && state.items.length) {
        out[id] = { items: state.items.slice(0, CACHE_LIMIT), fetchedAt: state.fetchedAt }
      }
    }
    if (Object.keys(out).length) localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), feeds: out }))
  } catch {
    /* storage unavailable — the app keeps working from memory */
  }
}

interface SnapshotResponse {
  generatedAt: number
  feeds: Record<string, Article[]>
}

let snapshotPromise: Promise<SnapshotResponse | null> | null = null
function loadSnapshot(): Promise<SnapshotResponse | null> {
  snapshotPromise ??= fetch('/snapshot.json')
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error('HTTP'))))
    .then((data: SnapshotResponse) =>
      !data || typeof data.generatedAt !== 'number' || !data.feeds || typeof data.feeds !== 'object' ? null : data,
    )
    .catch(() => {
      snapshotPromise = null
      return null
    })
  return snapshotPromise
}

class HttpError extends Error {
  status: number
  constructor(status: number) {
    super(`HTTP ${status}`)
    this.status = status
  }
}

function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms)
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

async function fetchJson(url: string, ms: number): Promise<unknown> {
  const res = await fetch(url, { signal: timeoutSignal(ms), headers: { Accept: 'application/json' } })
  if (!res.ok) throw new HttpError(res.status)
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

let relayCooldownUntil = 0
let inFlight = 0
const waiting: (() => void)[] = []
async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (inFlight >= 3) await new Promise<void>((resolve) => waiting.push(resolve))
  inFlight += 1
  try {
    return await task()
  } finally {
    inFlight -= 1
    waiting.shift()?.()
  }
}

interface RelayResponse {
  status?: string
  items?: {
    title?: string
    link?: string
    description?: string
    content?: string
    thumbnail?: string
    author?: string
    pubDate?: string
    enclosure?: { link?: string; type?: string }
    categories?: unknown
  }[]
}

async function fetchViaRelay(feed: FeedDef): Promise<Article[]> {
  if (Date.now() < relayCooldownUntil) throw new Error('Relay is rate-limited')
  let data: RelayResponse
  try {
    data = (await fetchJson(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`, 12000)) as RelayResponse
  } catch (err) {
    if (err instanceof HttpError && err.status === 429) relayCooldownUntil = Date.now() + 10 * 60000
    throw err
  }
  if (!data || data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('Relay could not read feed')
  const items: Article[] = []
  for (const raw of data.items) {
    const enclosure =
      raw.enclosure?.link && (!raw.enclosure.type || raw.enclosure.type.startsWith('image/')) ? raw.enclosure.link : undefined
    const published = raw.pubDate ? Date.parse(`${raw.pubDate.trim().replace(' ', 'T')}Z`) : NaN
    const article = normalizeItem(
      {
        title: raw.title ?? '',
        link: raw.link ?? '',
        descriptionHtml: raw.description ?? '',
        contentHtml: raw.content ?? '',
        image: raw.thumbnail ?? enclosure,
        author: raw.author,
        categories: Array.isArray(raw.categories) ? raw.categories.filter((c): c is string => typeof c === 'string') : [],
        published: Number.isNaN(published) ? null : published,
      },
      feed,
    )
    if (article) items.push(article)
  }
  const fresh = dedupeItems(items, FEED_ITEM_LIMIT)
  if (!fresh.length) throw new Error('Feed returned no stories')
  return fresh
}

interface BatchResponse {
  feeds?: Record<string, { ok?: boolean; items?: unknown; fetchedAt?: number } | undefined>
}

async function fetchViaBatch(feeds: FeedDef[]): Promise<Record<string, { items: Article[]; fetchedAt: number }>> {
  const ids = feeds.map((f) => f.id).join(',')
  const data = (await fetchJson(`/api/feed?ids=${encodeURIComponent(ids)}`, 14000)) as BatchResponse
  if (!data || typeof data.feeds !== 'object' || data.feeds === null) throw new Error('Unexpected response')
  const now = Date.now()
  const out: Record<string, { items: Article[]; fetchedAt: number }> = {}
  for (const feed of feeds) {
    const entry = data.feeds[feed.id]
    if (entry?.ok && Array.isArray(entry.items)) {
      const items = entry.items.filter(isArticle)
      const fetchedAt = typeof entry.fetchedAt === 'number' && entry.fetchedAt > 0 ? Math.min(entry.fetchedAt, now) : now
      if (items.length) out[feed.id] = { items, fetchedAt }
    }
  }
  return out
}

type FeedResult = { ok: true; items: Article[]; origin: 'live' | 'relay'; fetchedAt: number } | { ok: false; error: string }

async function loadSection(feeds: FeedDef[]): Promise<Record<string, FeedResult>> {
  const results: Record<string, FeedResult> = {}
  if (Date.now() > relayCooldownUntil) {
    try {
      const batch = await fetchViaBatch(feeds)
      for (const [id, state] of Object.entries(batch)) results[id] = { ok: true, items: state.items, origin: 'live', fetchedAt: state.fetchedAt }
    } catch {
      relayCooldownUntil = Date.now() + 10 * 60000
    }
  }
  await Promise.all(
    feeds
      .filter((f) => !results[f.id])
      .map((feed) =>
        withSlot(async () => {
          try {
            results[feed.id] = { ok: true, items: await fetchViaRelay(feed), origin: 'relay', fetchedAt: Date.now() }
          } catch (err) {
            results[feed.id] = { ok: false, error: errorText(err) }
          }
        }),
      ),
  )
  return results
}

const titleKey = (a: Article): string => a.title.toLowerCase().replace(/[^a-z0-9]+/g, '')

const NewsContext = createContext<NewsValue | null>(null)

export function NewsProvider({ children }: { children: ReactNode }) {
  const { settings, articles, liveAt } = useControl()
  const { hiddenSections, hiddenSources } = settings
  const intervalMs = settings.refreshMinutes * 60000
  const [cache] = useState(readCache)
  const [feeds, setFeeds] = useState<Record<string, FeedState>>(() => cache?.feeds ?? {})
  const [booted, setBooted] = useState(() => !!cache && Date.now() - cache.savedAt < CACHE_FRESH_MS)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [cmsArticles, setCmsArticles] = useState<Article[]>([])
  const cmsRef = useRef<Article[]>([])

  // Stories published in the newsroom CMS appear alongside the newsroom feeds.
  useEffect(() => {
    let cancelled = false
    const load = () => {
      loadCmsArticles().then((articles) => {
        if (!cancelled && articles.length !== cmsRef.current.length) {
          cmsRef.current = articles
          setCmsArticles(articles)
        } else if (!cancelled && articles.length > 0) {
          const changed =
            articles.length !== cmsRef.current.length ||
            articles.some((a, i) => a.id !== cmsRef.current[i]?.id || a.title !== cmsRef.current[i]?.title)
          if (changed) {
            cmsRef.current = articles
            setCmsArticles(articles)
          }
        }
      })
    }
    load()
    const timer = window.setInterval(() => {
      if (!document.hidden) load()
    }, 60000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])
  const feedsRef = useRef<Record<string, FeedState>>(cache?.feeds ?? {})
  const pendingRef = useRef<Record<string, FeedState> | null>(null)
  const runRef = useRef<Promise<void> | null>(null)
  const manualRef = useRef(false)
  const lastRunAt = useRef(0)
  const staleFlag = useRef(false)
  const runFn = useRef<((mode: 'initial' | 'auto' | 'manual') => Promise<void>) | null>(null)

  const mergeFeeds = useCallback((patch: Record<string, FeedState>) => {
    if (!Object.keys(patch).length) return
    feedsRef.current = { ...feedsRef.current, ...patch }
    setFeeds(feedsRef.current)
  }, [])

  const fillFromSnapshot = useCallback(async (): Promise<void> => {
    const need = FEEDS.filter((f) => !feedsRef.current[f.id]?.items.length)
    if (!need.length) return
    const snap = await loadSnapshot()
    if (!snap) return
    const patch: Record<string, FeedState> = {}
    for (const feed of need) {
      const current = feedsRef.current[feed.id]
      if (current?.items.length) continue
      const items = (snap.feeds[feed.id] ?? []).filter(isArticle)
      if (items.length) patch[feed.id] = { items, origin: 'snapshot', fetchedAt: snap.generatedAt, error: current?.error }
    }
    mergeFeeds(patch)
  }, [mergeFeeds])

  const run = useCallback(
    async (mode: 'initial' | 'auto' | 'manual'): Promise<void> => {
      if (mode !== 'auto') manualRef.current = true
      if (runRef.current) return runRef.current
      const task = (async () => {
        setRefreshing(true)
        lastRunAt.current = Date.now()
        const deferred: Record<string, FeedState> = {}
        const doneSections = new Set<string>()
        let newestAt = 0
        await Promise.all(
          SECTIONS.map(async (section) => {
            const sectionFeeds = feedsForSection(section.id)
            const results = await loadSection(sectionFeeds)
            const sectionPatch: Record<string, FeedState> = {}
            for (const feed of sectionFeeds) {
              const result = results[feed.id]
              const previous = feedsRef.current[feed.id]
              if (result?.ok) {
                sectionPatch[feed.id] = { items: result.items, origin: result.origin, fetchedAt: result.fetchedAt }
                newestAt = Math.max(newestAt, result.fetchedAt)
              } else {
                const error = result && !result.ok ? result.error : 'Request failed'
                sectionPatch[feed.id] = previous
                  ? { ...previous, error }
                  : { items: [], origin: 'none', fetchedAt: 0, error }
              }
            }
            if (manualRef.current) mergeFeeds(sectionPatch)
            else Object.assign(deferred, sectionPatch)
            doneSections.add(section.id)
            if (mode === 'initial' && PRIORITY_SECTIONS.every((s) => doneSections.has(s))) setBooted(true)
          }),
        )
        if (Object.keys(deferred).length) {
          if (manualRef.current) {
            mergeFeeds(deferred)
          } else {
            const seen = new Set<string>()
            for (const state of Object.values(feedsRef.current)) for (const item of state.items) seen.add(item.id)
            const freshIds = new Set<string>()
            for (const state of Object.values(deferred)) for (const item of state.items) if (!seen.has(item.id)) freshIds.add(item.id)
            if (freshIds.size > 0) {
              pendingRef.current = deferred
              setPendingCount(freshIds.size)
            } else mergeFeeds(deferred)
          }
        }
        await fillFromSnapshot()
        writeCache(pendingRef.current ? { ...feedsRef.current, ...pendingRef.current } : feedsRef.current)
        const stale = newestAt > 0 && Date.now() - newestAt > STALE_REFRESH_MS
        if (stale && !staleFlag.current) {
          staleFlag.current = true
          window.setTimeout(() => void runFn.current?.('auto'), 8000)
        } else if (!stale) staleFlag.current = false
      })()
      runRef.current = task
      try {
        await task
      } finally {
        runRef.current = null
        manualRef.current = false
        setBooted(true)
        setRefreshing(false)
        setNow(Date.now())
      }
    },
    [mergeFeeds, fillFromSnapshot],
  )

  useEffect(() => {
    runFn.current = run
  }, [run])

  useEffect(() => {
    void run('initial')
    const timer = window.setTimeout(() => {
      void fillFromSnapshot().then(() => setBooted(true))
    }, FIRST_BOOT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [run, fillFromSnapshot])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (intervalMs > 0 && !document.hidden) void run('auto')
    }, intervalMs || 60000)
    const tick = window.setInterval(() => {
      setNow(Date.now())
      // reload the latest articles automatically for readers at the top of the
      // page; anyone scrolled down keeps the “new stories” button
      if (pendingRef.current && !document.hidden && window.scrollY < 120) {
        mergeFeeds(pendingRef.current)
        pendingRef.current = null
        setPendingCount(0)
      }
    }, 30000)
    const wake = () => {
      if (intervalMs > 0 && !document.hidden && Date.now() - lastRunAt.current > intervalMs) void run('auto')
    }
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('online', wake)
    return () => {
      window.clearInterval(interval)
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('online', wake)
    }
  }, [run, intervalMs, mergeFeeds])

  const applyPending = useCallback(() => {
    if (pendingRef.current) mergeFeeds(pendingRef.current)
    pendingRef.current = null
    setPendingCount(0)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [mergeFeeds])

  const refresh = useCallback(() => {
    if (pendingRef.current) {
      mergeFeeds(pendingRef.current)
      pendingRef.current = null
      setPendingCount(0)
    }
    void run('manual')
  }, [mergeFeeds, run])

  const visible = useMemo(() => {
    const bySection: Record<string, Article[]> = {}
    const byId = new Map<string, Article>()
    const seenTitles = new Set<string>()
    const all: Article[] = []
    let featured: Article | undefined
    const headlines: Article[] = []
    for (const section of SECTIONS) {
      const list: Article[] = []
      const sectionTitles = new Set<string>()
      const sectionIds = new Set<string>()
      if (hiddenSections.includes(section.id)) {
        bySection[section.id] = list
        continue
      }
      for (const own of articles) {
        if (own.section !== section.id || own.hidden || (own.publishAt ?? 0) > liveAt) continue
        const item = ownToArticle(own)
        list.push(item)
        sectionIds.add(item.id)
        byId.set(item.id, item)
        all.push(item)
        if (own.pinned) featured = item
        if (own.headline) headlines.push(item)
      }
      for (const cmsItem of cmsArticles) {
        if (cmsItem.section !== section.id) continue
        const key = titleKey(cmsItem)
        if (sectionIds.has(cmsItem.id) || sectionTitles.has(key)) continue
        list.push(cmsItem)
        sectionIds.add(cmsItem.id)
        sectionTitles.add(key)
        byId.set(cmsItem.id, cmsItem)
        all.push(cmsItem)
        if (cmsItem.headline) headlines.push(cmsItem)
      }
      for (const feed of feedsForSection(section.id)) {
        if (hiddenSources.includes(feed.sourceId)) continue
        for (const item of feeds[feed.id]?.items ?? []) {
          const key = titleKey(item)
          if (sectionIds.has(item.id) || sectionTitles.has(key)) continue
          list.push(item)
          sectionTitles.add(key)
          if (!byId.has(item.id) && !seenTitles.has(key)) {
            byId.set(item.id, item)
            seenTitles.add(key)
            all.push(item)
          }
        }
      }
      bySection[section.id] = list.sort(byNewest)
    }
    all.sort(byNewest)
    headlines.sort(byNewest)
    return { bySection, byId, all, featured, headlines }
  }, [feeds, articles, cmsArticles, liveAt, hiddenSections, hiddenSources])

  const status = useMemo<NewsStatus>(() => {
    let live = 0
    let newestLive = 0
    let newest = 0
    for (const feed of FEEDS) {
      const state = feeds[feed.id]
      if (state?.items.length) {
        if (state.origin === 'live' || state.origin === 'relay') {
          live += 1
          newestLive = Math.max(newestLive, state.fetchedAt)
        }
        newest = Math.max(newest, state.fetchedAt)
      }
    }
    const total = FEEDS.length
    if (live > 0 && now - newestLive < LIVE_RECENT_MS) return { kind: 'live', at: newestLive, live, total }
    if (!booted || refreshing) return { kind: 'loading', at: null, live, total }
    if (newest > 0) return { kind: 'saved', at: newest, live: 0, total }
    return { kind: 'offline', at: null, live: 0, total }
  }, [feeds, booted, refreshing, now])

  const value = useMemo<NewsValue>(
    () => ({
      ready: booted,
      refreshing,
      now,
      feeds,
      ...visible,
      status,
      pendingCount,
      applyPending,
      refresh,
    }),
    [booted, refreshing, now, feeds, visible, status, pendingCount, applyPending, refresh],
  )

  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>
}

export function useNews(): NewsValue {
  const ctx = useContext(NewsContext)
  if (!ctx) throw new Error('useNews must be used inside <NewsProvider>')
  return ctx
}

export { interleave }
