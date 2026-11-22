import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useNews } from '../lib/news/store'
import { useControl } from '../lib/control'
import { useTitle } from '../lib/weather'
import { interleave, type Article } from '../lib/news/parse'
import { timeAgo, formatTime } from '../lib/format'
import { sourceName, SECTION_BY_ID } from '../lib/feeds'
import { SectionHeading } from '../components/SectionHeading'
import { LeadStory, StoryCard, StoryRow, StoryLine } from '../components/StoryCard'
import { AdSlot } from '../components/AdSlot'
import { RandWatch } from '../components/Widgets'
import { LottoResults } from '../components/LottoResults'
import { ResultsBrief } from '../components/ResultsBrief'
import { EmptyFeeds, HomeSkeleton } from '../components/Chrome'

const FEATURE_SECTIONS = ['south-africa', 'politics', 'business']
const TOP_COUNT = 6

interface Block {
  feature: Article[]
  rest: Article[]
}

function pick(items: Article[], limit: number, needImage = false, seen?: Set<string>): Article[] {
  const out: Article[] = []
  for (const item of items) {
    if (out.length >= limit) break
    if (seen) {
      if (seen.has(item.id) || (needImage && !item.image)) continue
      seen.add(item.id)
    }
    out.push(item)
  }
  return out
}

function splitBlock(bySection: Record<string, Article[]>, id: string, featureCount: number, restCount: number, needImage = false): Block {
  const items = interleave(bySection[id] ?? [])
  const seen = new Set<string>()
  let feature = pick(items, featureCount, needImage, seen)
  if (feature.length < featureCount) feature = [...feature, ...pick(items, featureCount - feature.length, false, seen)]
  let rest = pick(items, restCount, needImage, seen)
  if (rest.length < restCount) rest = [...rest, ...pick(items, restCount - rest.length, false, seen)]
  return { feature, rest }
}

function homeLayout(
  bySection: Record<string, Article[]>,
  all: Article[],
  headlines: Article[],
  featured: Article | undefined,
): {
  lead: Article
  secondary: Article[]
  top: Article[]
  elections: Block
  southAfrica: Block
  politics: Block
  business: Block
  sport: Block
  world: Block
  africa: Block
  tech: Block
  life: Block
  opinion: Block
} {
  const used = new Set<string>()
  const pool = interleave(FEATURE_SECTIONS.flatMap((id) => bySection[id] ?? []).length ? FEATURE_SECTIONS.flatMap((id) => bySection[id] ?? []) : all).filter(
    (item) => {
      if (used.has(item.id)) return false
      used.add(item.id)
      return true
    },
  )
  let leadGroup: Article[] = featured ? [featured] : pick(pool, 1, true)
  if (featured) used.add(featured.id)
  if (!leadGroup.length) leadGroup = pick(pool, 1)
  const lead = leadGroup[0]

  const headlinesTop = interleave(headlines).slice(0, TOP_COUNT)
  const secondarySource = [...headlinesTop.slice(0, 2), ...pick(pool, 2 - Math.min(2, headlinesTop.length), true)]
  const topSource = [...headlinesTop.slice(2), ...pick(pool, 4 - Math.max(0, headlinesTop.length - 2), true)]

  return {
    lead,
    secondary: secondarySource,
    top: topSource,
    elections: splitBlock(bySection, 'elections', 1, 6),
    southAfrica: splitBlock(bySection, 'south-africa', 1, 5),
    politics: splitBlock(bySection, 'politics', 0, 4, true),
    business: splitBlock(bySection, 'business', 1, 4),
    sport: splitBlock(bySection, 'sport', 1, 4, true),
    world: splitBlock(bySection, 'world', 1, 4),
    africa: splitBlock(bySection, 'africa', 1, 4),
    tech: splitBlock(bySection, 'tech', 0, 4, true),
    life: splitBlock(bySection, 'life', 0, 4, true),
    opinion: splitBlock(bySection, 'opinion', 0, 6),
  }
}

