import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { isNewsItem } from '../feed/parse'
import { FEEDS, SECTIONS, feedsForSection } from '../feed/sources'
import type { NewsItem, SectionId } from '../feed/types'
import { loadFeeds, loadSnapshot } from './load'

export type Origin = 'live' | 'relay' | 'cache' | 'snapshot' | 'none'

export interface FeedState {
  items: NewsItem[]
  origin: Origin
  fetchedAt: number
  error?: string
}

export type FeedMap = Record<string, FeedState>

export interface NewsStatus {
  kind: 'loading' | 'live' | 'saved' | 'offline'
  at: number | null
  live: number
  total: number
}

interface NewsContextValue {
  ready: boolean
  refreshing: boolean
  now: number
  feeds: FeedMap
  all: NewsItem[]
  bySection: Record<SectionId, NewsItem[]>
  byId: Map<string, NewsItem>
  status: NewsStatus
  pendingCount: number
  applyPending: () => void
  refresh: () => void
}

const CACHE_KEY = '180news:feeds:v1'
const CACHE_FRESH_MS = 30 * 60_000
const REFRESH_MS = 3 * 60_000
const STALE_MS = 20 * 60_000
const BOOT_TIMEOUT_MS = 3500
const CATCH_UP_AGE_MS = 6 * 60_000
export const FRONT_SECTIONS: SectionId[] = ['south-africa', 'politics', 'business']

function readCache(): { feeds: FeedMap; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { savedAt?: unknown; feeds?: Record<string, { items?: unknown; fetchedAt?: unknown }> }
    if (typeof data.savedAt !== 'number' || !data.feeds || typeof data.feeds !== 'object') return null
    const feeds: FeedMap = {}
    for (const def of FEEDS) {
      const entry = data.feeds[def.id]
      if (!entry || !Array.isArray(entry.items) || typeof entry.fetchedAt !== 'number') continue
      const items = entry.items.filter(isNewsItem)
      if (items.length) feeds[def.id] = { items, origin: 'cache', fetchedAt: entry.fetchedAt }
    }
    return Object.keys(feeds).length ? { feeds, savedAt: data.savedAt } : null
  } catch {
    return null
  }
}

function writeCache(feeds: FeedMap): void {
  try {
    const slim: Record<string, { items: NewsItem[]; fetchedAt: number }> = {}
    for (const [id, state] of Object.entries(feeds)) {
      // Only persist what really came off the wire, never the bundled snapshot.
      if ((state.origin === 'live' || state.origin === 'relay' || state.origin === 'cache') && state.items.length) {
        slim[id] = { items: state.items.slice(0, 16), fetchedAt: state.fetchedAt }
      }
    }
    if (Object.keys(slim).length) localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), feeds: slim }))
  } catch {
    /* storage full or blocked – the cache is only an optimisation */
  }
}

