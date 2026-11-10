import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useControl } from '../lib/control'
import { stamp } from '../lib/format'
import { count, useNationalResults } from '../lib/iecClient'
import { useNews } from '../lib/news/store'

const PARTIES = 6
const link = 'inline-flex h-11 items-center gap-1.5 border-2 border-navy px-4 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white'

/**
 * The IEC's results at a glance, for the Elections update on the front page:
 * the largest parties' share of the vote and council seats, kept up to date on
 * the same schedule as the news feeds.
 */
export function ResultsBrief({ className = '' }: { className?: string }) {
  const { settings } = useControl()
  const { now } = useNews()
  const { results } = useNationalResults(settings.refreshMinutes)
  const data = results.state === 'ready' ? results.data : null
  const t = data?.totals

  const parties = data ? data.parties.filter((p) => p.id > 0).slice(0, PARTIES) : []
  const valid = t?.validVotes || 1
  const share = (votes: number) => (votes / valid) * 100
  const top = Math.max(...parties.map((p) => share(p.votes)), 1)
  const undecided = t ? t.councils - t.majority - t.hung : 0
  const asAt = data?.reportedAt ? ` · figures as at ${stamp(data.reportedAt, now)}` : ''

  return (
    <section aria-labelledby="home-results" className={`border border-brand/25 bg-paper p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 id="home-results" className="text-[19px] font-black uppercase leading-tight tracking-[-0.01em]">
          IEC results <span className="text-[13.5px] font-extrabold normal-case tracking-normal text-muted">· 2026 local government elections</span>
        </h3>
        <p role="status" className="flex items-center gap-2 text-[13.5px] font-bold text-body">
          {results.state === 'loading' && 'Fetching results from the IEC…'}
          {results.state === 'error' && 'The results could not be loaded just now.'}
          {results.state === 'ready' && results.origin === 'live' && !results.missed && (
            <>
              <span className="live-dot size-2 shrink-0 rounded-full bg-brand [--pulse-color:var(--color-brand)]" aria-hidden="true" />
              <span>Live from the IEC{asAt}</span>
            </>
          )}
          {results.state === 'ready' && results.origin === 'live' && results.missed && (
            <>
              <span className="size-2 shrink-0 rounded-full bg-warn" aria-hidden="true" />
              <span>The IEC could not be reached on the last check{asAt}</span>
            </>
          )}
          {results.state === 'ready' && results.origin === 'saved' && (
            <>
              <span className="size-2 shrink-0 rounded-full bg-warn" aria-hidden="true" />
              <span>Saved copy{asAt}</span>
            </>
          )}
        </p>
      </div>

      {results.state === 'loading' && (
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:grid-cols-6" aria-hidden="true">
          {Array.from({ length: PARTIES }, (_, i) => (
            <div key={i} className="h-[88px] animate-pulse bg-line/70 motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {data && t && (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
            {parties.map((p) => (
              <li key={p.id} className="flex flex-col">
                <span className="text-[25px] font-black leading-none tabular-nums tracking-[-0.01em] sm:text-[27px]">{share(p.votes).toFixed(2)}%</span>
                <span className="mt-1.5 text-[14.5px] font-extrabold leading-snug">{p.name}</span>
                <span className="mt-auto block pt-2" aria-hidden="true">
                  <span className="block h-1.5 bg-line">
                    <span className="block h-full bg-navy" style={{ width: `${(share(p.votes) / top) * 100}%` }} />
                  </span>
                </span>
                <span className="mt-1.5 text-[13.5px] tabular-nums text-body">{count(p.seats)} council seats</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-[14.5px] leading-relaxed text-body">
            <span className="font-bold text-ink">{count(t.councils)} councils:</span> {t.majority} won outright,{' '}
            <Link to="/results?result=hung#results-councils" className="font-bold text-navy underline underline-offset-[3px]">
              {t.hung} hung
            </Link>
            {undecided > 0 ? `, ${undecided} still being decided` : ''}. {count(t.seatsAllocated)} of {count(t.seats)} seats allocated. Share is of all
            valid votes on the ward and PR ballots.
          </p>
        </>
      )}

      <ul className="mt-3 flex flex-wrap gap-2.5">
        <li>
          <Link to="/results" className={link}>
            Full results, council by council <ArrowRight size={15} strokeWidth={2.6} aria-hidden="true" />
          </Link>
        </li>
        <li>
          <Link to="/results/party" className={link}>
            Results by party <ArrowRight size={15} strokeWidth={2.6} aria-hidden="true" />
          </Link>
        </li>
        <li>
          <Link to="/results#results-coalitions" className={link}>
            Possible coalitions <ArrowRight size={15} strokeWidth={2.6} aria-hidden="true" />
          </Link>
        </li>
        <li>
          <Link to="/results/seats" className={link}>
            Seat calculator and coalitions <ArrowRight size={15} strokeWidth={2.6} aria-hidden="true" />
          </Link>
        </li>
      </ul>
    </section>
  )
}
