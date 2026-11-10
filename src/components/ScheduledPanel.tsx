import { CalendarClock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useControl } from '../lib/control'
import type { Article } from '../lib/control'
import { SECTION_BY_ID } from '../lib/feed/sources'
import { clock, dayKey, fullDate, timeAgo, timeUntil } from '../lib/format'
import { useNews } from '../lib/news/store'

/** Upcoming articles listed: three, or two on a phone so the news is not pushed off the first screen. */
const SHOWN = 3
const SHOWN_SMALL = 2
const JUST_LIVE_MS = 30 * 60_000

/**
 * The author's view of scheduled articles on the front page: what is coming
 * up, when it goes live and where it will land, and what has just gone live.
 * Scheduled articles are stored on this device, so nobody else sees this.
 */
export function ScheduledPanel() {
  const { articles, liveAt, settings } = useControl()
  const { now } = useNews()
  if (!settings.showScheduled) return null

  const present = Math.max(now, liveAt)
  const upcoming = articles.filter((a) => (a.publishAt ?? 0) > liveAt).sort((a, b) => (a.publishAt ?? 0) - (b.publishAt ?? 0))
  const justLive = articles.filter((a) => a.publishAt && a.publishAt <= liveAt && present - a.publishAt < JUST_LIVE_MS)
  if (upcoming.length === 0 && justLive.length === 0) return null

  /** Where on the site an article lands, or why it will not. */
  const landing = (a: Article, live: boolean): string => {
    if (a.hidden) return live ? 'Hidden, so it is not on the site.' : 'Hidden, so it will stay off the site.'
    if (settings.hiddenSections.includes(a.section)) return `${SECTION_BY_ID[a.section].label} is switched off, so it ${live ? 'is not' : 'will not be'} on the site.`
    if (a.pinned) return live ? 'It is the main headline.' : 'It will be the main headline.'
    if (a.headline) return live ? 'It is in the headline news.' : 'It will join the headline news.'
    return live ? `It is in ${SECTION_BY_ID[a.section].label} and Latest.` : `It will appear in ${SECTION_BY_ID[a.section].label} and Latest.`
  }
  const when = (ms: number) => (dayKey(ms) === dayKey(present) ? `today at ${clock(ms)}` : `on ${fullDate(ms)}`)
  const link = 'font-extrabold text-ink decoration-2 underline-offset-[3px] hover:underline'
  const row = 'border-t border-[#5c4000]/20 py-2.5 text-[14.5px] leading-snug first:border-t-0'

  return (
    <section aria-labelledby="home-scheduled" className="wrap mb-7">
      <div className="border-l-4 border-warn bg-[#fdf1d4] px-4 py-4 text-[#5c4000] sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="home-scheduled" className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.06em]">
            <CalendarClock size={17} strokeWidth={2.3} className="translate-y-0.5 self-start" aria-hidden="true" />
            Your scheduled articles
          </h2>
          <p className="text-[13px]">Only you can see this panel.</p>
        </div>

        <ul className="mt-2">
          {justLive.map((a) => (
            <li key={a.id} className={row}>
              <span className="mr-1 inline-flex items-center gap-1.5 rounded-full bg-[#0b5a2e] px-2.5 py-0.5 text-[11.5px] font-extrabold uppercase tracking-[0.05em] text-white">
                Live now
              </span>{' '}
              <Link to={`/story/${a.id}`} className={link}>
                {a.title}
              </Link>
              <span className="block pt-0.5">
                Published {timeAgo(a.publishAt ?? present, present).toLowerCase()}. {landing(a, true)}
              </span>
            </li>
          ))}
          {upcoming.slice(0, SHOWN).map((a, i) => (
            <li key={a.id} className={`${row} ${i >= SHOWN_SMALL ? 'hidden sm:block' : ''}`}>
              <Link to={`/story/${a.id}`} className={link}>
                {a.title}
                <span className="sr-only"> (preview)</span>
              </Link>
              <span className="block pt-0.5">
                Goes live {when(a.publishAt ?? present)} — {timeUntil(a.publishAt ?? present, present)}. {landing(a, false)}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-1 border-t border-[#5c4000]/20 pt-2.5 text-[13.5px]">
          {upcoming.length > SHOWN_SMALL && <span className="sm:hidden">{upcoming.length - SHOWN_SMALL} more scheduled. </span>}
          {upcoming.length > SHOWN && <span className="hidden sm:inline">{upcoming.length - SHOWN} more scheduled. </span>}
          <Link to="/control#ctl-articles" className="font-bold underline underline-offset-[3px]">
            Publish early, reschedule or hide this panel in the Control panel
          </Link>
        </p>
      </div>
    </section>
  )
}