function titleKey(item: NewsItem): string {
  return item.title.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function byNewest(a: NewsItem, b: NewsItem): number {
  return (b.published ?? 0) - (a.published ?? 0)
}

const NewsContext = createContext<NewsContextValue | null>(null)

export function NewsProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(readCache)
  const [feeds, setFeeds] = useState<FeedMap>(() => boot?.feeds ?? {})
  const [ready, setReady] = useState(() => !!boot && Date.now() - boot.savedAt < CACHE_FRESH_MS)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  const feedsRef = useRef<FeedMap>(boot?.feeds ?? {})
  const pendingRef = useRef<FeedMap | null>(null)
  const inFlight = useRef<Promise<void> | null>(null)
  const directRef = useRef(false)
  const lastRun = useRef(0)
  const caughtUp = useRef(false)
  const runRef = useRef<((mode: 'initial' | 'manual' | 'auto') => Promise<void>) | null>(null)

  const commit = useCallback((patch: FeedMap) => {
    if (!Object.keys(patch).length) return
    feedsRef.current = { ...feedsRef.current, ...patch }
    setFeeds(feedsRef.current)
  }, [])

  /** Anything still empty gets the saved copy that ships with the app. */
  const fillGaps = useCallback(async () => {
    const missing = FEEDS.filter((f) => !feedsRef.current[f.id]?.items.length)
    if (!missing.length) return
    const snap = await loadSnapshot()
    if (!snap) return
    const patch: FeedMap = {}
    for (const def of missing) {
      const current = feedsRef.current[def.id]
      if (current?.items.length) continue
      const saved = snap.feeds[def.id]
      const items = Array.isArray(saved) ? saved.filter(isNewsItem) : []
      if (items.length) patch[def.id] = { items, origin: 'snapshot', fetchedAt: snap.generatedAt, error: current?.error }
    }
    commit(patch)
  }, [commit])

  const run = useCallback(
    (mode: 'initial' | 'manual' | 'auto'): Promise<void> => {
      if (mode !== 'auto') directRef.current = true
      if (inFlight.current) return inFlight.current

      const job = (async () => {
        setRefreshing(true)
        lastRun.current = Date.now()
        const staged: FeedMap = {}
        const settled = new Set<SectionId>()
        let newestFetch = 0

        await Promise.all(
          SECTIONS.map(async (section) => {
            const defs = feedsForSection(section.id)
            const results = await loadFeeds(defs)
            const patch: FeedMap = {}
            for (const def of defs) {
              const result = results[def.id]
              const previous = feedsRef.current[def.id]
              if (result?.ok) {
                patch[def.id] = { items: result.items, origin: result.origin, fetchedAt: result.fetchedAt }
                newestFetch = Math.max(newestFetch, result.fetchedAt)
              } else {
                const error = result?.error ?? 'Request failed'
                patch[def.id] = previous ? { ...previous, error } : { items: [], origin: 'none', fetchedAt: 0, error }
              }
            }
            if (directRef.current) commit(patch)
            else Object.assign(staged, patch)

            // The front page is built from these three; show it as soon as they are in.
            settled.add(section.id)
            if (mode === 'initial' && FRONT_SECTIONS.every((id) => settled.has(id))) setReady(true)
          }),
        )

        if (Object.keys(staged).length) {
          if (directRef.current) {
            commit(staged)
          } else {
            const shown = new Set<string>()
            for (const state of Object.values(feedsRef.current)) for (const item of state.items) shown.add(item.id)
            const fresh = new Set<string>()
            for (const state of Object.values(staged)) for (const item of state.items) if (!shown.has(item.id)) fresh.add(item.id)
            if (fresh.size > 0) {
              // Don't reshuffle the page under a reader – offer the new stories instead.
              pendingRef.current = staged
              setPendingCount(fresh.size)
            } else {
              commit(staged)
            }
          }
        }

        await fillGaps()
        writeCache(pendingRef.current ? { ...feedsRef.current, ...pendingRef.current } : feedsRef.current)

        // A CDN may answer with an older copy while it fetches a new one in the
        // background. If that is all we got, look again shortly – but only once.
        const servedOld = newestFetch > 0 && Date.now() - newestFetch > CATCH_UP_AGE_MS
        if (servedOld && !caughtUp.current) {
          caughtUp.current = true
          window.setTimeout(() => void runRef.current?.('auto'), 8000)
        } else if (!servedOld) {
          caughtUp.current = false
        }
      })()

      inFlight.current = job
      return job.finally(() => {
        inFlight.current = null
        directRef.current = false
        setReady(true)
        setRefreshing(false)
        setNow(Date.now())
      })
    },
    [commit, fillGaps],
  )

  useEffect(() => {
    runRef.current = run
  }, [run])

  // First load, plus a deadline so a slow network never leaves the page blank.
  useEffect(() => {
    void run('initial')
    const deadline = window.setTimeout(() => {
      void fillGaps().then(() => setReady(true))
    }, BOOT_TIMEOUT_MS)
    return () => window.clearTimeout(deadline)
  }, [run, fillGaps])

  // Keep it live: poll while the tab is visible, catch up when it becomes visible again.
  useEffect(() => {
    const poll = window.setInterval(() => {
      if (!document.hidden) void run('auto')
    }, REFRESH_MS)
    const clockTick = window.setInterval(() => setNow(Date.now()), 30_000)
    const catchUp = () => {
      if (!document.hidden && Date.now() - lastRun.current > REFRESH_MS) void run('auto')
    }
    document.addEventListener('visibilitychange', catchUp)
    window.addEventListener('online', catchUp)
    return () => {
      window.clearInterval(poll)
      window.clearInterval(clockTick)
      document.removeEventListener('visibilitychange', catchUp)
      window.removeEventListener('online', catchUp)
    }
  }, [run])

  const applyPending = useCallback(() => {
    if (pendingRef.current) commit(pendingRef.current)
    pendingRef.current = null
    setPendingCount(0)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [commit])

  const refresh = useCallback(() => {
    if (pendingRef.current) commit(pendingRef.current)
    pendingRef.current = null
    setPendingCount(0)
    void run('manual')
  }, [commit, run])

  const derived = useMemo(() => {
    const bySection = {} as Record<SectionId, NewsItem[]>
    const byId = new Map<string, NewsItem>()
    const seenTitles = new Set<string>()
    const all: NewsItem[] = []

    for (const section of SECTIONS) {
      const ids = new Set<string>()
      const titles = new Set<string>()
      const list: NewsItem[] = []
      for (const def of feedsForSection(section.id)) {
        for (const item of feeds[def.id]?.items ?? []) {
          const key = titleKey(item)
          if (ids.has(item.id) || titles.has(key)) continue
          ids.add(item.id)
          titles.add(key)
          list.push(item)
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
    return { bySection, byId, all }
  }, [feeds])

  const status = useMemo<NewsStatus>(() => {
    let live = 0
    let liveAt = 0
    let savedAt = 0
    for (const def of FEEDS) {
      const state = feeds[def.id]
      if (!state?.items.length) continue
      if (state.origin === 'live' || state.origin === 'relay') {
        live += 1
        liveAt = Math.max(liveAt, state.fetchedAt)
      }
      savedAt = Math.max(savedAt, state.fetchedAt)
    }
    const total = FEEDS.length
    if (live > 0 && now - liveAt < STALE_MS) return { kind: 'live', at: liveAt, live, total }
    if (!ready || refreshing) return { kind: 'loading', at: null, live, total }
    if (savedAt > 0) return { kind: 'saved', at: savedAt, live: 0, total }
    return { kind: 'offline', at: null, live: 0, total }
  }, [feeds, ready, refreshing, now])

  const value = useMemo<NewsContextValue>(
    () => ({ ready, refreshing, now, feeds, ...derived, status, pendingCount, applyPending, refresh }),
    [ready, refreshing, now, feeds, derived, status, pendingCount, applyPending, refresh],
  )

  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>
}

export function useNews(): NewsContextValue {
  const ctx = useContext(NewsContext)
  if (!ctx) throw new Error('useNews must be used inside <NewsProvider>')
  return ctx
}

/**
 * Order stories so neighbouring slots come from different newsrooms, while
 * still leading with what is newest. Older material follows chronologically.
 */
export function diversify(items: NewsItem[], freshWindowMs = 18 * 60 * 60 * 1000): NewsItem[] {
  if (items.length < 3) return [...items].sort(byNewest)
  const sorted = [...items].sort(byNewest)
  const newest = sorted[0].published ?? 0
  const fresh = sorted.filter((i) => (i.published ?? 0) >= newest - freshWindowMs)
  const older = sorted.filter((i) => (i.published ?? 0) < newest - freshWindowMs)

  const queues = new Map<string, NewsItem[]>()
  for (const item of fresh) {
    const queue = queues.get(item.sourceId)
    if (queue) queue.push(item)
    else queues.set(item.sourceId, [item])
  }
  const out: NewsItem[] = []
  let active = [...queues.values()]
  while (active.length) {
    active.sort((a, b) => byNewest(a[0], b[0]))
    for (const queue of active) out.push(queue.shift() as NewsItem)
    active = active.filter((q) => q.length)
  }
  return [...out, ...older]
}
