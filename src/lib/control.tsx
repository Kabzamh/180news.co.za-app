import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { SECTIONS, OWN_SOURCE } from './feeds'
import type { Article } from './news/parse'

export interface Settings {
  hiddenSections: string[]
  hiddenSources: string[]
  crawlEnabled: boolean
  crawlSpeed: 'slow' | 'normal' | 'fast'
  crawlMessage: string
  refreshMinutes: number
  showScheduled: boolean
  adsOn: boolean
  email: string
  phone: string
  adPhone: string
}

export interface AdConfig {
  enabled: boolean
  position: string
  image?: string
  w?: number
  h?: number
  name: string
  url: string
}

export type AdPlacements = Record<'home' | 'article' | 'header' | 'banner', AdConfig>

export interface OwnArticle {
  id: string
  title: string
  summary: string
  body: string
  author: string
  section: string
  image?: string
  links?: string[]
  tags?: string[]
  publishAt?: number
  createdAt: number
  updatedAt: number
  hidden: boolean
  pinned: boolean
  headline: boolean
}

export const REFRESH_CHOICES = [3, 5, 10, 15, 0]

export const DEFAULT_SETTINGS: Settings = {
  hiddenSections: [],
  hiddenSources: [],
  crawlEnabled: true,
  crawlSpeed: 'normal',
  crawlMessage: '',
  refreshMinutes: 3,
  showScheduled: true,
  adsOn: true,
  email: 'newsroom@180news.co.za',
  phone: '+2781 659 6218',
  adPhone: '+2781 659 6218',
}

export const ARTICLE_LIMITS = {
  titleMin: 8,
  titleMax: 140,
  summaryMax: 300,
  bodyMin: 80,
  bodyMax: 20000,
  authorMin: 2,
  authorMax: 60,
  messageMax: 140,
  imageBytes: 700000,
}

export const MAX_ARTICLES = 50

const SETTINGS_KEY = '180news:control:v1'
const ARTICLES_KEY = '180news:articles:v1'
const ADS_KEY = '180news:ads:v1'

const isEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
const isPhone = (v: string): boolean => /^[+\d][\d\s()-]*$/.test(v) && v.replace(/\D/g, '').length >= 7
export const telHref = (v: string): string => `tel:${v.replace(/[^\d+]/g, '')}`
const isSection = (v: string): boolean => SECTIONS.some((s) => s.id === v)
const clamp = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function parseSettings(raw: unknown): Settings {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const arr = (v: unknown): string[] => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : [])
  let hiddenSections = arr(r.hiddenSections).filter(isSection)
  if (hiddenSections.length >= SECTIONS.length) hiddenSections = []
  const email = clamp(r.email, 120)
  const phone = clamp(r.phone, 30)
  const adPhone = clamp(r.adPhone, 30)
  const refresh = Number(r.refreshMinutes)
  return {
    hiddenSections,
    hiddenSources: arr(r.hiddenSources).filter((v) => true),
    crawlEnabled: typeof r.crawlEnabled === 'boolean' ? r.crawlEnabled : DEFAULT_SETTINGS.crawlEnabled,
    crawlSpeed: r.crawlSpeed === 'slow' || r.crawlSpeed === 'fast' ? r.crawlSpeed : 'normal',
    crawlMessage: typeof r.crawlMessage === 'string' ? r.crawlMessage.replace(/\s+/g, ' ').slice(0, ARTICLE_LIMITS.messageMax) : '',
    refreshMinutes: REFRESH_CHOICES.includes(refresh) ? refresh : DEFAULT_SETTINGS.refreshMinutes,
    showScheduled: r.showScheduled !== false,
    adsOn: r.adsOn !== false,
    email: isEmail(email) ? email : DEFAULT_SETTINGS.email,
    phone: isPhone(phone) ? phone : DEFAULT_SETTINGS.phone,
    adPhone: isPhone(adPhone) ? adPhone : DEFAULT_SETTINGS.adPhone,
  }
}

const AD_PLACEMENTS: { id: AdPlacementId; fallback: string; positions: string[] }[] = [
  { id: 'home', fallback: 'elections', positions: ['top', 'elections', 'middle', 'bottom'] },
  { id: 'article', fallback: 'inline', positions: ['inline', 'below'] },
  { id: 'header', fallback: 'header', positions: ['header'] },
  { id: 'banner', fallback: 'abovemenu', positions: ['abovemenu', 'verytop'] },
]

