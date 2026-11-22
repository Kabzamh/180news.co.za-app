import type { Article } from '../lib/news/parse'

export function StoryImage({
  item,
  className = 'aspect-[16/9]',
  priority = false,
}: {
  item: { image?: string; sourceId: string; media?: Article['media'] }
  className?: string
  priority?: boolean
}) {
  const broken = (
    <div className="dot-tile absolute inset-0 flex items-end p-3" aria-hidden="true">
      <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/85">
        {item.sourceId === '180news' ? '180news' : item.sourceId.replace(/-/, ' ')}
      </span>
    </div>
  )

  if (!item.image) {
    // no picture supplied — show the first frame of a video as the thumbnail
    const video = item.media?.find((m) => m.kind === 'video' && m.url)
    if (video) {
      return (
        <div className={`relative overflow-hidden bg-ink ${className}`}>
          <video
            src={`${video.url}#t=0.001`}
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-2 left-2 rounded-sm bg-ink/80 px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-white"
          >
            Video
          </span>
        </div>
      )
    }
    return <div className={`relative overflow-hidden bg-wash ${className}`}>{broken}</div>
  }

  return (
    <div className={`relative overflow-hidden bg-wash ${className}`}>
      <img
        src={item.image}
        alt=""
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(event) => {
          event.currentTarget.style.display = 'none'
        }}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
    </div>
  )
}
