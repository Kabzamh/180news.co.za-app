import { ArrowRight, Bookmark, Info, PenLine, Search, SlidersHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AD_SLOTS, useControl } from '../lib/control'
import { useTitle } from '../lib/extras'
import { SECTIONS } from '../lib/feed/sources'
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
  const { articles, liveAt, sections, ads } = useControl()
  const { all, status } = useNews()
  const { saved } = useSaved()

  const scheduled = articles.filter((a) => (a.publishAt ?? 0) > liveAt).length
  const slotsOn = AD_SLOTS.filter((slot) => ads[slot.id].enabled).length

  const tools: Tool[] = [
    {
      to: '/submit',
      icon: PenLine,
      title: 'Write an article',
      about: 'Write and publish an article with photos, video, audio, tags and YouTube or Facebook links, now or on a schedule.',
      state: articles.length === 0 ? 'No articles yet' : `${plural(articles.length, 'article', 'articles')}${scheduled ? ` · ${scheduled} scheduled` : ''}`,
    },
    {
      to: '/control',
      icon: SlidersHorizontal,
      title: 'Control panel',
      about: 'Choose the sections and newsrooms shown, set the headline crawl, ad slots and contact details, and manage articles.',
      state: `${sections.length} of ${SECTIONS.length} sections on · ${slotsOn} of ${AD_SLOTS.length} ad slots on`,
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
  ]

  return (
    <div className="wrap max-w-[1040px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">Admin</h1>
        <p className="mt-3 max-w-[66ch] text-[16px] leading-relaxed text-body">
          Everything for running 180news, in one place. This page has no password: anyone who opens it can use these tools, and what they change
          is stored in their own browser.
        </p>
      </header>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map(({ to, icon: Icon, title, about, state }) => (
          <li key={to} className="group relative flex flex-col border border-line bg-paper p-5 transition-colors hover:border-navy sm:p-6">
            <span className="grid size-11 place-items-center bg-navy-tint text-navy" aria-hidden="true">
              <Icon size={21} strokeWidth={2.2} />
            </span>
            <h2 className="mt-4 text-xl font-extrabold tracking-tight">
              <Link to={to} className="decoration-brand decoration-2 underline-offset-[3px] after:absolute after:inset-0 after:content-[''] group-hover:underline">
                {title}
              </Link>
            </h2>
            <p className="mt-1.5 grow text-[15px] leading-relaxed text-body">{about}</p>
            <p className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-[13.5px] font-bold text-navy" aria-live="polite">
              <span>{state}</span>
              <ArrowRight size={17} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
