import { ArrowRight, Bookmark, Calculator, CalendarClock, Info, Landmark, Search, SlidersHorizontal, Tags } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { AdminAccount, SignOutButton } from '../components/AdminGate'
import { AdsControl } from '../components/AdsControl'
import { tagsInUse, useControl } from '../lib/control'
import { useTitle } from '../lib/extras'
import { PUBLISHERS, SECTIONS } from '../lib/feed/sources'
import { stamp } from '../lib/format'
import { useNews } from '../lib/news/store'
import { useSaved } from '../lib/saved'

interface Tool {
  to: string
  icon: LucideIcon
  title: string
  about: string
  /** What is there right now. */
  state: string
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** One place for running 180news: each tool, what it is for and where it stands. */
export default function Admin() {
  useTitle('Admin')
  const { articles, liveAt, sections, settings } = useControl()
  const { all, status, now } = useNews()
  const { saved } = useSaved()

  const upcoming = articles.map((a) => a.publishAt ?? 0).filter((t) => t > liveAt)
  const tags = tagsInUse(articles)
  const tagged = articles.filter((a) => a.tags?.length).length
  const newsrooms = Object.keys(PUBLISHERS).length

  const groups: Array<{ id: string; title: string; columns: string; tools: Tool[] }> = [
    {
      id: 'admin-publishing',
      title: 'Publishing and elections',
      columns: 'lg:grid-cols-4',
      tools: [
        {
          to: '/admin/scheduled',
          icon: CalendarClock,
          title: 'Scheduled posts',
          about: 'See what is waiting to go live and when. Publish early, change the time, or delete.',
          state: upcoming.length === 0 ? 'Nothing scheduled' : `${upcoming.length} scheduled · next ${stamp(Math.min(...upcoming), now)}`,
        },
        {
          to: '/admin/tags',
          icon: Tags,
          title: 'Categories and tags',
          about: 'See every tag in use, rename one everywhere it appears, or take it off all articles.',
          state: tags.length === 0 ? 'No tags yet' : `${plural(tags.length, 'tag', 'tags')} on ${plural(tagged, 'article', 'articles')}`,
        },
        {
          to: '/results',
          icon: Landmark,
          title: 'IEC results',
          about: 'Votes, seats and councils for every party in the 2026 local government elections, as published by the IEC.',
          state: 'From the IEC’s results system · open to all readers',
        },
        {
          to: '/results/seats',
          icon: Calculator,
          title: 'LGE seat calculator',
          about: 'See how each party’s votes become council seats and, for hung councils, which coalitions add up to a majority.',
          state: 'Metro and local councils · open to all readers',
        },
      ],
    },
    {
      id: 'admin-site',
      title: 'Site',
      columns: 'lg:grid-cols-4',
      tools: [
        {
          to: '/control',
          icon: SlidersHorizontal,
          title: 'Control panel',
          about: 'Choose the sections and newsrooms shown, set the headline crawl and contact details, back up, and manage every article.',
          state: `${sections.length} of ${SECTIONS.length} sections on · ${newsrooms - settings.hiddenSources.length} of ${newsrooms} newsrooms on`,
        },
        {
          to: '/about',
          icon: Info,
          title: 'About & feed status',
          about: 'See how 180news works and whether each newsroom’s feed is live right now.',
          state:
            status.kind === 'live'
              ? `${status.live} of ${status.total} feeds live`
              : status.kind === 'loading'
                ? 'Checking feeds…'
                : status.kind === 'saved'
                  ? 'Live feeds unreachable — showing saved copies'
                  : 'Feeds unreachable',
        },
        {
          to: '/saved',
          icon: Bookmark,
          title: 'Saved stories',
          about: 'The stories bookmarked on this device, kept even after they leave the live feeds.',
          state: saved.length === 0 ? 'Nothing saved yet' : `${plural(saved.length, 'story', 'stories')} saved`,
        },
        {
          to: '/search',
          icon: Search,
          title: 'Search',
          about: 'Find current headlines and articles by topic, name, place, tag or newsroom.',
          state: all.length === 0 ? 'No headlines loaded yet' : `${plural(all.length, 'headline', 'headlines')} to search`,
        },
      ],
    },
  ]

  return (
    <div className="wrap pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">Admin</h1>
          <SignOutButton />
        </div>
        <p className="mt-3 max-w-[66ch] text-[16px] leading-relaxed text-body">
          Everything for running 180news, in one place. What you change here is stored in this browser, so it applies on this device.
        </p>
      </header>

      {groups.map((group) => (
        <Fragment key={group.id}>
          <section aria-labelledby={group.id} className="mt-9">
            <h2 id={group.id} className="text-sm font-black uppercase tracking-[0.06em] text-navy">
              {group.title}
            </h2>
            <ul className={`mt-3 grid gap-5 sm:grid-cols-2 ${group.columns}`}>
              {group.tools.map(({ to, icon: Icon, title, about, state }) => (
                <li key={to} className="group relative flex flex-col border border-line bg-paper p-5 transition-colors hover:border-navy">
                  <span className="grid size-11 place-items-center bg-navy-tint text-navy" aria-hidden="true">
                    <Icon size={21} strokeWidth={2.2} />
                  </span>
                  <h3 className="mt-4 text-xl font-extrabold leading-tight tracking-tight">
                    <Link
                      to={to}
                      className="decoration-brand decoration-2 underline-offset-[3px] after:absolute after:inset-0 after:content-[''] group-hover:underline"
                    >
                      {title}
                    </Link>
                  </h3>
                  <p className="mt-1.5 grow text-[15px] leading-relaxed text-body">{about}</p>
                  <p
                    className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-[13.5px] font-bold leading-snug text-navy"
                    aria-live="polite"
                  >
                    <span>{state}</span>
                    <ArrowRight size={17} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
                  </p>
                </li>
              ))}
            </ul>
          </section>
          {group.id === 'admin-publishing' && <AdsControl />}
        </Fragment>
      ))}
      <AdminAccount />
    </div>
  )
}
