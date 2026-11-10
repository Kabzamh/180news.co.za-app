import { useControl } from '../lib/control'
import { useTitle } from '../lib/extras'
import { FEEDS, PUBLISHERS, SECTION_BY_ID } from '../lib/feed/sources'
import { stamp } from '../lib/format'
import { useNews } from '../lib/news/store'
import type { FeedState } from '../lib/news/store'

function describe(state: FeedState | undefined, checking: boolean): { label: string; tone: string } {
  if (!state || (state.origin === 'none' && checking)) return { label: 'Checking…', tone: 'bg-line text-body' }
  if (state.origin === 'live' || state.origin === 'relay') {
    return state.error
      ? { label: 'Live, last check failed', tone: 'bg-[#fdf1d4] text-[#6b4a00]' }
      : { label: state.origin === 'relay' ? 'Live via relay' : 'Live', tone: 'bg-[#dff5e8] text-[#0b5a2e]' }
  }
  if (state.origin === 'cache') return { label: 'Earlier copy from this device', tone: 'bg-[#fdf1d4] text-[#6b4a00]' }
  if (state.origin === 'snapshot') return { label: 'Saved copy', tone: 'bg-[#fdf1d4] text-[#6b4a00]' }
  return { label: 'Unavailable', tone: 'bg-brand-tint text-brand' }
}

export default function About() {
  useTitle('About & feed status')
  const { feeds, now, refreshing, ready, refresh, status } = useNews()
  const { refreshMinutes } = useControl().settings

  return (
    <div className="wrap max-w-[980px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">About 180news</h1>
      </header>

      <div className="mt-6 max-w-[68ch] space-y-4 text-[17px] leading-relaxed text-body">
        <p>
          180news gathers the latest headlines from South African and international newsrooms onto one front page, so you can see how the day is
          being reported without opening a dozen sites.
        </p>
        <p>
          We show each publisher’s headline, summary and picture as supplied in that publisher’s public RSS feed; long summaries are shortened.
          The reporting is theirs: every story links straight to the full article on the publisher’s own website.
        </p>
      </div>

      <section aria-labelledby="how-live" className="mt-10">
        <h2 id="how-live" className="text-2xl font-extrabold tracking-tight">
          How live is it?
        </h2>
        <ul className="mt-3 max-w-[68ch] list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-body">
          <li>
            {refreshMinutes > 0
              ? `Feeds are re-checked every ${refreshMinutes} minutes while 180news is open, and whenever you press the refresh control in the top bar.`
              : 'Feeds are checked when 180news opens and whenever you press the refresh control in the top bar.'}
          </li>
          <li>When new headlines arrive while you are reading, a “new stories” button appears instead of the page moving under you.</li>
          <li>If a publisher’s feed cannot be reached, we keep showing the last copy we have and label it below — nothing is made up to fill a gap.</li>
          <li>Saved stories and your weather city are stored only in this browser.</li>
        </ul>
      </section>

      <section aria-labelledby="feed-status" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="feed-status" className="text-2xl font-extrabold tracking-tight">
              Feed status
            </h2>
            <p className="mt-1 text-[15px] text-muted" aria-live="polite">
              {status.kind === 'live'
                ? `${status.live} of ${status.total} feeds are live.`
                : status.kind === 'loading'
                  ? 'Checking feeds…'
                  : status.kind === 'saved'
                    ? 'Live feeds are unreachable — showing saved copies.'
                    : 'No feeds could be reached.'}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex h-11 cursor-pointer items-center border-2 border-navy px-5 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-progress disabled:opacity-60"
          >
            {refreshing ? 'Checking…' : 'Check feeds now'}
          </button>
        </div>

        <div className="mt-4 overflow-x-auto border border-line">
          <table className="w-full min-w-[620px] border-collapse text-left text-[15px]">
            <thead>
              <tr className="bg-wash text-[12.5px] uppercase tracking-[0.05em] text-muted">
                <th scope="col" className="px-4 py-3 font-extrabold">Newsroom</th>
                <th scope="col" className="px-4 py-3 font-extrabold">Section</th>
                <th scope="col" className="px-4 py-3 font-extrabold">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-extrabold">Stories</th>
                <th scope="col" className="px-4 py-3 font-extrabold">Fetched</th>
              </tr>
            </thead>
            <tbody>
              {FEEDS.map((def) => {
                const state = feeds[def.id]
                const info = describe(state, refreshing || !ready)
                const publisher = PUBLISHERS[def.sourceId]
                return (
                  <tr key={def.id} className="border-t border-line">
                    <th scope="row" className="px-4 py-3 font-bold">
                      <a href={publisher.home} target="_blank" rel="noopener noreferrer" className="text-navy underline-offset-2 hover:underline">
                        {publisher.name}
                      </a>
                    </th>
                    <td className="px-4 py-3 text-body">{SECTION_BY_ID[def.section].label}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-[12.5px] font-bold ${info.tone}`}>{info.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-body">{state?.items.length ?? 0}</td>
                    <td className="px-4 py-3 tabular-nums text-body">{state && state.fetchedAt > 0 ? stamp(state.fetchedAt, now) : '–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="credits" className="mt-10">
        <h2 id="credits" className="text-2xl font-extrabold tracking-tight">
          Data credits
        </h2>
        <p className="mt-3 max-w-[68ch] text-[16px] leading-relaxed text-body">
          Weather readings come from{' '}
          <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">
            Open-Meteo
          </a>
          . Rand figures are daily reference rates —{' '}
          <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">
            Rates by ExchangeRate-API
          </a>{' '}
          — and are not live trading prices.
        </p>
      </section>
    </div>
  )
}
