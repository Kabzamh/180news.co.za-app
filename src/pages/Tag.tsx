import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StoryRow } from '../components/StoryCard'
import { useTitle } from '../lib/extras'
import type { NewsItem } from '../lib/feed/types'
import { useNews } from '../lib/news/store'

/** Every current story carrying a tag: articles tagged by their author, and feed stories filed under the same topic. */
export default function Tag() {
  const { tag = '' } = useParams()
  const wanted = tag.trim().toLowerCase()
  const { all, ready } = useNews()

  const matching = (item: NewsItem) => item.tags?.find((t) => t.toLowerCase() === wanted) ?? (item.category?.toLowerCase() === wanted ? item.category : undefined)
  const items = useMemo(
    () => all.filter((item) => item.tags?.some((t) => t.toLowerCase() === wanted) || item.category?.toLowerCase() === wanted),
    [all, wanted],
  )
  // Show the tag the way its author wrote it.
  const name = (items[0] && matching(items[0])) || tag.trim()

  useTitle(`Tag: ${name}`)

  return (
    <div className="wrap max-w-[860px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <p className="text-sm font-black uppercase tracking-[0.08em] text-brand">Tag</p>
        <h1 className="mt-1 break-words text-4xl font-black leading-none tracking-[-0.02em] md:text-5xl">{name}</h1>
        <p className="mt-2 text-[15px] text-muted" aria-live="polite">
          {!ready && items.length === 0 ? 'Loading…' : `${items.length} ${items.length === 1 ? 'story' : 'stories'}`}
        </p>
      </header>

      {items.length > 0 ? (
        <ol className="mt-6 divide-y divide-line border-y border-line">
          {items.map((item) => (
            <li key={item.id} className="py-4">
              <StoryRow item={item} summary />
            </li>
          ))}
        </ol>
      ) : (
        ready && (
          <div className="mt-8">
            <p className="max-w-xl text-[16px] leading-relaxed text-body">No current stories carry this tag. Tags only cover what is on 180news right now.</p>
            <Link to="/" className="mt-5 inline-flex h-12 items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong">
              Go to top stories
            </Link>
          </div>
        )
      )}
    </div>
  )
}
