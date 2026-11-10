import { Bookmark, BookmarkCheck } from 'lucide-react'
import type { NewsItem } from '../lib/feed/types'
import { useSaved } from '../lib/saved'

interface Props {
  item: NewsItem
  dark?: boolean
  withLabel?: boolean
  className?: string
}

export function SaveButton({ item, dark = false, withLabel = false, className = '' }: Props) {
  const { isSaved, toggle } = useSaved()
  const saved = isSaved(item.id)
  const Icon = saved ? BookmarkCheck : Bookmark
  const tone = dark
    ? saved
      ? 'text-white'
      : 'text-white/70 hover:text-white'
    : saved
      ? 'text-brand'
      : 'text-muted hover:text-brand'

  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      aria-pressed={saved}
      aria-label={withLabel ? undefined : saved ? `Remove from saved: ${item.title}` : `Save for later: ${item.title}`}
      title={saved ? 'Remove from saved' : 'Save for later'}
      className={`relative z-10 inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full transition-colors ${
        withLabel ? 'h-11 border border-line px-4 text-sm font-bold hover:border-brand' : '-my-2 -mr-2 size-10'
      } ${tone} ${className}`}
    >
      <Icon size={withLabel ? 18 : 17} strokeWidth={2.2} fill={saved ? 'currentColor' : 'none'} fillOpacity={saved ? 0.15 : 0} aria-hidden="true" />
      {withLabel && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  )
}
