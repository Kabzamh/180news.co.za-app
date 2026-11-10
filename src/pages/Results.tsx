import { ArrowRight, Calculator, ExternalLink, RefreshCw } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fewestParties, majorityOf } from '../lib/coalitions'
import { useControl } from '../lib/control'
import { useTitle } from '../lib/extras'
import { fullDate } from '../lib/format'
import { IEC_DASHBOARD, IEC_EVENT } from '../lib/iec'
import type { CouncilSummary, LargestParties, LargestParty, NationalResults } from '../lib/iec'
import { count, useLargestParties, useNationalResults } from '../lib/iecClient'

const PAGE = 20
const field = 'h-12 w-full border border-ink/35 bg-paper px-3.5 text-base text-ink placeholder:text-muted'
const STATUS_LABEL: Record<CouncilSummary['status'], string> = { majority: 'Outright majority', hung: 'Hung council', pending: 'Still being decided' }
const STATUS_TONE: Record<CouncilSummary['status'], string> = {
  majority: 'bg-[#dff5e8] text-[#0b5a2e]',
  hung: 'bg-[#fdf1d4] text-[#6b4a00]',
  pending: 'bg-wash text-body',
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border border-line bg-paper p-4">
      <dt className="text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-muted">{label}</dt>
      <dd className="mt-1">
        <span className="block text-[21px] font-black leading-tight tabular-nums tracking-[-0.01em] min-[420px]:text-[26px] sm:text-[30px]">{value}</span>
        <span className="mt-0.5 block text-[13.5px] leading-snug text-body">{note}</span>
      </dd>
    </div>
  )
}

