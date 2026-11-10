import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { OWN_SOURCE, PUBLISHERS, SECTIONS, SECTION_BY_ID } from './feed/sources'
import type { MediaRef, NewsItem, SectionDef, SectionId } from './feed/types'
import { cleanLinks } from './links'
import { MEDIA_LIMITS, clearAllMedia, deleteMedia, isMediaId, sweepMedia } from './media'

/**
 * Owner controls and reader-written articles.
 *
 * Both are kept in this browser's localStorage: there is no shared database
 * behind the app, so nothing here reaches other devices. The pages that use
 * this say so, and offer an export/import file and an email hand-off instead.
 */

export type CrawlSpeed = 'slow' | 'normal' | 'fast'
export const REFRESH_CHOICES = [3, 5, 10, 15, 0] as const

export interface Settings {
  hiddenSections: SectionId[]
  hiddenSources: string[]
  crawlEnabled: boolean
  crawlSpeed: CrawlSpeed
  crawlMessage: string
  /** Minutes between automatic feed checks; 0 means only on request. */
  refreshMinutes: number
  /** Show the author's scheduled articles in a panel on the front page. */
  showScheduled: boolean
  /** Master switch for every advert, including the "Advertise with us" notice. */
  adsOn: boolean
  email: string
  phone: string
  adPhone: string
}

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

export interface Article {
  id: string
  title: string
  summary: string
  body: string
  author: string
  section: SectionId
  /** Resized JPEG as a data URL. */
  image?: string
  /** Extra photos, video and audio; the files themselves are in the media store. */
  media?: MediaRef[]
  /** YouTube and Facebook links, shown after the text. */
  links?: string[]
  /** Topic tags chosen by the author. */
  tags?: string[]
  /** When set and still ahead, the article is scheduled and stays off the site until then. */
  publishAt?: number
  createdAt: number
  updatedAt: number
  hidden: boolean
  /** Leads the front page. */
  pinned: boolean
  /** Shown in the headline news at the top of the front page. */
  headline: boolean
}

export type ArticleInput = Pick<Article, 'title' | 'summary' | 'body' | 'author' | 'section' | 'image' | 'media' | 'links' | 'tags' | 'publishAt'>

export const LIMITS = { titleMin: 8, titleMax: 140, summaryMax: 300, bodyMin: 80, bodyMax: 20000, authorMin: 2, authorMax: 60, messageMax: 140 }
const MAX_ARTICLES = 50
export const TAG_LIMIT = 5
export const TAG_MAX = 24

