/**
 * Client for the 180news Newsroom CMS (cms.180news.co.za).
 *
 * Published stories are fetched from the CMS's public read API and mapped into
 * the same Article shape the feeds produce, so CMS stories appear on the front
 * page, in sections, in search and on story pages alongside newsroom feeds.
 */
import type { Article } from './news/parse'

export const CMS_BASE = 'https://cms.180news.co.za'

export const cmsStoryLink = (slug: string): string => `https://180news.co.za/story/${slug}`

interface CmsImage {
  url?: unknown
  caption?: unknown
  credit?: unknown
}

interface CmsMedia {
  type?: unknown
  url?: unknown
  caption?: unknown
  credit?: unknown
  position?: unknown
  width?: unknown
  height?: unknown
  contentType?: unknown
}

interface CmsListItem {
  id?: unknown
  body?: unknown
  slug?: unknown
  headline?: unknown
  summary?: unknown
  section?: unknown
  tags?: unknown
  image?: unknown
  author?: unknown
  placement?: unknown
  publishedAt?: unknown
  updatedAt?: unknown
  media?: unknown
}

const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0

function parsePublished(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const parsed = Date.parse(value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)
  return Number.isFinite(parsed) ? parsed : null
}

function mapCmsMedia(raw: CmsMedia[], articleId: string): Article['media'] | undefined {
  const entries: NonNullable<Article['media']> = []
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== 'object') continue
    const media = item as CmsMedia
    const url = isText(media.url) && /^https:\/\//.test(media.url) ? media.url : undefined
    if (!url) continue
    const contentType = isText(media.contentType) ? media.contentType : ''
    const declared: 'photo' | 'video' | 'audio' | undefined =
      media.type === 'photo' || media.type === 'video' || media.type === 'audio' ? media.type : undefined
    const kind: 'photo' | 'video' | 'audio' | undefined =
      declared ??
      (contentType.startsWith('image/')
        ? 'photo'
        : contentType.startsWith('video/')
          ? 'video'
          : contentType.startsWith('audio/')
            ? 'audio'
            : undefined)
    if (!kind) continue
    entries.push({
      id: `cms-${articleId}-m${index}`,
      kind,
      url,
      ...(isText(media.caption) ? { caption: media.caption } : {}),
      ...(isText(media.credit) ? { credit: media.credit } : {}),
      ...(typeof media.width === 'number' ? { width: media.width } : {}),
      ...(typeof media.height === 'number' ? { height: media.height } : {}),
      ...(contentType ? { contentType } : {}),
      ...(media.position === 'before' || media.position === 'after' ? { position: media.position } : { position: 'before' }),
    })
  }
  return entries.length ? entries : undefined
}

export function mapCmsArticle(raw: CmsListItem): Article | null {
  if (typeof raw.id !== 'number' || !isText(raw.headline) || !isText(raw.section)) return null
  const slug = isText(raw.slug) ? raw.slug : `cms-${raw.id}`
  const image = raw.image && typeof raw.image === 'object' ? (raw.image as CmsImage) : null
  const imageUrl = image && isText(image.url) && /^https:\/\//.test(image.url) ? image.url : undefined
  return {
    id: `cms-${raw.id}`,
    title: raw.headline,
    link: cmsStoryLink(slug),
    summary: isText(raw.summary) ? raw.summary : '',
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(isText(raw.author) ? { author: raw.author } : {}),
    published: parsePublished(raw.publishedAt),
    feedId: 'cms',
    sourceId: '180news',
    section: raw.section,
    slug,
    headline: raw.placement === 'headline',
    tags: Array.isArray(raw.tags) ? raw.tags.filter(isText) : undefined,
    ...mapCmsMedia(Array.isArray(raw.media) ? (raw.media as CmsMedia[]) : [], String(raw.id)),
  }
}

let cache: { at: number; articles: Article[] } | null = null
let inflight: Promise<Article[]> | null = null

const TTL = 30000

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** The list endpoint omits media URLs, so stories that carry video/audio or an
 * unplaced picture are enriched with their detail response. */
async function enrichWithMedia(articles: Article[]): Promise<Article[]> {
  const needsMedia = articles.filter((a) => !a.body && !a.media && /^cms-/.test(a.id)).slice(0, 12)
  if (!needsMedia.length) return articles
  const details = await Promise.allSettled(
    needsMedia.map(async (article) => ({
      id: article.id,
      data: (await fetchJson(`${CMS_BASE}/api/public?resource=article&id=${article.id.replace('cms-', '')}`)) as CmsListItem,
    })),
  )
  return articles.map((article) => {
    const result = details.find((d) => d.status === 'fulfilled' && d.value.id === article.id)
    if (!result || result.status !== 'fulfilled') return article
    const raw = result.value.data
    const media = Array.isArray(raw.media) ? mapCmsMedia(raw.media as CmsMedia[], article.id.replace('cms-', '')) : undefined
    const body = isText(raw.body) ? raw.body : undefined
    if (!media && !body) return article
    return { ...article, ...(media ? { media } : {}), ...(body ? { body } : {}) }
  })
}

export function loadCmsArticles(): Promise<Article[]> {
  if (cache && Date.now() - cache.at < TTL) return Promise.resolve(cache.articles)
  inflight ??= fetchJson(`${CMS_BASE}/api/public?resource=articles`)
    .then((data) => {
      if (!Array.isArray(data)) throw new Error('Unexpected CMS response')
      const mapped = data.map(mapCmsArticle).filter((a): a is Article => a !== null)
      // A re-published update keeps its slug but arrives with a new id — show the
      // newest version only, so past and newly published stories never double up.
      const bySlug = new Map<string, Article>()
      for (const article of mapped) {
        const key = article.slug ?? article.id
        const existing = bySlug.get(key)
        if (!existing || (article.published ?? 0) > (existing.published ?? 0)) bySlug.set(key, article)
      }
      const articles = [...bySlug.values()]
      return enrichWithMedia(articles)
    })
    .then((articles) => {
      cache = { at: Date.now(), articles }
      inflight = null
      return articles
    })
    .catch(() => {
      inflight = null
      return cache?.articles ?? []
    })
  return inflight
}
