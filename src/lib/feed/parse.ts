import type { FeedDef, NewsItem } from './types'

/**
 * Dependency-free RSS parsing shared by the browser, the serverless feed
 * endpoint and the snapshot script, so every path normalises stories the
 * same way.
 */

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', sbquo: '‚', bdquo: '„',
  ndash: '–', mdash: '—', hellip: '…', bull: '•', middot: '·',
  copy: '©', reg: '®', trade: '™', deg: '°', times: '×', frac12: '½', frac14: '¼',
  pound: '£', euro: '€', cent: '¢', yen: '¥', laquo: '«', raquo: '»',
  shy: '', zwnj: '', zwj: '', ensp: ' ', emsp: ' ', thinsp: ' ',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', aacute: 'á', agrave: 'à', acirc: 'â',
  auml: 'ä', aring: 'å', atilde: 'ã', ccedil: 'ç', iacute: 'í', icirc: 'î', iuml: 'ï',
  ntilde: 'ñ', oacute: 'ó', ocirc: 'ô', ouml: 'ö', oslash: 'ø', otilde: 'õ',
  uacute: 'ú', ucirc: 'û', uuml: 'ü', szlig: 'ß',
  Eacute: 'É', Aacute: 'Á', Ouml: 'Ö', Uuml: 'Ü', Ccedil: 'Ç',
}

export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const hex = entity[1] === 'x' || entity[1] === 'X'
      const code = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10)
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match
      try {
        return String.fromCodePoint(code)
      } catch {
        return match
      }
    }
    return NAMED[entity] ?? NAMED[entity.toLowerCase()] ?? match
  })
}

/** XML text node -> HTML string. CDATA is passed through, plain text is unescaped once. */
function xmlTextToHtml(raw: string): string {
  let out = ''
  let last = 0
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw))) {
    out += decodeEntities(raw.slice(last, m.index))
    out += m[1]
    last = re.lastIndex
  }
  out += decodeEntities(raw.slice(last))
  return out
}

/** HTML -> plain text. Output is only ever rendered as text, never as markup. */
export function htmlToText(html: string): string {
  const stripped = html
    .replace(/<(script|style|figcaption|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
  return decodeEntities(stripped).replace(/[\u00a0\s]+/g, ' ').trim()
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function tagContent(block: string, name: string): string | null {
  const n = escapeRe(name)
  const m = new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, 'i').exec(block)
  return m ? m[1] : null
}

function allTagContents(block: string, name: string): string[] {
  const n = escapeRe(name)
  const re = new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, 'gi')
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(block))) out.push(m[1])
  return out
}