/** "Ward 12, #Water" -> ["Ward 12", "Water"]: trimmed, de-duplicated regardless of case. Over-long tags are kept so the form can point them out. */
export function parseTags(input: string): string[] {
  const out: string[] = []
  for (const part of input.split(/[,\n]/)) {
    const tag = part.replace(/[#/\\?%]/g, ' ').replace(/\s+/g, ' ').trim()
    if (tag && !out.some((t) => t.toLowerCase() === tag.toLowerCase())) out.push(tag)
  }
  return out
}

function cleanTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return parseTags(raw.filter((t): t is string => typeof t === 'string').join(','))
    .filter((t) => t.length <= TAG_MAX)
    .slice(0, TAG_LIMIT)
}

export const tagPath = (tag: string) => `/tag/${encodeURIComponent(tag.toLowerCase())}`

export interface TagUse {
  /** Lower-cased, the way tags are matched. */
  key: string
  /** As first written. */
  name: string
  /** True when articles spell it with different capitals. */
  mixed: boolean
  articleIds: string[]
}

/** Every tag on the given articles, most used first. */
export function tagsInUse(articles: Array<{ id: string; tags?: string[] }>): TagUse[] {
  const byKey = new Map<string, TagUse>()
  for (const article of articles) {
    for (const tag of article.tags ?? []) {
      const key = tag.toLowerCase()
      const use = byKey.get(key)
      if (!use) byKey.set(key, { key, name: tag, mixed: false, articleIds: [article.id] })
      else {
        if (use.name !== tag) use.mixed = true
        if (!use.articleIds.includes(article.id)) use.articleIds.push(article.id)
      }
    }
  }
  return [...byKey.values()].sort((a, b) => b.articleIds.length - a.articleIds.length || a.key.localeCompare(b.key))
}

/* ---------------- ad slots ---------------- */

export type AdSlotId = 'home' | 'article' | 'header' | 'banner'

/** Where a slot sits. The first four belong to the front page, the next two to story pages, then the site header, and the last two to the top banner. */
export type AdPosition = 'top' | 'elections' | 'middle' | 'bottom' | 'inline' | 'below' | 'header' | 'abovemenu' | 'verytop'

export const AD_SLOTS: Array<{
  id: AdSlotId
  name: string
  where: string
  /** The shape of image that suits the slot. */
  shape?: string
  /** Wording for the slot's on/off switch, where "Show on …" does not read well. */
  switchLabel?: string
  /** Carries uploaded adverts only: with none, the slot shows nothing instead of the "Advertise with us" notice. */
  adsOnly?: boolean
  fallback: AdPosition
  positions: Array<[AdPosition, string]>
}> = [
  {
    id: 'home',
    name: 'Front page',
    where: 'One advert on the front page.',
    fallback: 'elections',
    positions: [
      ['top', 'Directly under the headline news'],
      ['elections', 'After the Elections update'],
      ['middle', 'Mid-page, above Sport'],
      ['bottom', 'End of the page'],
    ],
  },
  {
    id: 'article',
    name: 'Story pages',
    where: 'One advert on every story and article.',
    fallback: 'inline',
    positions: [
      ['inline', 'Straight after the story'],
      ['below', 'Lower down, after the related headlines'],
    ],
  },
  {
    id: 'header',
    name: 'Site header',
    where: 'One advert at the top of every public page.',
    shape: 'A compact banner about four times as wide as it is tall works best here, for example 480 by 120. It is shown up to 60 pixels tall, and 44 on a phone, where a long thin banner becomes too small to read.',
    fallback: 'header',
    positions: [['header', 'Beside the logo, in the same row, on every screen size']],
  },
  {
    id: 'banner',
    name: 'Top banner',
    where: 'A full-width banner directly above the navigation bar on every public page. It carries adverts only: nothing is shown until an advert is uploaded.',
    shape: 'A wide leaderboard works best here: 728 by 90. It is shown up to 90 pixels tall, and scaled to the width of the screen on a phone, where it is about 44 pixels tall.',
    switchLabel: 'Show the top banner',
    adsOnly: true,
    // The first position is the default. A banner saved under the earlier default ("pagetop", no longer
    // a position) falls back to it, so it too moves to directly above the navigation bar.
    fallback: 'abovemenu',
    positions: [
      ['abovemenu', 'Above the navigation bar'],
      ['verytop', 'Very top of the page'],
    ],
  },
]

export interface Ad {
  enabled: boolean
  position: AdPosition
  /** Resized JPEG as a data URL. Without one, the slot carries the "Advertise with us" notice. */
  image?: string
  /** Pixel size of that image, so its place can be held while it loads. */
  w?: number
  h?: number
  /** Advertiser name, read out as the description of the image. */
  name: string
  url: string
}

export const AD_IMAGE_MAX = 900_000
const DATA_IMAGE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

/** Web address for an advert: '' when empty, a normalised https/http URL, or null when it is not one. */
export function adLink(input: string): string | null {
  let raw = input.trim()
  if (!raw) return ''
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `https://${raw}`
  try {
    const u = new URL(raw)
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || !u.hostname.includes('.') || u.username || u.password) return null
    return u.href
  } catch {
    return null
  }
}

function cleanAds(raw: unknown): Record<AdSlotId, Ad> {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const one = (id: AdSlotId): Ad => {
    const slot = AD_SLOTS.find((s) => s.id === id) ?? AD_SLOTS[0]
    const value = r[id]
    const a = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
    const image = typeof a.image === 'string' && DATA_IMAGE.test(a.image) && a.image.length <= AD_IMAGE_MAX ? a.image : undefined
    const side = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 20000 ? Math.round(value) : 0)
    const w = side(a.w)
    const h = side(a.h)
    return {
      enabled: a.enabled !== false,
      position: slot.positions.find(([p]) => p === a.position)?.[0] ?? slot.fallback,
      ...(image ? { image } : {}),
      ...(image && w && h ? { w, h } : {}),
      name: text(a.name, 80),
      url: (typeof a.url === 'string' && adLink(a.url)) || '',
    }
  }
  return { home: one('home'), article: one('article'), header: one('header'), banner: one('banner') }
}
/** How many reader articles the headline block beside the lead story holds. */
export const HEADLINE_SLOTS = 6
const MAX_IMAGE_CHARS = 700_000
const SETTINGS_KEY = '180news:control:v1'
const ARTICLES_KEY = '180news:articles:v1'
const ADS_KEY = '180news:ads:v1'

