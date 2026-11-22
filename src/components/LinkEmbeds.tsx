import { useState } from 'react'
import { ExternalLink, Play } from 'lucide-react'

// -- URL parsing (same rules as the live app) --------------------------------
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])
const FACEBOOK_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'mbasic.facebook.com',
  'fb.watch',
  'fb.com',
  'www.fb.com',
])
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const FB_VIDEO = /\/(videos?|watch|reels?|video\.php)(\/|$)|\/share\/[vr]\//

export interface ParsedLink {
  provider: 'youtube' | 'facebook'
  url: string
  videoId?: string
  vertical?: boolean
  start?: number
  video?: boolean
}

function seconds(value: string | null): number | undefined {
  if (!value) return undefined
  if (/^\d+$/.test(value)) return Number(value) || undefined
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value)
  if (!m) return undefined
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) || undefined
}

export function parseLink(raw: string): ParsedLink | null {
  let value = raw.trim()
  if (!value) return null
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  url.protocol = 'https:'
  url.username = ''
  url.password = ''
  url.port = ''
  const host = url.hostname.toLowerCase()
  if (url.pathname === '/' && !url.search) return null
  if (YOUTUBE_HOSTS.has(host)) {
    const segments = url.pathname.split('/').filter(Boolean)
    let id: string | null = null
    if (host === 'youtu.be') id = segments[0] ?? null
    else if (segments[0] === 'watch') id = url.searchParams.get('v')
    else if (['shorts', 'embed', 'live', 'v'].includes(segments[0])) id = segments[1] ?? null
    const start = seconds(url.searchParams.get('t') ?? url.searchParams.get('start'))
    return {
      provider: 'youtube',
      url: url.href,
      ...(id && VIDEO_ID.test(id) ? { videoId: id } : {}),
      vertical: segments[0] === 'shorts',
      ...(start ? { start } : {}),
    }
  }
  if (FACEBOOK_HOSTS.has(host)) {
    return { provider: 'facebook', url: url.href, video: host === 'fb.watch' || FB_VIDEO.test(url.pathname) }
  }
  return null
}

export const shortUrl = (url: string): string => {
  const shortened = url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')
  return shortened.length > 64 ? `${shortened.slice(0, 63)}…` : shortened
}

// -- embeds -------------------------------------------------------------------
const EMBED_LINK =
  'inline-flex min-h-11 items-center gap-2 text-[14.5px] font-bold text-navy underline decoration-navy/40 underline-offset-[3px] hover:decoration-navy'

function EmbedSource({ url, service }: { url: string; service: 'YouTube' | 'Facebook' }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={EMBED_LINK}>
      {service === 'YouTube' ? 'Watch on YouTube' : 'Open on Facebook'}
      <ExternalLink size={15} strokeWidth={2.4} aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}

function YouTubeEmbed({ link }: { link: ParsedLink }) {
  const [playing, setPlaying] = useState(false)
  const [noThumb, setNoThumb] = useState(false)
  const frame = link.vertical ? 'aspect-[9/16] w-full max-w-[340px]' : 'aspect-video w-full'
  const src = `https://www.youtube-nocookie.com/embed/${link.videoId}?autoplay=1&rel=0&playsinline=1${link.start ? `&start=${link.start}` : ''}`
  return (
    <figure>
      <div className={`relative overflow-hidden bg-ink ${frame}`}>
        {playing ? (
          <iframe
            src={src}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label="Play YouTube video"
            className="group absolute inset-0 h-full w-full cursor-pointer"
          >
            {!noThumb && (
              <img
                src={`https://i.ytimg.com/vi/${link.videoId}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setNoThumb(true)}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <span className="absolute inset-0 bg-ink/25 transition-colors group-hover:bg-ink/10" aria-hidden="true" />
            <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand text-white shadow-[0_6px_20px_rgb(0_0_0_/_0.45)] transition-transform group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
              <Play size={26} strokeWidth={2.4} fill="currentColor" className="translate-x-0.5" aria-hidden="true" />
            </span>
            <span className="absolute bottom-2.5 left-3 rounded-sm bg-ink/80 px-2 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-white">
              YouTube
            </span>
          </button>
        )}
      </div>
      <figcaption>
        <EmbedSource url={link.url} service="YouTube" />
      </figcaption>
    </figure>
  )
}

function FacebookEmbed({ link }: { link: ParsedLink }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="border border-line bg-wash p-4">
      <p className="text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-navy">
        Facebook {link.video ? 'video' : 'link'}
      </p>
      <p className="mt-0.5 break-all text-[14px] text-muted">{shortUrl(link.url)}</p>
      {playing && (
        <div className="relative mt-3 aspect-video w-full bg-ink">
          <iframe
            src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(link.url)}&show_text=false&autoplay=true`}
            title="Facebook video player"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
        {link.video && !playing && (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-navy px-5 text-sm font-extrabold text-white hover:bg-navy-deep"
          >
            <Play size={15} strokeWidth={2.6} fill="currentColor" aria-hidden="true" />
            Play here
          </button>
        )}
        <EmbedSource url={link.url} service="Facebook" />
      </div>
    </div>
  )
}

function YouTubeLinkBox({ url }: { url: string }) {
  return (
    <div className="border border-line bg-wash p-4">
      <p className="text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-navy">YouTube link</p>
      <p className="mt-0.5 break-all text-[14px] text-muted">{shortUrl(url)}</p>
      <EmbedSource url={url} service="YouTube" />
    </div>
  )
}

export function LinkEmbeds({ links }: { links: string[] }) {
  const parsed = links.map(parseLink).filter((link): link is ParsedLink => link !== null)
  if (parsed.length === 0) return null
  return (
    <section aria-label="YouTube and Facebook links" className="mt-8 max-w-[64ch] space-y-6">
      {parsed.map((link) =>
        link.provider === 'facebook' ? (
          <FacebookEmbed key={link.url} link={link} />
        ) : link.videoId ? (
          <YouTubeEmbed key={link.url} link={link} />
        ) : (
          <YouTubeLinkBox key={link.url} url={link.url} />
        ),
      )}
    </section>
  )
}