function attr(tag: string, name: string): string | undefined {
  const m = new RegExp(`\\s${escapeRe(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag)
  if (!m) return undefined
  return decodeEntities(m[1] ?? m[2] ?? '').trim()
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i
const JUNK_IMAGE = /gravatar\.com|feedburner|\/emoji\/|s\.w\.org|pixel|1x1|spacer|\.svg(\?|$)/i

/** Only https URLs survive; http is upgraded so nothing triggers mixed-content blocking. */
export function safeUrl(input: string | undefined | null): string | undefined {
  if (!input) return undefined
  let u = input.trim()
  if (u.startsWith('//')) u = `https:${u}`
  if (/^http:\/\//i.test(u)) u = `https://${u.slice(7)}`
  if (!/^https:\/\//i.test(u)) return undefined
  try {
    return new URL(u).href
  } catch {
    return undefined
  }
}

function tuneImage(url: string): string {
  // BBC feeds ship 240px thumbnails; the same asset is served at larger widths.
  return url.replace(/(ichef\.bbci\.co\.uk\/ace\/standard\/)\d+\//, '$1976/')
}

function imageFromHtml(html: string): string | undefined {
  const re = /<img\b[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const src = attr(m[0], 'src') ?? attr(m[0], 'data-src')
    if (!src || JUNK_IMAGE.test(src)) continue
    const w = Number(attr(m[0], 'width'))
    if (w && w < 80) continue
    const url = safeUrl(src)
    if (url) return url
  }
  return undefined
}

function imageFromItem(block: string): string | undefined {
  let best: { url: string; width: number } | undefined
  const media = /<media:content\b[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = media.exec(block))) {
    const url = attr(m[0], 'url')
    if (!url || JUNK_IMAGE.test(url)) continue
    const medium = attr(m[0], 'medium')
    const type = attr(m[0], 'type')
    const isImage = medium ? medium === 'image' : type ? type.startsWith('image/') : IMAGE_EXT.test(url)
    if (!isImage) continue
    const width = Number(attr(m[0], 'width')) || 0
    if (!best || width > best.width) best = { url, width }
  }
  if (best) return safeUrl(best.url)

  const enclosure = /<enclosure\b[^>]*>/gi
  while ((m = enclosure.exec(block))) {
    const url = attr(m[0], 'url')
    const type = attr(m[0], 'type')
    if (!url) continue
    if (type ? type.startsWith('image/') : IMAGE_EXT.test(url)) {
      const safe = safeUrl(url)
      if (safe) return safe
    }
  }

  const thumb = /<media:thumbnail\b[^>]*>/i.exec(block)
  if (thumb) {
    const safe = safeUrl(attr(thumb[0], 'url'))
    if (safe) return safe
  }
  return undefined
}

/** cyrb53 – stable short id derived from the story URL. */
export function hashId(input: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

const SPONSORED = /^(sponsored|promoted|company news|partner content|press release|advertorial|brand ?voice|native content)/i
const GENERIC_CATEGORY = /^(news|sections?|top headlines|featured|latest|uncategori[sz]ed|fast news|show types|home|all)$/i

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${cut.slice(0, space > max * 0.6 ? space : max).replace(/[\s,;:.–—-]+$/, '')}…`
}

function cleanSummary(html: string, title: string): string {
  let text = htmlToText(html)
    .replace(/\s*The post .{0,300}? appeared first on .{0,120}$/i, '')
    .replace(/\s*\[(?:…|\.\.\.)\]\s*$/, '…')
    .replace(/\s*(Read more|Continue reading|Read the full story)\s*[.…»→]*\s*$/i, '')
    .trim()
  if (text.toLowerCase() === title.toLowerCase()) text = ''
  return truncate(text, 340)
}

function cleanAuthor(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined
  let a = htmlToText(raw)
  const named = /\(([^)]+)\)\s*$/.exec(a)
  if (named && a.includes('@')) a = named[1].trim()
  if (!a || a.includes('@') || a.length > 70) return undefined
  return a
}

export interface RawStory {
  title: string
  link: string | undefined | null
  descriptionHtml: string
  contentHtml?: string
  image?: string
  author?: string | null
  categories: string[]
  published: number | null
}

export function buildItem(raw: RawStory, feed: FeedDef, now = Date.now()): NewsItem | null {
  const title = htmlToText(raw.title)
  const link = safeUrl(raw.link)
  if (!title || !link) return null

  const categories = raw.categories.map((c) => htmlToText(c)).filter(Boolean)
  if (categories.some((c) => SPONSORED.test(c))) return null

  let summary = cleanSummary(raw.descriptionHtml, title)
  if (!summary && raw.contentHtml) summary = cleanSummary(raw.contentHtml, title)

  const image = feed.noImages
    ? undefined
    : (raw.image ?? imageFromHtml(raw.descriptionHtml) ?? (raw.contentHtml ? imageFromHtml(raw.contentHtml) : undefined))

  let published = raw.published
  if (published !== null && (!Number.isFinite(published) || published <= 0)) published = null
  if (published !== null && feed.dateFixMs) published += feed.dateFixMs
  if (published !== null && published > now) published = now

  const category = categories.find((c) => c.length <= 28 && !GENERIC_CATEGORY.test(c))
  const author = cleanAuthor(raw.author)

  return {
    id: hashId(link),
    title,
    link,
    summary,
    ...(image ? { image: tuneImage(image) } : {}),
    ...(author ? { author } : {}),
    ...(category ? { category } : {}),
    published,
    feedId: feed.id,
    sourceId: feed.sourceId,
    section: feed.section,
  }
}

const MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000

export function finalize(items: NewsItem[], limit: number, now = Date.now()): NewsItem[] {
  const seen = new Set<string>()
  const out: NewsItem[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    if (item.published !== null && now - item.published > MAX_AGE_MS) continue
    seen.add(item.id)
    out.push(item)
  }
  out.sort((a, b) => (b.published ?? 0) - (a.published ?? 0))
  return out.slice(0, limit)
}

export function parseFeed(xml: string, feed: FeedDef, limit = 24): NewsItem[] {
  const now = Date.now()
  const items: NewsItem[] = []
  const re = /<item\b[\s\S]*?<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    const block = m[0]
    const dateRaw = tagContent(block, 'pubDate') ?? tagContent(block, 'dc:date') ?? tagContent(block, 'published')
    const parsedDate = dateRaw ? Date.parse(htmlToText(xmlTextToHtml(dateRaw))) : NaN
    const contentRaw = tagContent(block, 'content:encoded')
    const item = buildItem(
      {
        title: xmlTextToHtml(tagContent(block, 'title') ?? ''),
        link: htmlToText(xmlTextToHtml(tagContent(block, 'link') ?? '')),
        descriptionHtml: xmlTextToHtml(tagContent(block, 'description') ?? ''),
        contentHtml: contentRaw ? xmlTextToHtml(contentRaw) : undefined,
        image: imageFromItem(block),
        author: (() => {
          const a = tagContent(block, 'dc:creator') ?? tagContent(block, 'author')
          return a ? xmlTextToHtml(a) : null
        })(),
        categories: allTagContents(block, 'category').map(xmlTextToHtml),
        published: Number.isNaN(parsedDate) ? null : parsedDate,
      },
      feed,
      now,
    )
    if (item) items.push(item)
  }
  return finalize(items, limit, now)
}

/** Runtime guard for stories arriving from the network, cache or snapshot. */
export function isNewsItem(value: unknown): value is NewsItem {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.link === 'string' &&
    /^https:\/\//.test(v.link) &&
    typeof v.summary === 'string' &&
    (v.image === undefined || (typeof v.image === 'string' && /^https:\/\//.test(v.image))) &&
    (v.published === null || typeof v.published === 'number') &&
    typeof v.feedId === 'string' &&
    typeof v.sourceId === 'string' &&
    typeof v.section === 'string'
  )
}