/**
 * Erase what the admin tools keep on this device: settings, adverts, articles
 * (with their files) and any unfinished draft. Saved stories are left alone.
 * The page must be reloaded afterwards.
 */
export async function eraseDeviceData(): Promise<void> {
  for (const key of [SETTINGS_KEY, ARTICLES_KEY, ADS_KEY, '180news:draft:v1']) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* storage unavailable: there is nothing to remove */
    }
  }
  await clearAllMedia()
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
export const isPhone = (value: string) => /^[+\d][\d\s()-]*$/.test(value) && value.replace(/\D/g, '').length >= 7
export const telHref = (value: string) => `tel:${value.replace(/[^\d+]/g, '')}`

const isSection = (value: unknown): value is SectionId => typeof value === 'string' && Object.prototype.hasOwnProperty.call(SECTION_BY_ID, value)
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

function cleanSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const list = (value: unknown) => (Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string'))] : [])

  let hiddenSections = list(r.hiddenSections).filter(isSection)
  // Never allow every section to be switched off – there would be no front page.
  if (hiddenSections.length >= SECTIONS.length) hiddenSections = []
  const hiddenSources = list(r.hiddenSources).filter((id) => Object.prototype.hasOwnProperty.call(PUBLISHERS, id))

  const email = text(r.email, 120)
  const phone = text(r.phone, 30)
  const adPhone = text(r.adPhone, 30)
  const refresh = Number(r.refreshMinutes)

  return {
    hiddenSections,
    hiddenSources,
    crawlEnabled: typeof r.crawlEnabled === 'boolean' ? r.crawlEnabled : DEFAULT_SETTINGS.crawlEnabled,
    crawlSpeed: r.crawlSpeed === 'slow' || r.crawlSpeed === 'fast' ? r.crawlSpeed : 'normal',
    // Not trimmed here so spaces can be typed; trimmed where it is shown.
    crawlMessage: typeof r.crawlMessage === 'string' ? r.crawlMessage.replace(/\s+/g, ' ').slice(0, LIMITS.messageMax) : '',
    refreshMinutes: (REFRESH_CHOICES as readonly number[]).includes(refresh) ? refresh : DEFAULT_SETTINGS.refreshMinutes,
    showScheduled: r.showScheduled !== false,
    adsOn: r.adsOn !== false,
    email: isEmail(email) ? email : DEFAULT_SETTINGS.email,
    phone: isPhone(phone) ? phone : DEFAULT_SETTINGS.phone,
    adPhone: isPhone(adPhone) ? adPhone : DEFAULT_SETTINGS.adPhone,
  }
}

function cleanMedia(raw: unknown): MediaRef[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: MediaRef[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || out.length >= MEDIA_LIMITS.perArticle) continue
    const r = entry as Record<string, unknown>
    if (!isMediaId(r.id) || seen.has(r.id)) continue
    if (r.kind !== 'photo' && r.kind !== 'video' && r.kind !== 'audio') continue
    seen.add(r.id)
    const caption = text(r.caption, MEDIA_LIMITS.captionMax)
    out.push({
      id: r.id,
      kind: r.kind,
      name: text(r.name, 120) || 'file',
      type: text(r.type, 80),
      size: typeof r.size === 'number' && r.size > 0 ? r.size : 0,
      ...(typeof r.duration === 'number' && Number.isFinite(r.duration) && r.duration > 0 ? { duration: r.duration } : {}),
      ...(caption ? { caption } : {}),
    })
  }
  return out
}

const mediaIds = (list: Article[]) => list.flatMap((a) => (a.media ?? []).map((m) => m.id))

