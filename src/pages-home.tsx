import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useNews, usePageTitle } from "./lib/providers";
import { SECTION_MAP, interleave, relTime, sourceName, timeHM, dateTimeSAST, type NewsItem } from "./lib/data";
import { AdSlot, FeedsDown, HomeSkeleton, IecSummary, LeadCard, LottoResults, RandWatch, RowCard, SectionHead, StoryCard, TextCard } from "./components";

type Block = { feature: NewsItem[]; rest: NewsItem[] };
const LEAD_SOURCES = ["south-africa", "politics", "business"];
const TOP_COUNT = 6;
function take(items: NewsItem[], count: number, imageOnly: boolean, used?: Set<string>): NewsItem[] {
  const out: NewsItem[] = [];
  for (const h of items) {
    if (out.length >= count) break;
    if (used) { if (used.has(h.id) || (imageOnly && !h.image)) continue; used.add(h.id); }
    out.push(h);
  }
  return out;
}
function sectionBlock(bySection: Record<string, NewsItem[]>, section: string, featureCount: number, restCount: number, imageFirst: boolean, used?: Set<string>): Block {
  const pool = interleave(bySection[section] ?? []);
  const local = new Set<string>();
  const pick = (count: number, img: boolean) => {
    const out: NewsItem[] = [];
    for (const d of pool) {
      if (out.length >= count) break;
      if (used?.has(d.id) || local.has(d.id) || (img && !d.image)) continue;
      local.add(d.id); used?.add(d.id); out.push(d);
    }
    return out;
  };
  let feature = pick(featureCount, imageFirst);
  if (feature.length < featureCount) feature = [...feature, ...pick(featureCount - feature.length, false)];
  let rest = pick(restCount, imageFirst);
  if (rest.length < restCount) rest = [...rest, ...pick(restCount - rest.length, false)];
  return { feature, rest };
}
function composeHome(bySection: Record<string, NewsItem[]>, all: NewsItem[], headlines: NewsItem[], featured?: NewsItem) {
  const used = new Set<string>();
  const leadPoolRaw = LEAD_SOURCES.flatMap((s) => bySection[s] ?? []);
  const leadPoolBase = leadPoolRaw.length ? leadPoolRaw : all;
  const seen = new Set<string>();
  const leadPool = interleave(leadPoolBase.filter((i) => seen.has(i.id) ? false : (seen.add(i.id), true)));
  const headlinePool = interleave(headlines);
  let lead: NewsItem | undefined = featured && !used.has(featured.id) ? featured : undefined;
  if (featured) used.add(featured.id);
  if (!lead) lead = take(leadPool, 1, true, used)[0] ?? take(leadPool, 1, false, used)[0];
  if (lead) used.add(lead.id);
  const secondaryHead = take(headlinePool, 2, false, used);
  const secondary = [...secondaryHead, ...take(leadPool, Math.max(0, 2 - secondaryHead.length), true, used)];
  const topHead = take(headlinePool, TOP_COUNT, false, used);
  const top = [...topHead, ...take(leadPool, Math.max(0, TOP_COUNT - topHead.length), true, used)];
  const elections = sectionBlock(bySection, "elections", 1, 6, false, used);
  const southAfrica = sectionBlock(bySection, "south-africa", 1, 5, false, used);
  const politics = sectionBlock(bySection, "politics", 0, 4, true, used);
  const business = sectionBlock(bySection, "business", 1, 4, false, used);
  const sport = sectionBlock(bySection, "sport", 1, 4, true, used);
  const world = sectionBlock(bySection, "world", 1, 4, false, used);
  const africa = sectionBlock(bySection, "africa", 1, 4, false, used);
  const tech = sectionBlock(bySection, "tech", 0, 4, true, used);
  const life = sectionBlock(bySection, "life", 0, 4, true, used);
  const opinion = sectionBlock(bySection, "opinion", 0, 6, false, used);
  const rail = all.filter((i) => !used.has(i.id)).slice(0, 9);
  return { lead, secondary, top, rail, elections, southAfrica, politics, business, sport, world, africa, tech, life, opinion };
}
function LatestRail({ items }: { items: NewsItem[] }) {
  const { now } = useNews();
  return (
    <section aria-labelledby="latest-rail" className="lg:border-l lg:border-line lg:pl-6">
      <div className="mb-1 flex items-center justify-between">
        <h2 id="latest-rail" className="flex items-center gap-2.5 text-lg font-black uppercase tracking-[-0.01em]"><span className="live-dot size-2 rounded-full bg-brand [--pulse-color:var(--color-brand)]" aria-hidden="true" />Latest</h2>
        <Link to="/latest" className="-my-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-navy hover:underline">See all <ChevronRight size={15} strokeWidth={2.5} aria-hidden="true" /></Link>
      </div>
      <ol className="grid gap-x-8 md:grid-cols-2 lg:grid-cols-1">
        {items.map((u, c) => (
          <li key={u.id} className={`group relative border-line py-3 ${c === 0 ? "border-t-2 border-t-ink" : "border-t"} ${c > 5 ? "hidden md:block" : ""}`}>
            <p className="text-[12.5px] font-extrabold text-brand">
              {u.published !== null && <time dateTime={new Date(u.published).toISOString()} title={`${timeHM(u.published)} SAST`}>{relTime(u.published, now)}</time>}
              <span className="font-semibold text-muted"> · {sourceName(u.sourceId)}</span>
            </p>
            <h3 className="mt-0.5 text-[15px] font-bold leading-[1.3]">
              <Link to={`/story/${u.id}`} className="decoration-brand decoration-2 underline-offset-[3px] after:absolute after:inset-0 after:content-[''] group-hover:underline">{u.title}</Link>
            </h3>
          </li>
        ))}
      </ol>
    </section>
  );
}
const headFor = (section: string) => ({ id: `home-${section}`, title: SECTION_MAP[section].label, to: `/section/${section}`, moreLabel: `More ${SECTION_MAP[section].label}` });
function RowList({ items }: { items: NewsItem[] }) {
  return <ul className="divide-y divide-line">{items.map((i) => <li key={i.id} className="py-4 first:pt-0 last:pb-0"><RowCard item={i} /></li>)}</ul>;
}
function CardGrid({ items }: { items: NewsItem[] }) {
  return <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 lg:grid-cols-4">{items.map((i) => <li key={i.id}><StoryCard item={i} size="sm" /></li>)}</ul>;
}
function SplitBlock({ id, block }: { id: string; block: Block }) {
  if (!block.feature.length && !block.rest.length) return null;
  const head = headFor(id);
  return (
    <section aria-labelledby={head.id}>
      <SectionHead id={head.id} title={head.title} to={head.to} moreLabel={head.moreLabel} />
      {block.feature[0] && <div><StoryCard item={block.feature[0]} size="lg" summary /></div>}
      <ul className="mt-5 divide-y divide-line border-t border-line">{block.rest.map((i) => <li key={i.id} className="py-3.5"><TextCard item={i} /></li>)}</ul>
    </section>
  );
}
export function HomePage() {
  usePageTitle();
  const { ready, all, bySection, featured, headlines, status } = useNews();
  const home = useMemo(() => composeHome(bySection, all, headlines, featured), [bySection, all, headlines, featured]);
  if (!ready) return <HomeSkeleton />;
  if (all.length === 0 || !home.lead) return <FeedsDown />;
  const { elections, southAfrica, politics, business, sport, world, africa, tech, life, opinion } = home;
  return (
    <div className="pt-6 md:pt-8">
      <h1 className="sr-only">180news — top stories</h1>
      <div className="wrap grid gap-x-8 gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-9">
          <div className="grid gap-x-6 gap-y-8 lg:grid-cols-9">
            <div className="lg:col-span-6"><LeadCard item={home.lead} /></div>
            {home.secondary.length > 0 && (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-6 lg:col-span-3 lg:grid-cols-1 lg:content-start">
                {home.secondary.map((i) => <li key={i.id}><StoryCard item={i} size="md" /></li>)}
              </ul>
            )}
          </div>
          {home.top.length > 0 && <section aria-label="More top stories" className="mt-8 border-t border-line pt-6"><CardGrid items={home.top} /></section>}
        </div>
        <div className="lg:col-span-3"><LatestRail items={home.rail} /></div>
      </div>
      <AdSlot id="home" at="top" className="wrap mt-10 md:mt-12" />
      {elections.feature[0] && (
        <section aria-labelledby="home-elections" className="mt-10 border-y border-brand/20 bg-brand-tint py-9 md:mt-12 md:py-11">
          <div className="wrap">
            <SectionHead id="home-elections" title="Elections update" to="/section/elections" moreLabel="See all">
              {status.kind === "live" && <span className="mr-auto hidden items-center gap-2 text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-brand sm:inline-flex"><span className="live-dot size-2 rounded-full bg-brand [--pulse-color:var(--color-brand)]" aria-hidden="true" />Live</span>}
            </SectionHead>
            <IecSummary className="mb-7" />
            <div className="grid items-start gap-x-8 gap-y-7 lg:grid-cols-12">
              <div className="lg:col-span-5"><StoryCard item={elections.feature[0]} size="lg" summary /></div>
              <ul className="grid gap-x-8 border-t border-brand/20 sm:grid-cols-2 lg:col-span-7">
                {elections.rest.map((i) => <li key={i.id} className="border-b border-brand/20 py-3.5"><TextCard item={i} /></li>)}
              </ul>
            </div>
          </div>
        </section>
      )}
      <AdSlot id="home" at="elections" className="wrap mt-10 md:mt-12" />
      {southAfrica.feature[0] && (
        <section aria-labelledby="home-south-africa" className="wrap mt-12 md:mt-16">
          <SectionHead {...headFor("south-africa")} />
          <div className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-12">
            <div className="lg:col-span-7"><StoryCard item={southAfrica.feature[0]} size="lg" summary /></div>
            <div className="lg:col-span-5"><RowList items={southAfrica.rest} /></div>
          </div>
        </section>
      )}
      {politics.rest.length > 0 && (
        <section aria-labelledby="home-politics" className="wrap mt-12 md:mt-16">
          <SectionHead {...headFor("politics")} />
          <CardGrid items={politics.rest} />
        </section>
      )}
      {business.feature[0] && (
        <section aria-labelledby="home-business" className="wrap mt-12 md:mt-16">
          <SectionHead {...headFor("business")} />
          <div className="grid items-start gap-x-8 gap-y-8 lg:grid-cols-12">
            <div className="lg:col-span-5"><StoryCard item={business.feature[0]} size="lg" summary /></div>
            <ul className="divide-y divide-line lg:col-span-4">{business.rest.map((i) => <li key={i.id} className="py-3.5 first:pt-0"><TextCard item={i} /></li>)}</ul>
            <div className="space-y-8 lg:col-span-3"><RandWatch /><LottoResults /></div>
          </div>
        </section>
      )}
      <AdSlot id="home" at="middle" className="wrap mt-12 md:mt-16" />
      {sport.feature[0] && (
        <section aria-labelledby="home-sport" className="on-dark dot-band mt-12 py-10 text-white md:mt-16 md:py-14">
          <div className="wrap">
            <SectionHead {...headFor("sport")} dark />
            <div className="grid items-start gap-x-8 gap-y-8 lg:grid-cols-12">
              <div className="lg:col-span-6"><StoryCard item={sport.feature[0]} size="lg" summary dark /></div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 lg:col-span-6">{sport.rest.map((i) => <li key={i.id}><StoryCard item={i} size="sm" dark /></li>)}</ul>
            </div>
          </div>
        </section>
      )}
      <div className="wrap mt-12 grid gap-x-10 gap-y-12 md:mt-16 md:grid-cols-2">
        <SplitBlock id="world" block={world} />
        <SplitBlock id="africa" block={africa} />
      </div>
      {tech.rest.length > 0 && (
        <section aria-labelledby="home-tech" className="wrap mt-12 md:mt-16">
          <SectionHead {...headFor("tech")} />
          <CardGrid items={tech.rest} />
        </section>
      )}
      {life.rest.length > 0 && (
        <section aria-labelledby="home-life" className="wrap mt-12 md:mt-16">
          <SectionHead {...headFor("life")} />
          <CardGrid items={life.rest} />
        </section>
      )}
      {opinion.rest.length > 0 && (
        <section aria-labelledby="home-opinion" className="mt-12 bg-wash py-10 md:mt-16 md:py-12">
          <div className="wrap">
            <SectionHead {...headFor("opinion")} />
            <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {opinion.rest.map((i) => (
                <li key={i.id} className="group relative border-l-4 border-brand bg-paper p-5">
                  <h3 className="text-lg font-extrabold leading-[1.22] tracking-[-0.01em] text-balance"><Link to={`/story/${i.id}`} className="decoration-brand decoration-2 underline-offset-[3px] after:absolute after:inset-0 after:content-[''] group-hover:underline">{i.title}</Link></h3>
                  {i.summary && <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-body">{i.summary}</p>}
                  <p className="mt-3 text-[12.5px] text-muted">{i.author && <span className="font-bold text-ink">{i.author} · </span>}<span className="font-extrabold uppercase tracking-[0.04em] text-brand">{sourceName(i.sourceId)}</span></p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <AdSlot id="home" at="bottom" className="wrap mt-12 md:mt-16" />
    </div>
  );
}
// re-export for typecheck of unused import guard
export const _dateTimeSAST = dateTimeSAST;
