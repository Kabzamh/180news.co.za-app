import { ExternalLink, Play } from 'lucide-react'
import { useState } from 'react'
import { displayLink, parseLink } from '../lib/links'
import type { ParsedLink } from '../lib/links'

const openLink =
  'inline-flex min-h-11 items-center gap-2 text-[14.5px] font-bold text-navy underline decoration-navy/40 underline-offset-[3px] hover:decoration-navy'

/**
 * Moves keyboard focus into a player when it replaces its play button. Defined
 * once, outside the components, so it runs when the player first appears and
 * not again on later re-renders (which would keep pulling focus back to it).
 */
const focusOnce = (el: HTMLIFrameElement | null) => el?.focus()

function OpenOn({ url, service }: { url: string; service: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={openLink}>
      {service === 'YouTube' ? 'Watch on YouTube' : 'Open on Facebook'}
      <ExternalLink size={15} strokeWidth={2.4} aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}

/**
 * YouTube video. Nothing is loaded from YouTube's player until the reader
 * presses play; until then it is a still picture with a play button.
 */
function YouTubePlayer({ link }: { link: Extract<ParsedLink, { provider: 'youtube' }> & { videoId: string } }) {
  const [playing, setPlaying] = useState(false)
  const [thumbFailed, setThumbFailed] = useState(false)
  const frame = link.vertical ? 'aspect-[9/16] w-full max-w-[340px]' : 'aspect-video w-full'
  const src = `https://www.youtube-nocookie.com/embed/${link.videoId}?autoplay=1&rel=0&playsinline=1${link.start ? `&start=${link.start}` : ''}`

  return (
    <figure>
      <div className={`relative overflow-hidden bg-ink ${frame}`}>
        {playing ? (
          <iframe
            ref={focusOnce}
            src={src}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} aria-label="Play YouTube video" className="group absolute inset-0 h-full w-full cursor-pointer">
            {!thumbFailed && (
              <img
                src={`https://i.ytimg.com/vi/${link.videoId}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setThumbFailed(true)}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <span className="absolute inset-0 bg-ink/25 transition-colors group-hover:bg-ink/10" aria-hidden="true" />
            <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand text-white shadow-[0_6px_20px_rgb(0_0_0_/_0.45)] transition-transform group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
              <Play size={26} strokeWidth={2.4} fill="currentColor" className="translate-x-0.5" aria-hidden="true" />
            </span>
            <span className="absolute bottom-2.5 left-3 rounded-sm bg-ink/80 px-2 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-white">YouTube</span>
          </button>
        )}
      </div>
      <figcaption>
        <OpenOn url={link.url} service="YouTube" />
      </figcaption>
    </figure>
  )
}

/** Facebook link. Videos can be played in place; posts, photos and pages open on Facebook. */
function FacebookCard({ link }: { link: Extract<ParsedLink, { provider: 'facebook' }> }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="border border-line bg-wash p-4">
      <p className="text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-navy">Facebook {link.video ? 'video' : 'link'}</p>
      <p className="mt-0.5 break-all text-[14px] text-muted">{displayLink(link.url)}</p>
      {playing && (
        <div className="relative mt-3 aspect-video w-full bg-ink">
          <iframe
            ref={focusOnce}
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
            <Play size={15} strokeWidth={2.6} fill="currentColor" aria-hidden="true" /> Play here
          </button>
        )}
        <OpenOn url={link.url} service="Facebook" />
      </div>
      {playing && <p className="mt-1 text-[13px] leading-snug text-muted">If the video does not appear, it may be private — open it on Facebook instead.</p>}
    </div>
  )
}

/** A YouTube link that is not a single video, such as a channel or a playlist. */
function YouTubeCard({ url }: { url: string }) {
  return (
    <div className="border border-line bg-wash p-4">
      <p className="text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-navy">YouTube link</p>
      <p className="mt-0.5 break-all text-[14px] text-muted">{displayLink(url)}</p>
      <OpenOn url={url} service="YouTube" />
    </div>
  )
}

/** The YouTube and Facebook links on an article, in the order the author added them. */
export function ArticleLinks({ links }: { links: string[] }) {
  const parsed = links.map(parseLink).filter((l): l is ParsedLink => l !== null)
  if (parsed.length === 0) return null
  return (
    <section aria-label="YouTube and Facebook links" className="mt-8 max-w-[64ch] space-y-6">
      {parsed.map((link) =>
        link.provider === 'facebook' ? (
          <FacebookCard key={link.url} link={link} />
        ) : link.videoId ? (
          <YouTubePlayer key={link.url} link={{ ...link, videoId: link.videoId }} />
        ) : (
          <YouTubeCard key={link.url} url={link.url} />
        ),
      )}
    </section>
  )
}
