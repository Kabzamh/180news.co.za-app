import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FeedsDown, GridSkeleton } from '../components/Chrome'
import { LeadStory, StoryCard, StoryRow } from '../components/StoryCard'
import { RandWatch } from '../components/Widgets'
import { useControl } from '../lib/control'
import { useTitle } from '../lib/extras'
import { PUBLISHERS, SECTION_BY_ID, feedsForSection } from '../lib/feed/sources'
import type { SectionId } from '../lib/feed/types'
import { useNews } from '../lib/news/store'
import NotFound from './NotFound'

const PAGE = 12

export default function Section() {
  const { slug = '' } = useParams()
  const section = Object.prototype.hasOwnProperty.call(SECTION_BY_ID, slug) ? SECTION_BY_ID[slug as SectionId] : undefined
  const { sections } = useControl()
  if (!section || !sections.some((s) => s.id === section.id)) return <NotFound />
  // Keyed so filter and paging reset when moving between sections.
  return <SectionView key={section.id} id={section.id} label={section.label} />
}

function SectionView({ id, label }: { id: SectionId; label: string }) {
  useTitle(label)
  const { ready, bySection, all } = useNews()
  const [source, setSource] = useState<string>('all')
  const [shown, setShown] = useState(PAGE)

  const items = bySection[id]
  const sources = useMemo(() => {
    const present = new Set(items.map((i) => i.sourceId))
    return [...new Set(feedsForSection(id).map((f) => f.sourceId))].filter((s) => present.has(s))
  }, [id, items])

  const filtered = useMemo(() => (source === 'all' ? items : items.filter((i) => i.sourceId === source)), [items, source])

  const lead = filtered.find((i) => i.image) ?? filtered[0]
  const others = filtered.filter((i) => i !== lead)
  const side = others.slice(0, 3)
  const grid = others.slice(3, 3 + shown)
  const remaining = others.length - 3 - grid.length

  const chip = (active: boolean) =>
    `inline-flex h-11 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full border px-4 text-sm font-bold transition-colors ${
      active ? 'border-navy bg-navy text-white' : 'border-line bg-paper text-ink hover:border-navy hover:text-navy'
    }`

  return (
    <div className="wrap pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">{label}</h1>
        {ready && items.length > 0 && (
          <p className="mt-2 text-[15px] text-muted" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'story' : 'stories'} from{' '}
            {source === 'all' ? `${sources.length} ${sources.length === 1 ? 'newsroom' : 'newsrooms'}` : PUBLISHERS[source]?.name}
          </p>
        )}
      </header>

      {sources.length > 1 && (
        <div role="group" aria-label="Filter by newsroom" className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <button type="button" aria-pressed={source === 'all'} onClick={() => { setSource('all'); setShown(PAGE) }} className={chip(source === 'all')}>
            All newsrooms
          </button>
          {sources.map((s) => (
            <button key={s} type="button" aria-pressed={source === s} onClick={() => { setSource(s); setShown(PAGE) }} className={chip(source === s)}>
              {PUBLISHERS[s]?.name ?? s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {!ready ? (
          <GridSkeleton />
        ) : all.length === 0 ? (
          <FeedsDown />
        ) : !lead ? (
          <p className="py-16 text-center text-[17px] text-body">
            {id === 'elections'
              ? 'There are no election stories in the feeds at the moment. Other sections are still up to date — use the menu above.'
              : `The ${label} feeds are not responding at the moment. Other sections are still up to date — use the menu above, or refresh from the top bar.`}
          </p>
        ) : (
          <>
            <div className="grid gap-x-8 gap-y-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <LeadStory item={lead} />
              </div>
              <div className="space-y-6 lg:col-span-5">
                {side.length > 0 && (
                  <ul className="divide-y divide-line">
                    {side.map((item) => (
                      <li key={item.id} className="py-4 first:pt-0">
                        <StoryRow item={item} summary />
                      </li>
                    ))}
                  </ul>
                )}
                {id === 'business' && <RandWatch />}
              </div>
            </div>

            {grid.length > 0 && (
              <ul className="mt-10 grid gap-x-6 gap-y-9 border-t border-line pt-8 sm:grid-cols-2 lg:grid-cols-3">
                {grid.map((item) => (
                  <li key={item.id}>
                    <StoryCard item={item} summary />
                  </li>
                ))}
              </ul>
            )}

            {remaining > 0 && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className="inline-flex h-12 cursor-pointer items-center border-2 border-navy px-7 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white"
                >
                  Show more {label} ({remaining} left)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
