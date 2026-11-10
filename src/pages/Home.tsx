import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FeedsDown, FrontSkeleton } from '../components/Chrome'
import { SectionHeading } from '../components/SectionHeading'
import { LeadStory, StoryCard, StoryHeadline, StoryRow } from '../components/StoryCard'
import { RandWatch } from '../components/Widgets'
import { useTitle } from '../lib/extras'
import { SECTION_BY_ID, publisherName } from '../lib/feed/sources'
import type { NewsItem, SectionId } from '../lib/feed/types'
import { clock, timeAgo } from '../lib/format'
import { FRONT_SECTIONS, diversify, useNews } from '../lib/news/store'

interface Block {
  feature: NewsItem[]
  rest: NewsItem[]
}

/** Lay out the front page so no story appears twice. */
function compose(bySection: Record<SectionId, NewsItem[]>) {
  const used = new Set<string>()
  const take = (pool: NewsItem[], n: number, needImage = false): NewsItem[] => {
    const out: NewsItem[] = []
    for (const item of pool) {
      if (out.length >= n) break
      if (used.has(item.id) || (needImage && !item.image)) continue
      used.add(item.id)
      out.push(item)
    }
    return out
  }
  const block = (id: SectionId, featureCount: number, restCount: number, restNeedsImage = false): Block => {
    const pool = diversify(bySection[id])
    let feature = take(pool, featureCount, true)
    if (feature.length < featureCount) feature = [...feature, ...take(pool, featureCount - feature.length)]
    let rest = take(pool, restCount, restNeedsImage)
    if (rest.length < restCount) rest = [...rest, ...take(pool, restCount - rest.length)]
    return { feature, rest }
  }

  const seen = new Set<string>()
  const front = diversify(
    FRONT_SECTIONS.flatMap((id) => bySection[id]).filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true))),
    10 * 60 * 60 * 1000,
  )
  let lead = take(front, 1, true)
  if (!lead.length) lead = take(front, 1)
  const secondary = take(front, 2, true)
  const top = take(front, 4, true)

  return {
    lead: lead[0] as NewsItem | undefined,
    secondary,
    top,
    southAfrica: block('south-africa', 1, 5),
    politics: block('politics', 0, 4, true),
    business: block('business', 1, 4),
    sport: block('sport', 1, 4, true),
    world: block('world', 1, 4),
    africa: block('africa', 1, 4),
    tech: block('tech', 0, 4, true),
    life: block('life', 0, 4, true),
    opinion: block('opinion', 0, 6),
  }
}

function LatestRail({ items }: { items: NewsItem[] }) {
  const { now } = useNews()
  return (
    <section aria-labelledby="latest-rail" className="lg:border-l lg:border-line lg:pl-6">
      <div className="mb-1 flex items-center justify-between">
        <h2 id="latest-rail" className="flex items-center gap-2.5 text-lg font-black uppercase tracking-[-0.01em]">
          <span className="live-dot size-2 rounded-full bg-brand [--pulse-color:var(--color-brand)]" aria-hidden="true" />
          Latest
        </h2>
        <Link to="/latest" className="-my-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-navy hover:underline">
          See all <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
      <ol className="grid gap-x-8 md:grid-cols-2 lg:grid-cols-1">
        {items.map((item, i) => (
          <li key={item.id} className={`group relative border-line py-3 ${i === 0 ? 'border-t-2 border-t-ink' : 'border-t'} ${i > 5 ? 'hidden md:block' : ''}`}>
            <p className="text-[12.5px] font-extrabold text-brand">
              {item.published !== null && (
                <time dateTime={new Date(item.published).toISOString()} title={`${clock(item.published)} SAST`}>
                  {timeAgo(item.published, now)}
                </time>
              )}
              <span className="font-semibold text-muted"> · {publisherName(item.sourceId)}</span>
            </p>
            <h3 className="mt-0.5 text-[15px] font-bold leading-[1.3]">
              <Link to={`/story/${item.id}`} className="decoration-brand decoration-2 underline-offset-[3px] after:absolute after:inset-0 after:content-[''] group-hover:underline">
                {item.title}
              </Link>
            </h3>
          </li>
        ))}
      </ol>
    </section>
  )
}

function heading(id: SectionId) {
  const label = SECTION_BY_ID[id].label
  return { id: `home-${id}`, title: label, to: `/section/${id}`, moreLabel: `More ${label}` }
}

function RowList({ items, dark = false }: { items: NewsItem[]; dark?: boolean }) {
  return (
    <ul className={`divide-y ${dark ? 'divide-white/20' : 'divide-line'}`}>
      {items.map((item) => (
        <li key={item.id} className="py-4 first:pt-0 last:pb-0">
          <StoryRow item={item} dark={dark} />
        </li>
      ))}
    </ul>
  )
}

function CardGrid({ items }: { items: NewsItem[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.id}>
          <StoryCard item={item} size="sm" />
        </li>
      ))}
    </ul>
  )
}

