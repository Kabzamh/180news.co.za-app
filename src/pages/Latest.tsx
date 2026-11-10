import { useMemo, useState } from 'react'
import { FeedsDown } from '../components/Chrome'
import { StoryRow } from '../components/StoryCard'
import { useTitle } from '../lib/extras'
import type { NewsItem } from '../lib/feed/types'
import { clock, dayHeading, dayKey } from '../lib/format'
import { useNews } from '../lib/news/store'

const PAGE = 30

export default function Latest() {
  useTitle('Latest')
  const { ready, all, now } = useNews()
  const [shown, setShown] = useState(PAGE)

  const groups = useMemo(() => {
    const out: Array<{ key: string; label: string; items: NewsItem[] }> = []
    for (const item of all.slice(0, shown)) {
      const stampMs = item.published ?? 0
      const key = item.published === null ? 'undated' : dayKey(stampMs)
      const last = out[out.length - 1]
      if (last && last.key === key) last.items.push(item)
      else out.push({ key, label: item.published === null ? 'Undated' : dayHeading(stampMs, now), items: [item] })
    }
    return out
  }, [all, shown, now])

  const remaining = all.length - Math.min(shown, all.length)

  return (
    <div className="wrap max-w-[860px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">Latest</h1>
        <p className="mt-2 text-[15px] text-muted">Every headline from every newsroom, newest first. Times are South African Standard Time.</p>
      </header>

      {!ready ? (
        <div className="mt-8 space-y-6" role="status" aria-label="Loading headlines">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-12 animate-pulse bg-line/70 motion-reduce:animate-none" />
              <div className="flex-1">
                <div className="h-4 w-11/12 animate-pulse bg-line/70 motion-reduce:animate-none" />
                <div className="mt-2 h-4 w-1/2 animate-pulse bg-line/70 motion-reduce:animate-none" />
              </div>
            </div>
          ))}
        </div>
      ) : all.length === 0 ? (
        <FeedsDown />
      ) : (
        <>
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label} className="mt-8">
              <h2 className="glass sticky top-[112px] z-10 rounded-xl px-4 py-2.5 text-sm font-black uppercase tracking-[0.05em] text-navy">
                {group.label}
              </h2>
              <ol>
                {group.items.map((item) => (
                  <li key={item.id} className="flex gap-3 border-b border-line py-4 sm:gap-5">
                    <span className="w-11 shrink-0 pt-0.5 text-[13.5px] font-extrabold tabular-nums text-brand">
                      {item.published !== null ? clock(item.published) : '–'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <StoryRow item={item} />
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {remaining > 0 && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="inline-flex h-12 cursor-pointer items-center border-2 border-navy px-7 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white"
              >
                Show earlier headlines ({remaining} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
