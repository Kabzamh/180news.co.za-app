/**
 * YouTube and Facebook links added to reader articles.
 *
 * Only these two services are accepted. A link is stored as a plain https URL
 * and is re-checked every time it is read back, so nothing else can be turned
 * into a player or a button.
 */

export const LINK_LIMIT = 6

export type ParsedLink =
  | { provider: 'youtube'; url: string; videoId?: string; vertical: boolean; start?: number }
  | { provider: 'facebook'; url: string; video: boolean }

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'])
const FACEBOOK_HOSTS = new Set(['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'mbasic.facebook.com', 'fb.watch', 'fb.com', 'www.fb.com'])
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const FACEBOOK_VIDEO = /\/(videos?|watch|reels?|video\.php)(\/|$)|\/share\/[vr]\//

/** "90", "90s" or "1m30s" -> seconds. */
function startSeconds(value: string | null): number | undefined {
  if (!value) return undefined
  if (/^\d+$/.test(value)) return Number(value) || undefined
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value)
  if (!m) return undefined
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) || undefined
}

/** Recognise a YouTube or Facebook link. Anything else gives null. */
export function parseLink(input: string): ParsedLink | null {
  let raw = input.trim()
  if (!raw) return null
  // People often paste links without the https:// in front.
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `https://${raw}`
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  u.protocol = 'https:'
  u.username = ''
  u.password = ''
  u.port = ''
  const host = u.hostname.toLowerCase()
  // The bare home page of either service is not a link to anything.
  if (u.pathname === '/' && !u.search) return null

  if (YOUTUBE_HOSTS.has(host)) {
    const parts = u.pathname.split('/').filter(Boolean)
    let id: string | null | undefined
    if (host === 'youtu.be') id = parts[0]
    else if (parts[0] === 'watch') id = u.searchParams.get('v')
    else if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) id = parts[1]
    const start = startSeconds(u.searchParams.get('t') ?? u.searchParams.get('start'))
    return {
      provider: 'youtube',
      url: u.href,
      ...(id && YOUTUBE_ID.test(id) ? { videoId: id } : {}),
      vertical: parts[0] === 'shorts',
      ...(start ? { start } : {}),
    }
  }

  if (FACEBOOK_HOSTS.has(host)) {
    return { provider: 'facebook', url: u.href, video: host === 'fb.watch' || FACEBOOK_VIDEO.test(u.pathname) }
  }
  return null
}

/** Stored links -> valid, de-duplicated https URLs. */
export function cleanLinks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const entry of raw) {
    const parsed = typeof entry === 'string' ? parseLink(entry) : null
    if (parsed && !out.includes(parsed.url)) out.push(parsed.url)
  }
  return out.slice(0, LINK_LIMIT)
}

/** "youtube.com/watch?v=…" – the link without its scheme, shortened for display. */
export function displayLink(url: string): string {
  const text = url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')
  return text.length > 64 ? `${text.slice(0, 63)}…` : text
}