function PartyTable({ data }: { data: NationalResults }) {
  const valid = data.totals.validVotes || data.parties.reduce((sum, p) => sum + p.votes, 0)
  const share = (votes: number) => (valid > 0 ? (votes / valid) * 100 : 0)
  const top = Math.max(...data.parties.map((p) => share(p.votes)), 1)
  const th = 'px-3 py-3 font-extrabold'
  const td = 'px-3 py-3 tabular-nums'

  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full border-collapse text-left text-[15px]">
        <caption className="sr-only">National results by party</caption>
        <thead>
          <tr className="bg-wash text-[12.5px] uppercase tracking-[0.05em] text-muted">
            <th scope="col" className={th}>
              Party
            </th>
            <th scope="col" className={`${th} hidden text-right sm:table-cell`}>
              Votes
            </th>
            <th scope="col" className={`${th} min-w-[5.5rem] sm:min-w-[7.5rem]`}>
              Share
            </th>
            <th scope="col" className={`${th} hidden text-right md:table-cell`}>
              Ward seats
            </th>
            <th scope="col" className={`${th} hidden text-right md:table-cell`}>
              PR seats
            </th>
            <th scope="col" className={`${th} text-right`}>
              Seats
            </th>
            <th scope="col" className={`${th} hidden text-right lg:table-cell`}>
              Councils led
            </th>
            <th scope="col" className={`${th} hidden text-right lg:table-cell`}>
              Outright
            </th>
          </tr>
        </thead>
        <tbody>
          {data.parties.map((p) => (
            <tr key={p.id} className="border-t border-line">
              <th scope="row" className="px-3 py-3 font-bold leading-snug">
                {p.id > 0 ? (
                  <Link to={`/results/party?party=${p.id}`} className="underline decoration-line decoration-2 underline-offset-[3px] hover:decoration-brand">
                    {p.name}
                  </Link>
                ) : (
                  p.name
                )}
                {p.id === -2 && (
                  <Link to="/results/party" className="block text-[13.5px] text-navy underline underline-offset-[3px]">
                    Find a party
                  </Link>
                )}
                <span className="block text-[13px] font-normal tabular-nums text-muted sm:hidden">{count(p.votes)} votes</span>
              </th>
              <td className={`${td} hidden text-right sm:table-cell`}>{count(p.votes)}</td>
              <td className={td}>
                <span className="font-bold">{share(p.votes).toFixed(2)}%</span>
                <span className="mt-1 block h-1.5 bg-line" aria-hidden="true">
                  <span className="block h-full bg-navy" style={{ width: `${(share(p.votes) / top) * 100}%` }} />
                </span>
              </td>
              <td className={`${td} hidden text-right md:table-cell`}>{count(p.wardSeats)}</td>
              <td className={`${td} hidden text-right md:table-cell`}>{count(p.seats - p.wardSeats)}</td>
              <td className={`${td} text-right font-extrabold`}>{count(p.seats)}</td>
              <td className={`${td} hidden text-right lg:table-cell`}>{p.id > 0 ? count(p.councilsLed ?? 0) : '–'}</td>
              <td className={`${td} hidden text-right lg:table-cell`}>{p.id > 0 ? count(p.majorities ?? 0) : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const named = (p: LargestParty) => `${p.name} (${p.seats})`
const pairKey = (a: LargestParty, b: LargestParty) => [a.name, b.name].sort().join(' + ')

/** What the seats of a hung council's largest parties say about a majority. Null where it cannot be worked out yet. */
function coalitionFacts(c: CouncilSummary, largest: LargestParties | null) {
  const top = largest?.[c.id]
  if (c.status !== 'hung' || c.seatsAllocated < c.seats || !top || top.length < 2) return null
  const majority = majorityOf(c.seats)
  const needs = fewestParties(
    top.map((p) => p.seats),
    majority,
  )
  const members = top.slice(0, needs ?? top.length)
  const together = members.reduce((sum, p) => sum + p.seats, 0)
  // With second place shared, "the two largest parties" does not name one pair.
  const tied = needs === 2 && top.length > 2 && top[1].seats === top[2].seats
  let line: string
  if (needs === null) line = `The three largest parties hold ${together} together, so it needs at least four.`
  else if (needs === 3) line = `It needs at least three parties: ${named(top[0])}, ${named(top[1])} and ${named(top[2])} hold ${together} together.`
  else if (!tied) line = `The two largest parties, ${named(top[0])} and ${named(top[1])}, hold ${together} together.`
  else if (top[0].seats === top[2].seats)
    line = `Any two of ${top[0].name}, ${top[1].name} and ${top[2].name}, with ${top[0].seats} seats each, hold ${together} together.`
  else line = `The largest party, ${named(top[0])}, reaches it with either ${top[1].name} or ${top[2].name}, which have ${top[1].seats} seats each.`
  return { majority, needs, tied, line, pair: needs === 2 && !tied ? pairKey(top[0], top[1]) : null }
}

function Councils({ councils }: { councils: CouncilSummary[] }) {
  const [province, setProvince] = useState('')
  const loaded = useLargestParties()
  const largest = loaded.state === 'ready' ? loaded.data : null
  const [pair, setPair] = useState('')
  const [allPairs, setAllPairs] = useState(false)
  const listHeading = useRef<HTMLHeadingElement>(null)
  const facts = useMemo(() => new Map(councils.map((c) => [c.id, coalitionFacts(c, largest)])), [councils, largest])

  const overview = useMemo(() => {
    const hung = councils.filter((c) => c.status === 'hung')
    const known = hung.map((c) => facts.get(c.id)).filter((f) => !!f)
    const pairs = new Map<string, number>()
    for (const f of known) if (f.pair) pairs.set(f.pair, (pairs.get(f.pair) ?? 0) + 1)
    return {
      hung: hung.length,
      two: known.filter((f) => f.needs === 2).length,
      three: known.filter((f) => f.needs === 3).length,
      more: known.filter((f) => f.needs === null).length,
      waiting: hung.length - known.length,
      tied: known.filter((f) => f.tied).length,
      pairs: [...pairs].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    }
  }, [councils, facts])

  const showPair = (key: string) => {
    setPair(key)
    setStatus('hung')
    setProvince('')
    setQuery('')
    setShown(PAGE)
    // Take the reader, and keyboard focus, to the list that has just been narrowed.
    listHeading.current?.focus()
    listHeading.current?.scrollIntoView()
  }
  // A link can open the list already narrowed, for example to hung councils.
  const [params] = useSearchParams()
  const [status, setStatus] = useState(() => (['majority', 'hung', 'pending'].includes(params.get('result') ?? '') ? (params.get('result') as string) : ''))
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)

  const provinces = useMemo(() => [...new Set(councils.map((c) => c.province))].sort(), [councils])
  const statuses = useMemo(() => (['majority', 'hung', 'pending'] as const).filter((s) => councils.some((c) => c.status === s)), [councils])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return councils.filter(
      (c) =>
        (!province || c.province === province) &&
        (!status || c.status === status) &&
        (!pair || facts.get(c.id)?.pair === pair) &&
        (!q || `${c.name} ${c.code} ${c.leader?.name ?? ''}`.toLowerCase().includes(q)),
    )
  }, [councils, province, status, query, pair, facts])

  const change = (set: (value: string) => void) => (e: { target: { value: string } }) => {
    set(e.target.value)
    setShown(PAGE)
  }

  return (
    <>
      {overview.hung > 0 && (
        <section aria-labelledby="results-coalitions" className="mt-12">
          <h2 id="results-coalitions" className="text-2xl font-extrabold tracking-tight">
            Possible coalitions
          </h2>
          {loaded.state === 'loading' && (
            <p role="status" className="mt-2 text-[15.5px] font-bold text-body">
              Working out what the {overview.hung} hung councils need…
            </p>
          )}
          {loaded.state === 'error' && (
            <p className="mt-2 max-w-[78ch] text-[15.5px] leading-relaxed text-body">
              {overview.hung} councils are hung. The seats of their largest parties could not be loaded just now; open a council below for its seats and
              possible coalitions.
            </p>
          )}
          {loaded.state === 'ready' && (
            <>
              <p className="mt-2 max-w-[78ch] text-[16px] leading-relaxed text-body">
                <span className="font-bold text-ink">{overview.hung} councils are hung:</span> no party has more than half the seats. In{' '}
                <span className="font-bold text-ink">{overview.two}</span> of them the two largest parties together hold a majority
                {overview.three > 0 ? `; ${overview.three} ${overview.three === 1 ? 'needs' : 'need'} at least three parties` : ''}
                {overview.more > 0 ? `; ${overview.more} ${overview.more === 1 ? 'needs' : 'need'} four or more` : ''}.
                {overview.waiting > 0
                  ? ` ${overview.waiting} ${overview.waiting === 1 ? 'is' : 'are'} left out because not all the seats have been allocated yet.`
                  : ''}
              </p>
              <p className="mt-3 max-w-[78ch] border-l-4 border-navy bg-navy-tint px-4 py-3 text-[14.5px] leading-relaxed text-body">
                This is arithmetic on the IEC’s seats only. It shows which parties’ seats add up to a majority, not which parties are willing to govern
                together.
                {loaded.origin === 'saved' ? ` The IEC could not be reached just now, so it is worked out from a copy saved on ${fullDate(loaded.at)}.` : ''}
              </p>

              {overview.pairs.length > 0 && (
                <>
                  <h3 className="mt-6 text-[17px] font-extrabold">Where the two largest parties make a majority</h3>
                  <ul className="mt-2 divide-y divide-line border-y border-line">
                    {overview.pairs.slice(0, allPairs ? undefined : 6).map(([key, howMany]) => (
                      <li key={key} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2.5">
                        <p className="min-w-0 flex-1 basis-56 text-[15.5px] leading-snug">
                          <span className="font-bold">{key}</span>
                          <span className="block tabular-nums text-body sm:inline sm:before:content-['_—_']">
                            {howMany} {howMany === 1 ? 'council' : 'councils'}
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => showPair(key)}
                          aria-label={`Show the ${howMany} ${howMany === 1 ? 'council' : 'councils'} for ${key}`}
                          className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 text-sm font-bold text-ink transition-colors hover:border-navy hover:text-navy"
                        >
                          Show councils <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {overview.pairs.length > 6 && (
                    <button
                      type="button"
                      aria-expanded={allPairs}
                      onClick={() => setAllPairs((v) => !v)}
                      className="mt-1 inline-flex min-h-11 cursor-pointer items-center text-sm font-bold text-navy underline underline-offset-[3px]"
                    >
                      {allPairs ? 'Show fewer pairings' : `Show all ${overview.pairs.length} pairings`}
                    </button>
                  )}
                  {overview.tied > 0 && (
                    <p className="mt-2 max-w-[78ch] text-[14.5px] leading-relaxed text-muted">
                      {overview.tied} more {overview.tied === 1 ? 'council is' : 'councils are'} not counted under a pairing, because two parties share second
                      place there. Their entries in the list below name both.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}

      <section aria-labelledby="results-councils" className="mt-12">
        <h2 id="results-councils" ref={listHeading} tabIndex={-1} className="text-2xl font-extrabold tracking-tight outline-none">
          Council by council
        </h2>
        {pair && (
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-l-4 border-navy bg-navy-tint px-4 py-2 text-[15px] leading-snug">
            <span>
              Showing hung councils where the two largest parties are <span className="font-bold">{pair}</span>.
            </span>
            <button
              type="button"
              onClick={() => setPair('')}
              className="inline-flex min-h-11 cursor-pointer items-center font-bold text-navy underline underline-offset-[3px]"
            >
              Show all councils
            </button>
          </p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="results-province" className="block text-[14px] font-extrabold">
              Province
            </label>
            <select id="results-province" value={province} onChange={change(setProvince)} className={`${field} mt-1.5 cursor-pointer`}>
              <option value="">All provinces</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="results-status" className="block text-[14px] font-extrabold">
              Result
            </label>
            <select id="results-status" value={status} onChange={change(setStatus)} className={`${field} mt-1.5 cursor-pointer`}>
              <option value="">All results</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="results-search" className="block text-[14px] font-extrabold">
              Council or party
            </label>
            <input id="results-search" type="search" value={query} onChange={change(setQuery)} autoComplete="off" className={`${field} mt-1.5`} />
          </div>
        </div>

        <p className="mt-4 text-[15px] text-muted" aria-live="polite">
          {filtered.length === 0 ? 'No councils match. Clear a filter to see more.' : `${filtered.length} ${filtered.length === 1 ? 'council' : 'councils'}`}
        </p>

        <ul className="mt-2 divide-y divide-line border-y border-line">
          {filtered.slice(0, shown).map((c) => {
            const f = facts.get(c.id)
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
                <div className="min-w-0 flex-1 basis-64">
                  <h3 className="text-[18px] font-extrabold leading-tight">
                    {c.name}
                    <span className={`ml-2 inline-block rounded-full px-2.5 py-0.5 align-middle text-[12px] font-bold ${STATUS_TONE[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </h3>
                  <p className="mt-0.5 text-[13.5px] text-muted">
                    {c.code && `${c.code} · `}
                    {c.province} · {c.seats} seats
                    {c.districtsPct < 100 ? ` · ${c.districtsPct}% of voting districts counted` : ''}
                    {c.seatsAllocated < c.seats ? ` · ${c.seatsAllocated} seats allocated so far` : ''}
                  </p>
                  {c.leader && (
                    <p className="mt-1 text-[15px] leading-snug text-body">
                      {c.status === 'majority' ? 'Won by' : 'Largest party:'} <span className="font-bold text-ink">{c.leader.name}</span> — {c.leader.seats}{' '}
                      seats, {c.leader.share.toFixed(2)}% of votes
                    </p>
                  )}
                  {f && (
                    <p className="mt-1 text-[15px] leading-snug text-body">
                      A majority is {f.majority} seats. {f.line}
                    </p>
                  )}
                </div>
                <Link
                  to={`/results/seats?council=${c.id}`}
                  aria-label={`${c.status === 'hung' ? 'Seats and possible coalitions' : 'Seat calculation'} for ${c.name}`}
                  className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-bold text-ink transition-colors hover:border-navy hover:text-navy"
                >
                  {c.status === 'hung' ? 'Seats and coalitions' : 'Seat calculation'} <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>

        {filtered.length > shown && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="inline-flex h-12 cursor-pointer items-center border-2 border-navy px-7 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white"
            >
              Show more councils ({filtered.length - shown} left)
            </button>
          </div>
        )}
      </section>
    </>
  )
}

export default function Results() {
  useTitle('IEC election results')
  // Kept up to date on the same schedule as the news feeds.
  const { refreshMinutes } = useControl().settings
  const { results, refreshing, refresh } = useNationalResults(refreshMinutes)
  const data = results.state === 'ready' ? results.data : null
  const t = data?.totals
  const undecided = t ? t.councils - t.majority - t.hung : 0

  return (
    <div className="wrap pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <p className="text-sm font-black uppercase tracking-[0.08em] text-brand">{IEC_EVENT.name}</p>
        <h1 className="mt-1 text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">IEC results</h1>
        <p className="mt-3 max-w-[66ch] text-[16px] leading-relaxed text-body">
          Votes, seats and councils as published by the Electoral Commission of South Africa (IEC). District councils are not included.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <p role="status" className="flex items-center gap-2 text-[14.5px] font-bold">
            {results.state === 'loading' && 'Fetching results from the IEC…'}
            {results.state === 'ready' && results.origin === 'live' && !results.missed && (
              <>
                <span className="live-dot size-2 shrink-0 rounded-full bg-brand [--pulse-color:var(--color-brand)]" aria-hidden="true" />
                <span>
                  Live from the IEC{data?.reportedAt ? ` · figures as at ${fullDate(data.reportedAt)}` : ''}
                  {refreshMinutes > 0 ? ` · re-checked every ${refreshMinutes} minutes` : ''}
                </span>
              </>
            )}
            {results.state === 'ready' && results.origin === 'live' && results.missed && (
              <span className="border-l-4 border-warn bg-[#fdf1d4] px-3 py-2 font-bold text-[#5c4000]">
                The IEC’s results system could not be reached on the last check. These are the figures from the check before
                {data?.reportedAt ? `, as at ${fullDate(data.reportedAt)}` : ''}.
              </span>
            )}
            {results.state === 'ready' && results.origin === 'saved' && (
              <span className="border-l-4 border-warn bg-[#fdf1d4] px-3 py-2 font-bold text-[#5c4000]">
                The IEC’s results system could not be reached just now. Showing a copy saved on {fullDate(results.at)}
                {data?.reportedAt ? `, with IEC figures as at ${fullDate(data.reportedAt)}` : ''}.
              </span>
            )}
          </p>
          {results.state !== 'loading' && (
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex h-11 cursor-pointer items-center gap-2 border border-ink/35 px-4 text-sm font-bold hover:border-navy hover:text-navy disabled:cursor-progress"
            >
              <RefreshCw size={15} strokeWidth={2.5} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden="true" />
              {refreshing ? 'Checking…' : 'Refresh results'}
            </button>
          )}
        </div>
      </header>

      {results.state === 'loading' && (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4" role="status" aria-label="Loading results">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse bg-line/70 motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {results.state === 'error' && (
        <div className="mt-10 max-w-xl">
          <h2 className="text-2xl font-extrabold tracking-tight">The results could not be loaded</h2>
          <p className="mt-2 text-[16px] leading-relaxed text-body">
            Neither the IEC’s results system nor the saved copy could be reached. Check your connection and try again, or see the results on the IEC’s own site.
          </p>
        </div>
      )}

      {data && t && (
        <>
          <dl className="mt-8 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Councils"
              value={count(t.councils)}
              note={`${t.majority} with an outright majority · ${t.hung} hung${undecided > 0 ? ` · ${undecided} still being decided` : ''}`}
            />
            <Tile label="Council seats" value={count(t.seatsAllocated)} note={`allocated, of ${count(t.seats)}`} />
            <Tile label="Voting districts" value={count(t.districtsCounted)} note={`counted, of ${count(t.districts)}`} />
            <Tile
              label="Valid votes"
              value={count(t.validVotes)}
              note={`on the ward and PR ballots together · ${count(t.spoiltVotes)} spoilt · ${count(t.registered)} registered voters`}
            />
          </dl>

          <section aria-labelledby="results-national" className="mt-10">
            <h2 id="results-national" className="mb-4 text-2xl font-extrabold tracking-tight">
              National results by party
            </h2>
            <PartyTable data={data} />
            <p className="mt-3 max-w-[80ch] text-[13.5px] leading-relaxed text-muted">
              Share is of all valid votes on the ward and PR ballots. “Councils led” counts councils where a party has the most seats; “outright” those where it
              has more than half. “Other parties” groups the smaller parties as the IEC does; each of them can be looked up under Results by party.{' '}
              <span className="lg:hidden">Turn your phone sideways, or use a wider screen, to see ward seats, PR seats and councils.</span>
            </p>
          </section>

          <Councils councils={data.councils} />
        </>
      )}

      <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">
        <Link to="/results/seats" className="inline-flex h-12 items-center gap-2 bg-brand px-5 text-[15px] font-extrabold text-white hover:bg-brand-strong">
          <Calculator size={17} strokeWidth={2.4} aria-hidden="true" /> LGE seat calculator
        </Link>
        <Link
          to="/results/party"
          className="inline-flex h-12 items-center border-2 border-navy px-5 text-[15px] font-extrabold text-navy hover:bg-navy hover:text-white"
        >
          Results by party
        </Link>
        <a
          href={IEC_DASHBOARD}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center gap-2 border-2 border-navy px-5 text-[15px] font-extrabold text-navy hover:bg-navy hover:text-white"
        >
          IEC results dashboard <ExternalLink size={16} strokeWidth={2.5} aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <Link
          to="/section/elections"
          className="inline-flex h-12 items-center border-2 border-navy px-5 text-[15px] font-extrabold text-navy hover:bg-navy hover:text-white"
        >
          Elections news
        </Link>
      </div>
    </div>
  )
}
