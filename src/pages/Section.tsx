import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useNews } from '../lib/news/store'
import { useControl } from '../lib/control'
import { useTitle } from '../lib/weather'
import { SOURCES, feedsForSection, SECTION_BY_ID } from '../lib/feeds'
import { LeadStory, StoryCard, StoryRow } from '../components/StoryCard'
import { RandWatch } from '../components/Widgets'
import { GridSkeleton, EmptyFeeds } from '../components/Chrome'
import { ResultsBrief } from '../components/ResultsBrief'

const PAGE = 12

export default function Section() {
  const { slug = '' } = useParams()
  const section = SECTION_BY_ID[slug]
  useTitle(section?.label)
  const { ready, bySection, all } = useNews()
  const { settings } = useControl()
  const [source, setSource] = useState('all')
  const [shown, setShown] = useState(PAGE)

  const items = bySection[slug] ?? []

  const activeSources = useMemo(() => {
    const present = new Set(items.map((i) => i.sourceId))
    return [...new Set(feedsForSection(slug).map((f) => f.sourceId))].filter((id) => present.has(id))
  }, [slug, items])

  const filtered = useMemo(() => (source === 'all' ? items : items.filter((i) => i.sourceId === source)), [items, source])
  const lead = filtered.find((i) => i.image) ?? filtered[0]
  const rest = filtered.filter((i) => i !== lead)
  const visible = rest.slice(0, 3 + shown)
  const remaining = rest.length - 3 - Math.min(shown, Math.max(0, rest.length - 3))

  const chip = (active: boolean) =>
    `inline-flex h-11 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full border px-4 text-sm font-bold transition-colors ${
      active ? 'border-navy bg-navy text-white' : 'border-line bg-paper text-ink hover:border-navy hover:text-navy'
    }`

  return (
    <div className="wrap pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">{section?.label ?? slug}</h1>
        {ready && items.length > 0 && (
          <p className="mt-2 text-[15px] text-muted" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'story' : 'stories'} from{' '}
            {source === 'all' ? `${activeSources.length} ${activeSources.length === 1 ? 'newsroom' : 'newsrooms'}` : SOURCES[source]?.name}
          </p>
        )}
      </header>

      {slug === 'elections' && <ResultsBrief className="mt-5" />}

      {activeSources.length > 1 && (
        <div role="group" aria-label="Filter by newsroom" className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <button
            type="button"
            aria-pressed={source === 'all'}
            onClick={() => {
              setSource('all')
              setShown(PAGE)
            }}
            className={chip(source === 'all')}
          >
            All newsrooms
          </button>
          {activeSources.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={source === id}
              onClick={() => {
                setSource(id)
                setShown(PAGE)
              }}
              className={chip(source === id)}
            >
              {SOURCES[id]?.name ?? id}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {!ready ? (
          <GridSkeleton />
        ) : all.length === 0 ? (
          <EmptyFeeds />
        ) : lead ? (
          <>
            <div className="grid gap-x-8 gap-y-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <LeadStory item={lead} />
              </div>
              <div className="space-y-6 lg:col-span-5">
                {rest.slice(0, 3).length > 0 && (
                  <ul className="divide-y divide-line">
                    {rest.slice(0, 3).map((item) => (
                      <li key={item.id} className="py-4 first:pt-0">
                        <StoryRow item={item} summary />
                      </li>
                    ))}
                  </ul>
                )}
                {slug === 'business' && <RandWatch />}
              </div>
            </div>
            {visible.length > 0 && (
              <ul className="mt-10 grid gap-x-6 gap-y-9 border-t border-line pt-8 sm:grid-cols-2 lg:grid-cols-3">
                {visible.slice(3).map((item) => (
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
                  Show more {section?.label} ({remaining} left)
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="py-16 text-center text-[17px] text-body">
            {slug === 'elections'
              ? 'There are no election stories in the feeds at the moment. Other sections are still up to date — use the menu above.'
              : `The ${section?.label ?? slug} feeds are not responding at the moment. Other sections are still up to date — use the menu above, or refresh from the top bar.`}
          </p>
        )}
      </div>
      {settings.hiddenSections.length > 0 && null}
    </div>
  )
}