function LatestRail({ items }: { items: Article[] }) {
  const { now } = useNews()
  return (
    <section aria-labelledby="latest-rail" className="lg:border-l lg:border-line lg:pl-6">
      <div className="mb-1 flex items-center justify-between">
        <h2 id="latest-rail" className="flex items-center gap-2.5 text-lg font-black uppercase tracking-[-0.01em]">
          <span className="live-dot size-2 rounded-full bg-brand [--pulse-color:var(--color-brand)]" aria-hidden="true" />
          Latest
        </h2>
        <Link to="/latest" className="-my-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-navy hover:underline">
          See all <ChevronRight size={15} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
      <ol className="grid gap-x-8 md:grid-cols-2 lg:grid-cols-1">
        {items.map((item, index) => (
          <li
            key={item.id}
            className={`group relative border-line py-3 ${index === 0 ? 'border-t-2 border-t-ink' : 'border-t'} ${index > 5 ? 'hidden md:block' : ''}`}
          >
            <p className="text-[12.5px] font-extrabold text-brand">
              {item.published !== null && (
                <time dateTime={new Date(item.published).toISOString()} title={`${formatTime(item.published)} SAST`}>
                  {timeAgo(item.published, now)}
                </time>
              )}
              <span className="font-semibold text-muted"> · {sourceName(item.sourceId)}</span>
            </p>
            <h3 className="mt-0.5 text-[15px] font-bold leading-[1.3]">
              <Link
                to={`/story/${item.id}`}
                className="decoration-brand decoration-2 underline-offset-[3px] after:absolute after:inset-0 after:content-[''] group-hover:underline"
              >
                {item.title}
              </Link>
            </h3>
          </li>
        ))}
      </ol>
    </section>
  )
}

function blockMeta(id: string): { id: string; title: string; to: string; moreLabel: string } {
  const label = SECTION_BY_ID[id].label
  return { id: `home-${id}`, title: label, to: `/section/${id}`, moreLabel: `More ${label}` }
}

function StoryList({ items }: { items: Article[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="py-4 first:pt-0 last:pb-0">
          <StoryRow item={item} />
        </li>
      ))}
    </ul>
  )
}