function cleanArticle(raw: unknown): Article | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = typeof r.id === 'string' && /^my-[a-z0-9]{6,24}$/.test(r.id) ? r.id : null
  const title = text(r.title, LIMITS.titleMax)
  const body = text(r.body, LIMITS.bodyMax)
  const author = text(r.author, LIMITS.authorMax)
  if (!id || !title || !body || !author || !isSection(r.section)) return null
  const image =
    typeof r.image === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(r.image) && r.image.length <= MAX_IMAGE_CHARS
      ? r.image
      : undefined
  const media = cleanMedia(r.media)
  const links = cleanLinks(r.links)
  const tags = cleanTags(r.tags)
  const publishAt = typeof r.publishAt === 'number' && Number.isFinite(r.publishAt) && r.publishAt > 0 ? r.publishAt : undefined
  const createdAt = typeof r.createdAt === 'number' && r.createdAt > 0 ? Math.min(r.createdAt, Date.now()) : Date.now()
  return {
    id,
    title,
    summary: text(r.summary, LIMITS.summaryMax),
    body,
    author,
    section: r.section,
    ...(image ? { image } : {}),
    ...(media.length ? { media } : {}),
    ...(links.length ? { links } : {}),
    ...(tags.length ? { tags } : {}),
    ...(publishAt ? { publishAt } : {}),
    createdAt,
    updatedAt: typeof r.updatedAt === 'number' && r.updatedAt > 0 ? r.updatedAt : createdAt,
    hidden: r.hidden === true,
    pinned: r.pinned === true,
    headline: r.headline !== false,
  }
}

