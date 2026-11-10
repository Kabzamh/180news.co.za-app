import { Pause, Play } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useControl } from '../lib/control'
import { publisherName } from '../lib/feed/sources'
import { timeAgo } from '../lib/format'
import { useNews } from '../lib/news/store'

/** Crawl speeds in pixels per second, and a rough width for one headline. */
const SPEEDS = { slow: 38, normal: 64, fast: 104 }
const estimateWidth = (title: string) => title.length * 8.2 + 190

/**
 * The newest headlines crawling across the lower row of the floating glass bar.
 * Pauses on hover, on keyboard focus and with the pause button; under
 * reduced motion it becomes a static row that scrolls by hand.
 */
export function Ticker() {
  const { all, now } = useNews()
  const [paused, setPaused] = useState(false)
  const { settings } = useControl()
  const message = settings.crawlMessage.trim()
  const items = all.slice(0, 12)
  if (!settings.crawlEnabled || (items.length === 0 && !message)) return null

  const width = items.reduce((sum, item) => sum + estimateWidth(item.title), message ? estimateWidth(message) : 0)
  const duration = Math.max(12, Math.round(width / SPEEDS[settings.crawlSpeed]))

  const run = (copy: boolean) => (
    <ul aria-hidden={copy ? 'true' : undefined} className="flex shrink-0 items-center">
      {message && (
        <li className="flex shrink-0 items-center whitespace-nowrap">
          <span className="mr-2.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase leading-none tracking-[0.08em] text-navy-deep">Notice</span>
          <span className="text-[14.5px] font-bold text-white sm:text-[15px]">{message}</span>
          <span className="mx-5 size-1.5 rounded-full bg-white/55" aria-hidden="true" />
        </li>
      )}
      {items.map((item) => (
        <li key={item.id} className="flex shrink-0 items-center whitespace-nowrap">
          <Link
            to={`/story/${item.id}`}
            tabIndex={copy ? -1 : undefined}
            className="text-[14.5px] font-bold text-white decoration-white decoration-2 underline-offset-[3px] hover:underline sm:text-[15px]"
          >
            {item.title}
          </Link>
          <span className="ml-2.5 text-[12.5px] font-semibold text-white/80">
            {publisherName(item.sourceId)} · {timeAgo(item.published, now)}
          </span>
          <span className="mx-5 size-1.5 rounded-full bg-white/55" aria-hidden="true" />
        </li>
      ))}
    </ul>
  )

  return (
    <section aria-label="Latest headlines" className="on-dark glass-navy flex h-11 items-center gap-1 pl-1.5 pr-1">
      <span className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full bg-brand px-3.5 text-[11.5px] font-black uppercase leading-none tracking-[0.08em] text-white">
        <span className="live-dot size-1.5 rounded-full bg-white [--pulse-color:#ffffff]" aria-hidden="true" />
        Latest
      </span>
      <div
        className="crawl-track min-w-0 flex-1 overflow-hidden"
        onBlur={(e) => {
          // Focusing a link can scroll the track; put it back so the loop stays seamless.
          if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.scrollLeft = 0
        }}
      >
        <div className="crawl flex w-max" data-paused={paused} style={{ animationDuration: `${duration}s` }}>
          {run(false)}
          {run(true)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? 'Play headline crawl' : 'Pause headline crawl'}
        title={paused ? 'Play' : 'Pause'}
        className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-white/80 hover:bg-white/15 hover:text-white motion-reduce:hidden"
      >
        {paused ? <Play size={16} strokeWidth={2.6} aria-hidden="true" /> : <Pause size={16} strokeWidth={2.6} aria-hidden="true" />}
      </button>
    </section>
  )
}