export type AdPlacementId = 'home' | 'article' | 'header' | 'banner'

const DATA_IMAGE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

function parseAds(raw: unknown): AdPlacements {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const read = (id: AdPlacementId): AdConfig => {
    const def = AD_PLACEMENTS.find((p) => p.id === id) ?? AD_PLACEMENTS[0]
    const entry = r[id] && typeof r[id] === 'object' ? (r[id] as Record<string, unknown>) : {}
    const image = typeof entry.image === 'string' && DATA_IMAGE.test(entry.image) && entry.image.length <= 900000 ? entry.image : undefined
    const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 20000 ? Math.round(v) : 0)
    const w = num(entry.w)
    const h = num(entry.h)
    const url = typeof entry.url === 'string' && /^https:\/\//.test(entry.url.trim()) ? entry.url.trim() : ''
    return {
      enabled: entry.enabled !== false,
      position: def.positions.includes(String(entry.position)) ? String(entry.position) : def.fallback,
      ...(image ? { image } : {}),
      ...(image && w && h ? { w, h } : {}),
      name: clamp(entry.name, 80),
      url,
    }
  }
  return { home: read('home'), article: read('article'), header: read('header'), banner: read('banner') }
}

const TAG_MAX = 24
const TAG_COUNT = 5

export function parseTags(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').join(',') : String(value ?? '')
  const out: string[] = []
  for (const part of raw.split(/[,\n]/)) {
    const tag = part.replace(/[#/\\?%]/g, ' ').replace(/\s+/g, ' ').trim()
    if (tag && !out.some((t) => t.toLowerCase() === tag.toLowerCase())) out.push(tag)
  }
  return out.filter((t) => t.length <= TAG_MAX).slice(0, TAG_COUNT)
}

export const tagHref = (tag: string): string => `/tag/${encodeURIComponent(tag.toLowerCase())}`

export function tagSummary(articles: OwnArticle[]): { key: string; name: string; mixed: boolean; articleIds: string[] }[] {
  const map = new Map<string, { key: string; name: string; mixed: boolean; articleIds: string[] }>()
  for (const article of articles) {
    for (const tag of article.tags ?? []) {
      const key = tag.toLowerCase()
      const entry = map.get(key)
      if (entry) {
        if (entry.name !== tag) entry.mixed = true
        if (!entry.articleIds.includes(article.id)) entry.articleIds.push(article.id)
      } else {
        map.set(key, { key, name: tag, mixed: false, articleIds: [article.id] })
      }
    }
  }
  return [...map.values()].sort((a, b) => b.articleIds.length - a.articleIds.length || a.key.localeCompare(b.key))
}

function parseArticles(raw: unknown): OwnArticle[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: OwnArticle[] = []
  let pinnedSeen = false
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const a = entry as Record<string, unknown>
    const id = typeof a.id === 'string' && /^my-[a-z0-9]{6,24}$/.test(a.id) ? a.id : null
    const title = clamp(a.title, ARTICLE_LIMITS.titleMax)
    const body = clamp(a.body, ARTICLE_LIMITS.bodyMax)
    const author = clamp(a.author, ARTICLE_LIMITS.authorMax)
    const section = typeof a.section === 'string' ? a.section : ''
    if (!id || !title || !body || !author || !isSection(section)) continue
    const image = typeof a.image === 'string' && DATA_IMAGE.test(a.image) && a.image.length <= ARTICLE_LIMITS.imageBytes ? a.image : undefined
    const links = Array.isArray(a.links) ? [...new Set(a.links.filter((l): l is string => typeof l === 'string' && /^https:\/\//.test(l)))].slice(0, 6) : []
    const tags = parseTags(a.tags)
    const publishAt = typeof a.publishAt === 'number' && Number.isFinite(a.publishAt) && a.publishAt > 0 ? a.publishAt : undefined
    const createdAt = typeof a.createdAt === 'number' && a.createdAt > 0 ? Math.min(a.createdAt, Date.now()) : Date.now()
    const article: OwnArticle = {
      id,
      title,
      summary: clamp(a.summary, ARTICLE_LIMITS.summaryMax),
      body,
      author,
      section,
      ...(image ? { image } : {}),
      ...(links.length ? { links } : {}),
      ...(tags.length ? { tags } : {}),
      ...(publishAt ? { publishAt } : {}),
      createdAt,
      updatedAt: typeof a.updatedAt === 'number' && a.updatedAt > 0 ? a.updatedAt : createdAt,
      hidden: a.hidden === true,
      pinned: a.pinned === true,
      headline: a.headline !== false,
    }
    if (seen.has(article.id)) continue
    seen.add(article.id)
    if (article.pinned) {
      if (pinnedSeen) article.pinned = false
      pinnedSeen = true
    }
    out.push(article)
  }
  return out.slice(0, MAX_ARTICLES)
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function ownToArticle(own: OwnArticle): Article {
  const summary = own.summary || `${own.body.replace(/\s+/g, ' ').slice(0, 200).trim()}${own.body.length > 200 ? '…' : ''}`
  return {
    id: own.id,
    title: own.title,
    link: `https://180news.co.za/story/${own.id}`,
    summary,
    ...(own.image ? { image: own.image } : {}),
    ...(own.links?.length ? { links: own.links } : {}),
    ...(own.tags?.length ? { tags: own.tags } : {}),
    author: own.author,
    published: own.publishAt ?? own.createdAt,
    feedId: 'own',
    sourceId: OWN_SOURCE,
    section: own.section,
    body: own.body,
  }
}

interface ControlValue {
  settings: Settings
  articles: OwnArticle[]
  ads: AdPlacements
  liveAt: number
  sections: { id: string; label: string }[]
  update: (patch: Partial<Settings>) => void
  resetSettings: () => void
  saveAd: (id: AdPlacementId, patch: Partial<AdConfig>) => void
  patchArticle: (id: string, patch: Partial<OwnArticle>) => void
  addArticle: (draft: Partial<OwnArticle>, editId?: string) => { ok: boolean; id?: string; error?: string }
  publishNow: (id: string) => void
  removeArticle: (id: string) => void
  renameTag: (oldTag: string, newTag: string) => void
  deleteTag: (tag: string) => void
}

const ControlContext = createContext<ControlValue | null>(null)

export function ControlProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => parseSettings(readJson(SETTINGS_KEY)))
  const [articles, setArticles] = useState<OwnArticle[]>(() => parseArticles(readJson(ARTICLES_KEY)))
  const [ads, setAds] = useState<AdPlacements>(() => parseAds(readJson(ADS_KEY)))
  const [liveAt, setLiveAt] = useState(() => Date.now())

  useEffect(() => {
    const scheduled = articles.map((a) => a.publishAt ?? 0).filter((t) => t > liveAt)
    if (!scheduled.length) return
    const wait = Math.min(Math.max(0, Math.min(...scheduled) - Date.now()) + 200, 2e9)
    const timer = window.setTimeout(() => setLiveAt(Date.now()), wait)
    return () => window.clearTimeout(timer)
  }, [articles, liveAt])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SETTINGS_KEY || event.key === null) setSettings(parseSettings(readJson(SETTINGS_KEY)))
      if (event.key === ARTICLES_KEY || event.key === null) setArticles(parseArticles(readJson(ARTICLES_KEY)))
      if (event.key === ADS_KEY || event.key === null) setAds(parseAds(readJson(ADS_KEY)))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const persistSettings = useCallback((next: Settings) => {
    setSettings(next)
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const persistArticles = useCallback((next: OwnArticle[]): boolean => {
    try {
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(next))
    } catch {
      return false
    }
    setArticles(next)
    return true
  }, [])

  const persistAds = useCallback((next: AdPlacements): boolean => {
    try {
      localStorage.setItem(ADS_KEY, JSON.stringify(next))
    } catch {
      return false
    }
    setAds(next)
    return true
  }, [])

  const update = useCallback((patch: Partial<Settings>) => persistSettings(parseSettings({ ...settings, ...patch })), [persistSettings, settings])
  const resetSettings = useCallback(() => persistSettings(DEFAULT_SETTINGS), [persistSettings])
  const saveAd = useCallback((id: AdPlacementId, patch: Partial<AdConfig>) => persistAds(parseAds({ ...ads, [id]: { ...ads[id], ...patch } })), [ads, persistAds])

  const patchArticle = useCallback(
    (id: string, patch: Partial<OwnArticle>) => {
      const next = articles.map((a) => (a.id === id ? { ...a, ...patch } : patch.pinned ? { ...a, pinned: false } : a))
      persistArticles(next)
    },
    [articles, persistArticles],
  )

  const addArticle = useCallback(
    (draft: Partial<OwnArticle>, editId?: string): { ok: boolean; id?: string; error?: string } => {
      const now = Date.now()
      const existing = editId ? articles.find((a) => a.id === editId) : undefined
      if (!existing && articles.length >= MAX_ARTICLES) return { ok: false, error: `You can keep up to ${MAX_ARTICLES} articles in this browser. Delete an older one first.` }
      const id = existing ? existing.id : `my-${now.toString(36)}${Math.random().toString(36).slice(2, 6).padEnd(4, '0')}`
      let publishAt = draft.publishAt
      let createdAt = existing?.createdAt ?? now
      if (existing?.publishAt && draft.publishAt === undefined) {
        if (existing.publishAt > now) createdAt = now
        else publishAt = existing.publishAt
      }
      const merged: OwnArticle = existing
        ? { ...existing, ...draft, publishAt, createdAt, updatedAt: now }
        : {
            hidden: false,
            pinned: false,
            headline: true,
            ...draft,
            id,
            createdAt: now,
            updatedAt: now,
          } as OwnArticle
      const validated = parseArticles([merged])
      if (!validated.length) return { ok: false, error: 'The article could not be saved. Check the headline, name and text.' }
      const article = validated[0]
      const list = existing ? articles.map((a) => (a.id === id ? article : a)) : [article, ...articles]
      const final = article.pinned ? list.map((a) => (a.id !== id && a.pinned ? { ...a, pinned: false } : a)) : list
      return persistArticles(final) ? { ok: true, id } : { ok: false, error: 'This browser’s storage is full. Remove the picture or delete an older article, then try again.' }
    },
    [articles, persistArticles],
  )

  const publishNow = useCallback(
    (id: string) => {
      const now = Date.now()
      persistArticles(articles.map((a) => (a.id === id ? { ...a, publishAt: undefined, createdAt: now, updatedAt: now } : a)))
    },
    [articles, persistArticles],
  )

  const removeArticle = useCallback(
    (id: string) => persistArticles(articles.filter((a) => a.id !== id)),
    [articles, persistArticles],
  )

  const renameTag = useCallback(
    (oldTag: string, newTag: string) => {
      const key = oldTag.toLowerCase()
      const next = articles.map((a) => {
        if (!a.tags?.some((t) => t.toLowerCase() === key)) return a
        const tags = parseTags(a.tags.flatMap((t) => (t.toLowerCase() === key ? (newTag ? [newTag] : []) : [t])))
        const copy = { ...a }
        if (tags.length) copy.tags = tags
        else delete copy.tags
        return copy
      })
      persistArticles(next)
    },
    [articles, persistArticles],
  )

  const deleteTag = useCallback((tag: string) => renameTag(tag, ''), [renameTag])

  const sections = useMemo(() => SECTIONS.filter((s) => !settings.hiddenSections.includes(s.id)), [settings.hiddenSections])

  const value = useMemo<ControlValue>(
    () => ({
      settings,
      articles,
      ads,
      liveAt,
      sections,
      update,
      resetSettings,
      saveAd,
      patchArticle,
      addArticle,
      publishNow,
      removeArticle,
      renameTag,
      deleteTag,
    }),
    [settings, articles, ads, liveAt, sections, update, resetSettings, saveAd, patchArticle, addArticle, publishNow, removeArticle, renameTag, deleteTag],
  )

  return <ControlContext.Provider value={value}>{children}</ControlContext.Provider>
}

export function useControl(): ControlValue {
  const ctx = useContext(ControlContext)
  if (!ctx) throw new Error('useControl must be used inside <ControlProvider>')
  return ctx
}