function cleanArticles(raw: unknown): Article[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: Article[] = []
  let pinned = false
  for (const entry of raw) {
    const article = cleanArticle(entry)
    if (!article || seen.has(article.id)) continue
    seen.add(article.id)
    if (article.pinned) {
      if (pinned) article.pinned = false
      pinned = true
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

/** A reader's article in the shape the rest of the app lists and opens. */
export function articleToItem(article: Article): NewsItem {
  const summary = article.summary || `${article.body.replace(/\s+/g, ' ').slice(0, 200).trim()}${article.body.length > 200 ? '…' : ''}`
  return {
    id: article.id,
    title: article.title,
    link: `https://180news.co.za/story/${article.id}`,
    summary,
    ...(article.image ? { image: article.image } : {}),
    ...(article.media?.length ? { media: article.media } : {}),
    ...(article.links?.length ? { links: article.links } : {}),
    ...(article.tags?.length ? { tags: article.tags } : {}),
    author: article.author,
    published: article.publishAt ?? article.createdAt,
    feedId: 'own',
    sourceId: OWN_SOURCE,
    section: article.section,
    body: article.body,
  }
}

export type Result = { ok: true; id: string } | { ok: false; error: string }

interface ControlValue {
  settings: Settings
  /** Sections that are switched on, in display order. */
  sections: SectionDef[]
  update: (patch: Partial<Settings>) => void
  resetSettings: () => void
  articles: Article[]
  /** Articles scheduled for after this moment are not on the site yet. It moves forward as each one falls due. */
  liveAt: number
  /** Put a scheduled article on the site straight away. */
  publishNow: (id: string) => void
  /** Rename a tag on every article that carries it (matching regardless of case). False when storage is full. */
  renameTag: (from: string, to: string) => boolean
  /** Take a tag off every article that carries it. */
  removeTag: (tag: string) => boolean
  ads: Record<AdSlotId, Ad>
  /** False when the browser's storage is full. */
  saveAd: (id: AdSlotId, ad: Ad) => boolean
  saveArticle: (input: ArticleInput, id?: string) => Result
  patchArticle: (id: string, patch: { hidden?: boolean; pinned?: boolean; headline?: boolean }) => void
  removeArticle: (id: string) => void
  exportData: () => string
  importData: (json: string) => { ok: true; articles: number } | { ok: false; error: string }
}

const STORAGE_FULL = 'This browser’s storage is full. Remove the picture or delete an older article, then try again.'
const ControlContext = createContext<ControlValue | null>(null)

export function ControlProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => cleanSettings(readJson(SETTINGS_KEY)))
  const [articles, setArticles] = useState<Article[]>(() => cleanArticles(readJson(ARTICLES_KEY)))
  const [ads, setAds] = useState<Record<AdSlotId, Ad>>(() => cleanAds(readJson(ADS_KEY)))
  const [liveAt, setLiveAt] = useState(() => Date.now())
  const settingsRef = useRef(settings)
  const articlesRef = useRef(articles)
  const adsRef = useRef(ads)

  // Wake up when the next scheduled article falls due, so it appears without a reload.
  useEffect(() => {
    const upcoming = articles.map((a) => a.publishAt ?? 0).filter((t) => t > liveAt)
    if (!upcoming.length) return
    // Timers cannot be set further than about 24 days ahead; a shorter wait simply re-arms.
    const wait = Math.min(Math.max(0, Math.min(...upcoming) - Date.now()) + 200, 2_000_000_000)
    const timer = window.setTimeout(() => setLiveAt(Date.now()), wait)
    return () => window.clearTimeout(timer)
  }, [articles, liveAt])

  // Clear out stored files that no article points to any more.
  useEffect(() => {
    void sweepMedia(new Set(mediaIds(articlesRef.current)))
  }, [])

  // Stay in step with other open tabs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SETTINGS_KEY || e.key === null) {
        settingsRef.current = cleanSettings(readJson(SETTINGS_KEY))
        setSettings(settingsRef.current)
      }
      if (e.key === ARTICLES_KEY || e.key === null) {
        articlesRef.current = cleanArticles(readJson(ARTICLES_KEY))
        setArticles(articlesRef.current)
      }
      if (e.key === ADS_KEY || e.key === null) {
        adsRef.current = cleanAds(readJson(ADS_KEY))
        setAds(adsRef.current)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const commitSettings = useCallback((next: Settings) => {
    settingsRef.current = next
    setSettings(next)
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    } catch {
      /* the change still applies for this visit */
    }
  }, [])

  /** Articles are only accepted once they are safely stored. */
  const commitArticles = useCallback((next: Article[]): boolean => {
    try {
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(next))
    } catch {
      return false
    }
    articlesRef.current = next
    setArticles(next)
    return true
  }, [])

  const commitAds = useCallback((next: Record<AdSlotId, Ad>): boolean => {
    try {
      localStorage.setItem(ADS_KEY, JSON.stringify(next))
    } catch {
      return false
    }
    adsRef.current = next
    setAds(next)
    return true
  }, [])

  const saveAd = useCallback((id: AdSlotId, ad: Ad) => commitAds(cleanAds({ ...adsRef.current, [id]: ad })), [commitAds])

  const publishNow = useCallback(
    (id: string) => {
      const now = Date.now()
      commitArticles(articlesRef.current.map((a) => (a.id === id ? { ...a, publishAt: undefined, createdAt: now, updatedAt: now } : a)))
    },
    [commitArticles],
  )

  const update = useCallback((patch: Partial<Settings>) => commitSettings(cleanSettings({ ...settingsRef.current, ...patch })), [commitSettings])
  const resetSettings = useCallback(() => commitSettings(DEFAULT_SETTINGS), [commitSettings])

  const saveArticle = useCallback(
    (input: ArticleInput, id?: string): Result => {
      const now = Date.now()
      const list = articlesRef.current
      const existing = id ? list.find((a) => a.id === id) : undefined
      if (!existing && list.length >= MAX_ARTICLES) {
        return { ok: false, error: `You can keep up to ${MAX_ARTICLES} articles in this browser. Delete an older one first.` }
      }
      const articleId = existing ? existing.id : `my-${now.toString(36)}${Math.random().toString(36).slice(2, 6).padEnd(4, '0')}`
      let publishAt = input.publishAt
      let createdAt = existing?.createdAt ?? now
      if (existing?.publishAt && publishAt === undefined) {
        // Publishing a scheduled article early dates it now; one that is already out keeps its publication time.
        if (existing.publishAt > now) createdAt = now
        else publishAt = existing.publishAt
      }
      const draft = existing
        ? { ...existing, ...input, publishAt, createdAt, updatedAt: now }
        : { ...input, id: articleId, createdAt: now, updatedAt: now, hidden: false, pinned: false, headline: true }
      const article = cleanArticle(draft)
      if (!article) return { ok: false, error: 'The article could not be saved. Check the headline, name and text.' }
      const next = existing ? list.map((a) => (a.id === articleId ? article : a)) : [article, ...list]
      return commitArticles(next) ? { ok: true, id: articleId } : { ok: false, error: STORAGE_FULL }
    },
    [commitArticles],
  )

  const retag = useCallback(
    (from: string, to: string | null): boolean => {
      const key = from.toLowerCase()
      const next = articlesRef.current.map((a) => {
        if (!a.tags?.some((t) => t.toLowerCase() === key)) return a
        // Renaming onto a tag the article already has leaves a single copy.
        const tags = cleanTags(a.tags.flatMap((t) => (t.toLowerCase() === key ? (to ? [to] : []) : [t])))
        const copy: Article = { ...a }
        if (tags.length) copy.tags = tags
        else delete copy.tags
        return copy
      })
      return commitArticles(next)
    },
    [commitArticles],
  )
  const renameTag = useCallback((from: string, to: string) => retag(from, to), [retag])
  const removeTag = useCallback((tag: string) => retag(tag, null), [retag])

  const patchArticle = useCallback(
    (id: string, patch: { hidden?: boolean; pinned?: boolean; headline?: boolean }) => {
      const next = articlesRef.current.map((a) => {
        if (a.id === id) return { ...a, ...patch }
        // Only one article leads the front page at a time.
        return patch.pinned ? { ...a, pinned: false } : a
      })
      commitArticles(next)
    },
    [commitArticles],
  )

  const removeArticle = useCallback(
    (id: string) => {
      const gone = articlesRef.current.filter((a) => a.id === id)
      // Its photos, video and audio go with it.
      if (commitArticles(articlesRef.current.filter((a) => a.id !== id))) void deleteMedia(mediaIds(gone))
    },
    [commitArticles],
  )

  const exportData = useCallback(
    () => JSON.stringify({ app: '180news', version: 1, exportedAt: new Date().toISOString(), settings: settingsRef.current, ads: adsRef.current, articles: articlesRef.current }, null, 2),
    [],
  )

  const importData = useCallback(
    (json: string): { ok: true; articles: number } | { ok: false; error: string } => {
      let data: unknown
      try {
        data = JSON.parse(json)
      } catch {
        return { ok: false, error: 'That file is not a 180news backup.' }
      }
      const r = data as { app?: unknown; settings?: unknown; articles?: unknown; ads?: unknown } | null
      if (!r || typeof r !== 'object' || r.app !== '180news') return { ok: false, error: 'That file is not a 180news backup.' }
      const nextArticles = cleanArticles(r.articles)
      if (!commitArticles(nextArticles)) return { ok: false, error: STORAGE_FULL }
      commitSettings(cleanSettings(r.settings))
      // Backups made before ad slots existed carry none, and older ones lack the newer slots;
      // whatever a backup does not carry is left as it is.
      if (r.ads && typeof r.ads === 'object' && !commitAds(cleanAds({ ...adsRef.current, ...r.ads }))) return { ok: false, error: STORAGE_FULL }
      return { ok: true, articles: nextArticles.length }
    },
    [commitArticles, commitSettings, commitAds],
  )

  const sections = useMemo(() => SECTIONS.filter((s) => !settings.hiddenSections.includes(s.id)), [settings.hiddenSections])

  const value = useMemo<ControlValue>(
    () => ({ settings, sections, update, resetSettings, articles, liveAt, publishNow, renameTag, removeTag, ads, saveAd, saveArticle, patchArticle, removeArticle, exportData, importData }),
    [settings, sections, update, resetSettings, articles, liveAt, publishNow, renameTag, removeTag, ads, saveAd, saveArticle, patchArticle, removeArticle, exportData, importData],
  )

  return <ControlContext.Provider value={value}>{children}</ControlContext.Provider>
}

export function useControl(): ControlValue {
  const ctx = useContext(ControlContext)
  if (!ctx) throw new Error('useControl must be used inside <ControlProvider>')
  return ctx
}
