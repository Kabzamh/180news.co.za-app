import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pause, Play } from 'lucide-react'
import { useNews } from '../lib/news/store'
import { useControl } from '../lib/control'
import { sourceName } from '../lib/feeds'
import { timeAgo } from '../lib/format'

const SPEEDS = { slow: 38, normal: 64, fast: 104 }
const widthOf = (title: string): number => title.length * 8.2 + 190

export function Ticker() {
  const { all, now } = useNews()
  const [paused, setPaused] = useState(false)
  const { settings } = useControl()
  const notice = settings.crawlMessage.trim()
  const items = all.slice(0, 12)
  if (!settings.crawlEnabled || (items.length === 0 && !notice)) return null
  const totalWidth = items.reduce((sum, item) => sum + widthOf(item.title), notice ? widthOf(notice) : 0)
  const seconds = Math.max(12, Math.round(totalWidth / SPEEDS[settings.crawlSpeed]))

  const track = (hidden: boolean) => (
    <ul aria-hidden={hidden ? true : undefined} className="flex shrink-0 items-center">
      {notice && (
        <li className="flex shrink-0 items-center whitespace-nowrap">
          <span className="mr-2.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase leading-none tracking-[0.08em] text-navy-deep">Notice</span>
          <span className="text-[14.5px] font-bold text-white sm:text-[15px]">{notice}</span>
          <span className="mx-5 size-1.5 rounded-full bg-white/55" aria-hidden="true" />
        </li>
      )}
      {items.map((item) => (
        <li key={item.id} className="flex shrink-0 items-center whitespace-nowrap">
          <Link
            to={`/story/${item.id}`}
            tabIndex={paused ? -1 : undefined}
            className="text-[14.5px] font-bold text-white decoration-white decoration-2 underline-offset-[3px] hover:underline sm:text-[15px]"
          >
            {item.title}
          </Link>
          <span className="ml-2.5 text-[12.5px] font-semibold text-white/80">
            {sourceName(item.sourceId)} · {timeAgo(item.published, now)}
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
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) e.currentTarget.scrollLeft = 0
        }}
      >
        <div className="crawl flex w-max" data-paused={paused} style={{ animationDuration: `${seconds}s` }}>
          {track(false)}
          {track(true)}
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

export function NewStoriesButton() {
  const { pendingCount, applyPending } = useNews()
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[116px] z-50 flex justify-center px-4">
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={applyPending}
          className="rise pointer-events-auto inline-flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-brand px-5 text-sm font-extrabold text-white shadow-[0_8px_24px_rgb(2_3_79_/_0.28)] hover:bg-brand-strong"
        >
          {pendingCount} new {pendingCount === 1 ? 'story' : 'stories'}
        </button>
      )}
    </div>
  )
}

export function Rail() {
  return null
}

export function useLiveTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} | 180news` : '180news — Live South African news headlines'
  }, [title])
}

export function useTickerRef() {
  return useRef<HTMLUListElement>(null)
}
