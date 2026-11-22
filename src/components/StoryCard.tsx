import { Link } from 'react-router-dom'
import { useNews } from '../lib/news/store'
import { sourceName } from '../lib/feeds'
import { formatFull, timeAgo } from '../lib/format'
import { SaveButton } from './SaveButton'
import { StoryImage } from './StoryImage'
import type { Article } from '../lib/news/parse'

const storyLink = (item: Article): string => `/story/${item.id}`
const OVERLAY = "after:absolute after:inset-0 after:content-['']"

export function StoryMeta({ item, dark = false, className = '' }: { item: Article; dark?: boolean; className?: string }) {
  const { now } = useNews()
  const ago = timeAgo(item.published, now)
  return (
    <p className={`flex min-w-0 items-center gap-x-2 text-[12.5px] leading-5 ${className}`}>
      <span className={`truncate font-extrabold uppercase tracking-[0.04em] ${dark ? 'text-white' : 'text-brand'}`}>{sourceName(item.sourceId)}</span>
      {ago && item.published !== null && (
        <time dateTime={new Date(item.published).toISOString()} title={formatFull(item.published)} className={`shrink-0 ${dark ? 'text-white/70' : 'text-muted'}`}>
          {ago}
        </time>
      )}
    </p>
  )
}

export function LeadStory({ item }: { item: Article }) {
  return (
    <article className="group relative">
      {(item.image || !item.body) && <StoryImage item={item} priority className="mb-4 aspect-[16/10] sm:aspect-[16/9]" />}
      <div>
        <h2 className="text-[27px] font-extrabold leading-[1.1] tracking-[-0.015em] text-balance sm:text-4xl lg:text-[40px] lg:leading-[1.06]">
          <Link to={storyLink(item)} className={`${OVERLAY} decoration-brand decoration-[3px] underline-offset-4 group-hover:underline`}>
            {item.title}
          </Link>
        </h2>
        {item.summary && <p className="mt-3 max-w-[62ch] text-[17px] leading-relaxed text-body">{item.summary}</p>}
        <div className="mt-3 flex items-center justify-between gap-3">
          <StoryMeta item={item} />
          <SaveButton item={item} />
        </div>
      </div>
    </article>
  )
}

const TITLE_SIZES = {
  sm: 'text-[15px] leading-[1.25] sm:text-base',
  md: 'text-[17px] leading-[1.22] sm:text-lg',
  lg: 'text-[22px] leading-[1.14] sm:text-[26px]',
} as const

export function StoryCard({
  item,
  size = 'md',
  summary = false,
  dark = false,
  save = true,
}: {
  item: Article
  size?: 'sm' | 'md' | 'lg'
  summary?: boolean
  dark?: boolean
  save?: boolean
}) {
  return (
    <article className="group relative flex h-full flex-col">
      <StoryImage item={item} />
      <h3 className={`mt-3 font-extrabold tracking-[-0.01em] text-balance ${TITLE_SIZES[size]} ${dark ? 'text-white' : 'text-ink'}`}>
        <Link
          to={storyLink(item)}
          className={`${OVERLAY} decoration-2 underline-offset-[3px] group-hover:underline ${dark ? 'decoration-white' : 'decoration-brand'}`}
        >
          {item.title}
        </Link>
      </h3>
      {summary && item.summary && (
        <p className={`mt-2 line-clamp-3 text-[15px] leading-relaxed ${dark ? 'text-white/80' : 'text-body'}`}>{item.summary}</p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
        <StoryMeta item={item} dark={dark} />
        {save && <SaveButton item={item} dark={dark} />}
      </div>
    </article>
  )
}

export function StoryRow({ item, thumb = true, dark = false, summary = false }: { item: Article; thumb?: boolean; dark?: boolean; summary?: boolean }) {
  return (
    <article className="group relative flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <h3 className={`text-base font-bold leading-[1.28] tracking-[-0.005em] sm:text-[17px] ${dark ? 'text-white' : 'text-ink'}`}>
          <Link
            to={storyLink(item)}
            className={`${OVERLAY} decoration-2 underline-offset-[3px] group-hover:underline ${dark ? 'decoration-white' : 'decoration-brand'}`}
          >
            {item.title}
          </Link>
        </h3>
        {summary && item.summary && (
          <p className={`mt-1.5 line-clamp-2 text-[15px] leading-relaxed ${dark ? 'text-white/80' : 'text-body'}`}>{item.summary}</p>
        )}
        <StoryMeta item={item} dark={dark} className="mt-1.5" />
      </div>
      {thumb && item.image && <StoryImage item={item} className="aspect-[4/3] w-[104px] shrink-0 sm:w-[128px]" />}
    </article>
  )
}

export function StoryLine({ item, dark = false }: { item: Article; dark?: boolean }) {
  return (
    <article className="group relative">
      <h3 className={`text-[15.5px] font-bold leading-[1.3] ${dark ? 'text-white' : 'text-ink'}`}>
        <Link
          to={storyLink(item)}
          className={`${OVERLAY} decoration-2 underline-offset-[3px] group-hover:underline ${dark ? 'decoration-white' : 'decoration-brand'}`}
        >
          {item.title}
        </Link>
      </h3>
      <StoryMeta item={item} dark={dark} className="mt-1" />
    </article>
  )
}
