import type { MediaKind, MediaRef } from '../lib/feed/types'
import { useStoredMedia } from '../lib/media'

const NOUN: Record<MediaKind, string> = { photo: 'photo', video: 'video', audio: 'audio clip' }
const FALLBACK_LABEL: Record<MediaKind, string> = {
  photo: 'Photo supplied by the author',
  video: 'Video supplied by the author',
  audio: 'Audio supplied by the author',
}

interface FrameProps {
  kind: MediaKind
  url: string
  /** Read out for the photo, and names the player for video and audio. */
  label: string
  /** Smaller version for the article form. */
  compact?: boolean
}

/** A photo, or a native player for video and audio. */
export function MediaFrame({ kind, url, label, compact = false }: FrameProps) {
  if (kind === 'photo') {
    return <img src={url} alt={label} className={compact ? 'aspect-[4/3] w-full bg-line object-cover' : 'max-h-[80vh] w-full bg-wash object-contain'} />
  }
  if (kind === 'video') {
    // The time fragment makes browsers that show nothing before playback paint the first frame.
    return (
      <video
        src={`${url}#t=0.001`}
        controls
        playsInline
        preload="metadata"
        aria-label={label}
        className={`w-full bg-ink ${compact ? 'max-h-52' : 'max-h-[75vh]'}`}
      />
    )
  }
  return <audio src={url} controls preload="metadata" aria-label={label} className="w-full" />
}

/** The same, for a file already stored on this device. */
export function StoredFrame({ media, compact = false }: { media: MediaRef; compact?: boolean }) {
  const stored = useStoredMedia(media.id)
  if (stored.state === 'loading') {
    return <div role="status" aria-label={`Loading ${NOUN[media.kind]}`} className="h-14 animate-pulse bg-line/70 motion-reduce:animate-none" />
  }
  if (stored.state === 'missing') {
    return <p className="border border-dashed border-ink/25 bg-wash px-4 py-3 text-[14px] leading-snug text-muted">This {NOUN[media.kind]} is not stored on this device.</p>
  }
  return <MediaFrame kind={media.kind} url={stored.url} label={media.caption || FALLBACK_LABEL[media.kind]} compact={compact} />
}

/** Everything attached to an article, in the order the author added it. */
export function ArticleMedia({ media }: { media: MediaRef[] }) {
  return (
    <section aria-label="Photos, video and audio" className="mt-8 max-w-[64ch] space-y-7">
      {media.map((m) => (
        <figure key={m.id}>
          <StoredFrame media={m} />
          {m.caption && <figcaption className="mt-2 text-[14px] leading-snug text-muted">{m.caption}</figcaption>}
        </figure>
      ))}
    </section>
  )
}
