import { useState } from 'react'
import { publisherName } from '../lib/feed/sources'
import type { NewsItem } from '../lib/feed/types'

interface Props {
  item: NewsItem
  /** Sizing classes for the frame, e.g. "aspect-[16/9]". */
  className?: string
  priority?: boolean
}

/**
 * Publisher image with a typographic fallback. Not every feed carries a
 * picture (and some hosts refuse hot-linking), so the fallback is a designed
 * tile rather than a broken image or a stand-in photo.
 */
export function StoryImage({ item, className = 'aspect-[16/9]', priority = false }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const src = item.image
  const showImage = !!src && failedSrc !== src

  return (
    <div className={`relative overflow-hidden bg-wash ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <div className="dot-tile absolute inset-0 flex items-end p-3" aria-hidden="true">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/85">{publisherName(item.sourceId)}</span>
        </div>
      )}
    </div>
  )
}