function CardGrid({ items }: { items: Article[] }) {
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

function TwinBlock({ id, block }: { id: string; block: Block }) {
  if (!block.feature.length && !block.rest.length) return null
  const meta = blockMeta(id)
  return (
    <section aria-labelledby={meta.id}>
      <SectionHeading id={meta.id} title={meta.title} to={meta.to} moreLabel={meta.moreLabel} />
      {block.feature[0] && (
        <div>
          <StoryCard item={block.feature[0]} size="lg" summary />
        </div>
      )}
      <ul className="mt-5 divide-y divide-line border-t border-line">
        {block.rest.map((item) => (
          <li key={item.id} className="py-3.5">
            <StoryLine item={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Home() {
  useTitle()
  const { ready, all, bySection, featured, headlines, status } = useNews()
  const layout = useMemo(() => homeLayout(bySection, all, headlines, featured), [bySection, all, headlines, featured])

  if (!ready) return <HomeSkeleton />
  if (all.length === 0 || !layout.lead) return <EmptyFeeds />

  const { elections, southAfrica, politics, business, sport, world, africa, tech, life, opinion } = layout

  return (
    <div className="pt-6 md:pt-8">
      <h1 className="sr-only">180news — top stories</h1>
      <div className="wrap grid gap-x-8 gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-9">
          <div className="grid gap-x-6 gap-y-8 lg:grid-cols-9">
            <div className="lg:col-span-6">
              <LeadStory item={layout.lead} />
            </div>
            {layout.secondary.length > 0 && (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-6 lg:col-span-3 lg:grid-cols-1 lg:content-start">
                {layout.secondary.map((item) => (
                  <li key={item.id}>
                    <StoryCard item={item} size="md" />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {layout.top.length > 0 && (
            <section aria-label="More top stories" className="mt-8 border-t border-line pt-6">
              <CardGrid items={layout.top} />
            </section>
          )}
        </div>
        <div className="lg:col-span-3">
          <LatestRail items={all.slice(0, 9)} />
        </div>
      </div>

      <AdSlot id="home" at="top" className="wrap mt-10 md:mt-12" />

      {elections.feature[0] && (
        <section aria-labelledby="home-elections" className="mt-10 border-y border-brand/20 bg-brand-tint py-9 md:mt-12 md:py-11">
          <div className="wrap">
            <SectionHeading id="home-elections" title="Elections update" to="/section/elections" moreLabel="See all">
              {status.kind === 'live' && (
                <span className="mr-auto hidden items-center gap-2 text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-brand sm:inline-flex">
                  <span className="live-dot size-2 rounded-full bg-brand [--pulse-color:var(--color-brand)]" aria-hidden="true" />
                  Live
                </span>
              )}
            </SectionHeading>
            <ResultsBrief className="mb-7" />
            <div className="grid items-start gap-x-8 gap-y-7 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <StoryCard item={elections.feature[0]} size="lg" summary />
              </div>
              <ul className="grid gap-x-8 border-t border-brand/20 sm:grid-cols-2 lg:col-span-7">
                {elections.rest.map((item) => (
                  <li key={item.id} className="border-b border-brand/20 py-3.5">
                    <StoryLine item={item} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <AdSlot id="home" at="elections" className="wrap mt-10 md:mt-12" />

      {southAfrica.feature[0] && (
        <section aria-labelledby="home-south-africa" className="wrap mt-12 md:mt-16">
          <SectionHeading {...blockMeta('south-africa')} />
          <div className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <StoryCard item={southAfrica.feature[0]} size="lg" summary />
            </div>
            <div className="lg:col-span-5">
              <StoryList items={southAfrica.rest} />
            </div>
          </div>
        </section>
      )}

      {politics.rest.length > 0 && (
        <section aria-labelledby="home-politics" className="wrap mt-12 md:mt-16">
          <SectionHeading {...blockMeta('politics')} />
          <CardGrid items={politics.rest} />
        </section>
      )}

      {business.feature[0] && (
        <section aria-labelledby="home-business" className="wrap mt-12 md:mt-16">
          <SectionHeading {...blockMeta('business')} />
          <div className="grid items-start gap-x-8 gap-y-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <StoryCard item={business.feature[0]} size="lg" summary />
            </div>
            <ul className="divide-y divide-line lg:col-span-4">
              {business.rest.map((item) => (
                <li key={item.id} className="py-3.5 first:pt-0">
                  <StoryLine item={item} />
                </li>
              ))}
            </ul>
            <div className="space-y-8 lg:col-span-3">
              <RandWatch />
              <LottoResults />
            </div>
          </div>
        </section>
      )}

      <AdSlot id="home" at="middle" className="wrap mt-12 md:mt-16" />

      {sport.feature[0] && (
        <section aria-labelledby="home-sport" className="on-dark dot-band mt-12 py-10 text-white md:mt-16 md:py-14">
          <div className="wrap">
            <SectionHeading {...blockMeta('sport')} dark />
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

      <div className="wrap mt-12 grid gap-x-10 gap-y-12 md:mt-16 md:grid-cols-2">
        <TwinBlock id="world" block={world} />
        <TwinBlock id="africa" block={africa} />
      </div>

      {tech.rest.length > 0 && (
        <section aria-labelledby="home-tech" className="wrap mt-12 md:mt-16">
          <SectionHeading {...blockMeta('tech')} />
          <CardGrid items={tech.rest} />
        </section>
      )}

      {life.rest.length > 0 && (
        <section aria-labelledby="home-life" className="wrap mt-12 md:mt-16">
          <SectionHeading {...blockMeta('life')} />
          <CardGrid items={life.rest} />
        </section>
      )}

      {opinion.rest.length > 0 && (
        <section aria-labelledby="home-opinion" className="mt-12 bg-wash py-10 md:mt-16 md:py-12">
          <div className="wrap">
            <SectionHeading {...blockMeta('opinion')} />
            <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {opinion.rest.map((item) => (
                <li key={item.id} className="group relative border-l-4 border-brand bg-paper p-5">
                  <h3 className="text-lg font-extrabold leading-[1.22] tracking-[-0.01em] text-balance">
                    <Link
                      to={`/story/${item.id}`}
                      className="decoration-brand decoration-2 underline-offset-[3px] after:absolute after:inset-0 after:content-[''] group-hover:underline"
                    >
                      {item.title}
                    </Link>
                  </h3>
                  {item.summary && <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-body">{item.summary}</p>}
                  <p className="mt-3 text-[12.5px] text-muted">
                    {item.author && (
                      <span className="font-bold text-ink">
                        {item.author} ·{' '}
                      </span>
                    )}
                    <span className="font-extrabold uppercase tracking-[0.04em] text-brand">{sourceName(item.sourceId)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <AdSlot id="home" at="bottom" className="wrap mt-12 md:mt-16" />
    </div>
  )
}