/** One big card with a column of headlines – used side by side for World and Africa. */
function Column({ id, block }: { id: SectionId; block: Block }) {
  if (!block.feature.length && !block.rest.length) return null
  return (
    <section aria-labelledby={`home-${id}`}>
      <SectionHeading {...heading(id)} />
      {block.feature[0] && (
        <div>
          <StoryCard item={block.feature[0]} size="lg" summary />
        </div>
      )}
      <ul className="mt-5 divide-y divide-line border-t border-line">
        {block.rest.map((item) => (
          <li key={item.id} className="py-3.5">
            <StoryHeadline item={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Home() {
  useTitle()
  const { ready, all, bySection } = useNews()
  const page = useMemo(() => compose(bySection), [bySection])

  if (!ready) return <FrontSkeleton />
  if (all.length === 0 || !page.lead) return <FeedsDown />

  const { southAfrica, politics, business, sport, world, africa, tech, life, opinion } = page

  return (
    <div className="pt-6 md:pt-8">
      <h1 className="sr-only">180news — top stories</h1>

      {/* Splash: lead, two seconds and four more on the left; the live wire on the right */}
      <div className="wrap grid gap-x-8 gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-9">
          <div className="grid gap-x-6 gap-y-8 lg:grid-cols-9">
            <div className="lg:col-span-6">
              <LeadStory item={page.lead} />
            </div>
            {page.secondary.length > 0 && (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-6 lg:col-span-3 lg:grid-cols-1 lg:content-start">
                {page.secondary.map((item) => (
                  <li key={item.id}>
                    <StoryCard item={item} size="md" />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {page.top.length > 0 && (
            <section aria-label="More top stories" className="mt-8 border-t border-line pt-6">
              <CardGrid items={page.top} />
            </section>
          )}
        </div>
        <div className="lg:col-span-3">
          <LatestRail items={all.slice(0, 9)} />
        </div>
      </div>

      {/* South Africa: feature + rows */}
      {southAfrica.feature[0] && (
        <section aria-labelledby="home-south-africa" className="wrap mt-12 md:mt-16">
          <SectionHeading {...heading('south-africa')} />
          <div className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <StoryCard item={southAfrica.feature[0]} size="lg" summary />
            </div>
            <div className="lg:col-span-5">
              <RowList items={southAfrica.rest} />
            </div>
          </div>
        </section>
      )}

      {politics.rest.length > 0 && (
        <section aria-labelledby="home-politics" className="wrap mt-12 md:mt-16">
          <SectionHeading {...heading('politics')} />
          <CardGrid items={politics.rest} />
        </section>
      )}

      {/* Business: feature, headlines, rand rates */}
      {business.feature[0] && (
        <section aria-labelledby="home-business" className="wrap mt-12 md:mt-16">
          <SectionHeading {...heading('business')} />
          <div className="grid items-start gap-x-8 gap-y-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <StoryCard item={business.feature[0]} size="lg" summary />
            </div>
            <ul className="divide-y divide-line lg:col-span-4">
              {business.rest.map((item) => (
                <li key={item.id} className="py-3.5 first:pt-0">
                  <StoryHeadline item={item} />
                </li>
              ))}
            </ul>
            <div className="lg:col-span-3">
              <RandWatch />
            </div>
          </div>
        </section>
      )}

      {/* Sport: full-bleed navy band */}
      {sport.feature[0] && (
        <section aria-labelledby="home-sport" className="on-dark dot-band mt-12 py-10 text-white md:mt-16 md:py-14">
          <div className="wrap">
            <SectionHeading {...heading('sport')} dark />
            <div className="grid items-start gap-x-8 gap-y-8 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <StoryCard item={sport.feature[0]} size="lg" summary dark />
              </div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 lg:col-span-6">
                {sport.rest.map((item) => (
                  <li key={item.id}>
                    <StoryCard item={item} size="sm" dark />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* World and Africa side by side */}
      <div className="wrap mt-12 grid gap-x-10 gap-y-12 md:mt-16 md:grid-cols-2">
        <Column id="world" block={world} />
        <Column id="africa" block={africa} />
      </div>

      {tech.rest.length > 0 && (
        <section aria-labelledby="home-tech" className="wrap mt-12 md:mt-16">
          <SectionHeading {...heading('tech')} />
          <CardGrid items={tech.rest} />
        </section>
      )}

      {life.rest.length > 0 && (
        <section aria-labelledby="home-life" className="wrap mt-12 md:mt-16">
          <SectionHeading {...heading('life')} />
          <CardGrid items={life.rest} />
        </section>
      )}

      {/* Opinions: text-led on a tinted band */}
      {opinion.rest.length > 0 && (
        <section aria-labelledby="home-opinion" className="mt-12 bg-wash py-10 md:mt-16 md:py-12">
          <div className="wrap">
            <SectionHeading {...heading('opinion')} />
            <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {opinion.rest.map((item) => (
                <li key={item.id} className="group relative border-l-4 border-brand bg-paper p-5">
                  <h3 className="text-lg font-extrabold leading-[1.22] tracking-[-0.01em] text-balance">
                    <Link to={`/story/${item.id}`} className="decoration-brand decoration-2 underline-offset-[3px] after:absolute after:inset-0 after:content-[''] group-hover:underline">
                      {item.title}
                    </Link>
                  </h3>
                  {item.summary && <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-body">{item.summary}</p>}
                  <p className="mt-3 text-[12.5px] text-muted">
                    {item.author && <span className="font-bold text-ink">{item.author} · </span>}
                    <span className="font-extrabold uppercase tracking-[0.04em] text-brand">{publisherName(item.sourceId)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
