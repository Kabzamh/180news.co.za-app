import type { FeedDef } from '../feeds'

export interface Article {
  id: string
  title: string
  link: string
  summary: string
  image?: string
  author?: string
  category?: string
  published: number | null
  feedId: string
  sourceId: string
  section: string
  slug?: string
  headline?: boolean
  body?: string
  media?: {
    id: string
    kind: 'photo' | 'video' | 'audio'
    caption?: string
    credit?: string
    url?: string
    width?: number
    height?: number
    contentType?: string
    position?: 'before' | 'after'
  }[]
  links?: string[]
  tags?: string[]
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))

export const cleanText = (raw: string): string =>
  decodeEntities(
    raw
      .replace(/<(script|style|figcaption|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6])>/gi, ' ')
      .replace(/<\/?[a-zA-Z][^>]*>/g, ''),
  )
    .replace(/[\u00a0\s]+/g, ' ')
    .trim()

const attr = (tag: string, name: string): string | undefined => {
  const m = new RegExp(`\\s${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag)
  return m ? decodeEntities(m[1] ?? m[2] ?? '').trim() : undefined
}

const BAD_IMG = /gravatar\.com|feedburner|\/emoji\/|s\.w\.org|pixel|1x1|spacer|\.svg(\?|$)/i

export function cleanUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined
  let url = raw.trim()
  if (url.startsWith('//')) url = `https:${url}`
  if (/^http:\/\//i.test(url)) url = `https://${url.slice(7)}`
  if (!/^https:\/\//i.test(url)) return undefined
  try {
    return new URL(url).href
  } catch {
    return undefined
  }
}

const upscaleBBC = (n: string): string => n.replace(/(ichef\.bbci\.co\.uk\/ace\/standard\/)\d+\//, '$1976/')

export function firstImage(html: string): string | undefined {
  const re = /<img\b[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const src = attr(m[0], 'src') ?? attr(m[0], 'data-src')
    if (!src || BAD_IMG.test(src)) continue
    const width = Number(attr(m[0], 'width'))
    if (width && width < 80) continue
    const url = cleanUrl(src)
    if (url) return upscaleBBC(url)
  }
  return undefined
}

export function articleId(link: string): string {
  let a = 3735928559
  let b = 1103547991
  for (let i = 0; i < link.length; i++) {
    const c = link.charCodeAt(i)
    a = Math.imul(a ^ c, 2654435761)
    b = Math.imul(b ^ c, 1597334677)
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909)
  b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909)
  return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36)
}

const SPONSORED = /^(sponsored|promoted|company news|partner content|press release|advertorial|brand ?voice|native content)/i
const NOISE_TAG = /^(news|sections?|top headlines|featured|latest|uncategori[sz]ed|fast news|show types|home|all)$/i

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${cut.slice(0, space > max * 0.6 ? space : max).replace(/[\s,;:.\u2013\u2014-]+$/, '')}…`
}

function cleanSummary(html: string, title: string): string {
  let s = cleanText(html)
    .replace(/\s*The post .{0,300}? appeared first on .{0,120}$/i, '')
    .replace(/\s*\[(?:…|\.\.\.)\]\s*$/u, '…')
    .replace(/\s*(Read more|Continue reading|Read the full story)\s*[.…»→]*\s*$/i, '')
    .trim()
  if (s.toLowerCase() === title.toLowerCase()) s = ''
  return truncate(s, 340)
}

function cleanAuthor(raw?: string): string | undefined {
  if (!raw) return undefined
  let name = cleanText(raw)
  const paren = /\(([^)]+)\)\s*$/.exec(name)
  if (paren && name.includes('@')) name = paren[1].trim()
  if (!name || name.includes('@') || name.length > 70) return undefined
  return name
}

export interface RawItem {
  title: string
  link: string
  descriptionHtml: string
  contentHtml: string
  image?: string
  author?: string
  categories: string[]
  published: number | null
}

export function normalizeItem(raw: RawItem, feed: FeedDef, now = Date.now()): Article | null {
  const title = cleanText(raw.title)
  const link = cleanUrl(raw.link)
  if (!title || !link) return null
  const cats = raw.categories.map((c) => cleanText(c)).filter(Boolean)
  if (cats.some((c) => SPONSORED.test(c))) return null
  let summary = cleanSummary(raw.descriptionHtml, title)
  if (!summary && raw.contentHtml) summary = cleanSummary(raw.contentHtml, title)
  const image = feed.noImages
    ? undefined
    : raw.image ?? firstImage(raw.descriptionHtml) ?? (raw.contentHtml ? firstImage(raw.contentHtml) : undefined)
  let published = raw.published
  if (published !== null && (!Number.isFinite(published) || published <= 0)) published = null
  if (published !== null && feed.dateFixMs) published += feed.dateFixMs
  if (published !== null && published > now) published = now
  const category = cats.find((c) => c.length <= 28 && !NOISE_TAG.test(c))
  const author = cleanAuthor(raw.author)
  return {
    id: articleId(link),
    title,
    link,
    summary,
    ...(image ? { image } : {}),
    ...(author ? { author } : {}),
    ...(category ? { category } : {}),
    published,
    feedId: feed.id,
    sourceId: feed.sourceId,
    section: feed.section,
  }
}

const MAX_AGE = 504 * 60 * 60 * 1000

export function dedupeItems(items: Article[], limit: number, now = Date.now()): Article[] {
  const seen = new Set<string>()
  const kept: Article[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    if (item.published !== null && now - item.published > MAX_AGE) continue
    seen.add(item.id)
    kept.push(item)
  }
  return kept.sort((a, b) => (b.published ?? 0) - (a.published ?? 0)).slice(0, limit)
}

export function isArticle(value: unknown): value is Article {
  if (!value || typeof value !== 'object') return false
  const a = value as Record<string, unknown>
  return (
    typeof a.id === 'string' &&
    typeof a.title === 'string' &&
    typeof a.link === 'string' &&
    /^https:\/\//.test(a.link) &&
    typeof a.summary === 'string' &&
    (a.image === undefined || (typeof a.image === 'string' && /^https?:\/\//.test(a.image))) &&
    (a.published === null || typeof a.published === 'number') &&
    typeof a.feedId === 'string' &&
    typeof a.sourceId === 'string' &&
    typeof a.section === 'string'
  )
}

export const byNewest = (a: Article, b: Article): number => (b.published ?? 0) - (a.published ?? 0)

/** Round-robin across sources so no single newsroom dominates the top of a list. */
export function interleave(items: Article[], windowMs = 1080 * 60 * 1000): Article[] {
  if (items.length < 3) return [...items].sort(byNewest)
  const sorted = [...items].sort(byNewest)
  const newest = sorted[0].published ?? 0
  const fresh = sorted.filter((i) => (i.published ?? 0) >= newest - windowMs)
  const older = sorted.filter((i) => (i.published ?? 0) < newest - windowMs)
  const bySource = new Map<string, Article[]>()
  for (const item of fresh) {
    const list = bySource.get(item.sourceId)
    if (list) list.push(item)
    else bySource.set(item.sourceId, [item])
  }
  const out: Article[] = []
  let queues = [...bySource.values()]
  while (queues.length) {
    queues.sort((a, b) => byNewest(a[0], b[0]))
    for (const q of queues) out.push(q.shift()!)
    queues = queues.filter((q) => q.length)
  }
  return [...out, ...older]
}
