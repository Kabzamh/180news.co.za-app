import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { majorityOf } from '../lib/coalitions'
import { useTitle } from '../lib/extras'
import { fullDate } from '../lib/format'
import { IEC_EVENT, isPartyId } from '../lib/iec'
import type { CouncilSummary, LargestParty, PartyDetail } from '../lib/iec'
import { count, useLargestParties, useNationalResults, usePartyDirectory, usePartyResults } from '../lib/iecClient'

const PAGE = 15
const NO_COUNCILS: CouncilSummary[] = []
const field = 'h-12 w-full border border-ink/35 bg-paper px-3.5 text-base text-ink'
const plural = (n: number, one: string, many: string) => `${count(n)} ${n === 1 ? one : many}`

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

/** One party: national totals, a line per province, then every council it stood in. */
interface Position {
  /** The party has the most seats on the council (alone or jointly). */
  leads: boolean
  /** With one other party (the next largest if it leads, otherwise the largest) it would reach a majority. */
  majority: boolean
  line: string
}

/** Where a party stands on a hung council: how far the largest party is from a majority, and what this party's seats add. */
function coalitionPosition(partyId: number, seats: number, councilSeats: number, top: LargestParty[]): Position {
  const needed = majorityOf(councilSeats)
  const short = (n: number) => `${n} ${n === 1 ? 'seat' : 'seats'} short`
  const leads = seats >= top[0].seats
  if (!leads) {
    const sum = seats + top[0].seats
    const line = `Hung council. With the largest party, ${top[0].name} (${top[0].seats}), it would hold ${sum}: ${sum >= needed ? `a majority, ${needed} being needed` : `${short(needed - sum)} of the ${needed} needed`}.`
    return { leads, majority: sum >= needed, line }
  }
  const partner = top.find((p) => p.id !== partyId)
  const own = `Hung council. It is the ${partner && partner.seats === seats ? 'joint ' : ''}largest party, ${short(needed - seats)} of the ${needed} needed.`
  if (!partner) return { leads, majority: false, line: own }
  const sum = seats + partner.seats
  return { leads, majority: sum >= needed, line: `${own} With ${partner.name} (${partner.seats}) it would hold ${sum}${sum >= needed ? ', a majority' : `, still ${short(needed - sum)}`}.` }
}

/** The summary sentences, worded so that small numbers read naturally. */
function standingText(hung: number, leading: number, leadingWithOne: number, withLargest: number): string {
  const add = 'its seats added to the largest party’s would'
  const one = 'one more party, the next largest, would'
  if (hung === 1) {
    return leading === 1
      ? `It is the largest party there, alone or jointly, and ${one} ${leadingWithOne === 1 ? '' : 'not '}give it a majority.`
      : `It is not the largest party there, and ${add} ${withLargest === 1 ? '' : 'not '}make a majority.`
  }
  const others = hung - leading
  let first = 'It is not the largest party on any of them.'
  if (leading === 1) first = `It is the largest party, alone or jointly, on 1 of them, where ${one} ${leadingWithOne === 1 ? '' : 'not '}give it a majority.`
  else if (leading > 1) first = `It is the largest party, alone or jointly, on ${leading} of them, and on ${leadingWithOne === leading ? 'each' : leadingWithOne === 0 ? 'none' : leadingWithOne} of those ${one} give it a majority.`
  if (others === 0) return first
  if (others === 1) return `${first} On the other one, ${add} ${withLargest === 1 ? '' : 'not '}make a majority.`
  const group = leading > 0 ? `the other ${others}` : `the ${others}`
  return `${first} ${withLargest === others ? `On all of ${group}` : withLargest === 0 ? `On none of ${group}` : `On ${withLargest} of ${group}`}, ${add} make a majority.`
}

interface DetailProps {
  party: PartyDetail
  totalCouncils: number | null
  /** One line per council from the national results; empty until they have loaded. */
  summaries: CouncilSummary[]
  summariesState: 'loading' | 'ready' | 'error'
}

function Detail({ party, totalCouncils, summaries, summariesState }: DetailProps) {
  const [shown, setShown] = useState(PAGE)
  const [hungOnly, setHungOnly] = useState(false)
  const listHeading = useRef<HTMLHeadingElement>(null)
  const loaded = useLargestParties()
  const largest = loaded.state === 'ready' ? loaded.data : null
  const sorted = useMemo(() => [...party.councils].sort((a, b) => b.seats - a.seats || b.votes - a.votes), [party.councils])
  const withSeats = sorted.filter((c) => c.seats > 0).length

  // Hung councils, with every seat allocated, where this party holds at least one seat.
  const positions = useMemo(() => {
    const byId = new Map(summaries.map((s) => [s.id, s]))
    const out = new Map<number, Position>()
    for (const c of party.councils) {
      const summary = byId.get(c.id)
      const top = largest?.[c.id]
      if (!summary || summary.status !== 'hung' || summary.seatsAllocated < summary.seats || c.seats === 0 || !top || top.length === 0) continue
      out.set(c.id, coalitionPosition(party.id, c.seats, summary.seats, top))
    }
    return out
  }, [party, summaries, largest])
  const standing = [...positions.values()]
  const leading = standing.filter((p) => p.leads)
  const totalHung = summaries.filter((s) => s.status === 'hung').length
  const coalitionState = loaded.state === 'error' || summariesState === 'error' ? 'error' : loaded.state === 'loading' || summariesState === 'loading' ? 'loading' : 'ready'
  const councils = hungOnly ? sorted.filter((c) => positions.has(c.id)) : sorted

  const showHung = () => {
    setHungOnly(true)
    setShown(PAGE)
    // Take the reader, and keyboard focus, to the list that has just been narrowed.
    listHeading.current?.focus()
    listHeading.current?.scrollIntoView()
  }
  const th = 'px-3 py-3 font-extrabold'
  const td = 'px-3 py-3 tabular-nums'

  return (
    <>
      <dl className="mt-5 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-4">
        <Tile label="Votes" value={count(party.votes)} note={`${party.share.toFixed(2)}% of all valid votes, on the ward and PR ballots together`} />
        <Tile label="Council seats" value={count(party.seats)} note={`${count(party.wardSeats)} ward · ${count(party.seats - party.wardSeats)} PR list`} />
        <Tile
          label="Councils"
          value={count(party.councils.length)}
          note={`stood in${totalCouncils ? `, of ${count(totalCouncils)}` : ''} · won seats on ${count(withSeats)}`}
        />
        <Tile label="Councils led" value={count(party.councilsLed)} note={`has the most seats · ${count(party.majorities)} with an outright majority`} />
      </dl>

      <section aria-labelledby="party-provinces" className="mt-10">
        <h3 id="party-provinces" className="mb-3 text-xl font-extrabold tracking-tight">
          By province
        </h3>
        <div className="overflow-x-auto border border-line">
          <table className="w-full border-collapse text-left text-[15px]">
            <caption className="sr-only">{party.name} by province</caption>
            <thead>
              <tr className="bg-wash text-[12.5px] uppercase tracking-[0.05em] text-muted">
                <th scope="col" className={th}>
                  Province
                </th>
                <th scope="col" className={`${th} hidden text-right sm:table-cell`}>
                  Votes
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Share
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Seats
                </th>
                <th scope="col" className={`${th} hidden text-right md:table-cell`}>
                  Councils led
                </th>
                <th scope="col" className={`${th} hidden text-right md:table-cell`}>
                  Outright
                </th>
              </tr>
            </thead>
            <tbody>
              {party.provinces.map((p) => (
                <tr key={p.name} className="border-t border-line">
                  <th scope="row" className="px-3 py-3 font-bold leading-snug">
                    {p.name}
                    <span className="block text-[13px] font-normal tabular-nums text-muted sm:hidden">{count(p.votes)} votes</span>
                  </th>
                  <td className={`${td} hidden text-right sm:table-cell`}>{count(p.votes)}</td>
                  <td className={`${td} text-right`}>{p.share.toFixed(2)}%</td>
                  <td className={`${td} text-right font-extrabold`}>{count(p.seats)}</td>
                  <td className={`${td} hidden text-right md:table-cell`}>{count(p.councilsLed)}</td>
                  <td className={`${td} hidden text-right md:table-cell`}>{count(p.majorities)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">Share is of the valid votes cast in that province.</p>
      </section>

      <section aria-labelledby="party-coalitions" className="mt-10">
        <h3 id="party-coalitions" className="mb-2 text-xl font-extrabold tracking-tight">
          Possible coalitions
        </h3>
        {coalitionState === 'loading' && (
          <p role="status" className="text-[15.5px] font-bold text-body">
            Working out where {party.name} stands on hung councils…
          </p>
        )}
        {coalitionState === 'error' && (
          <p className="max-w-[78ch] text-[15.5px] leading-relaxed text-body">
            The figures for hung councils could not be loaded just now. Open a council below for its seats and possible coalitions.
          </p>
        )}
        {coalitionState === 'ready' && standing.length === 0 && (
          <p className="max-w-[78ch] text-[15.5px] leading-relaxed text-body">
            {party.name} holds no seats on a hung council{totalHung > 0 ? `, of the ${totalHung} there are` : ''}, so it is not part of any coalition arithmetic.
          </p>
        )}
        {coalitionState === 'ready' && standing.length > 0 && (
          <>
            <p className="max-w-[78ch] text-[16px] leading-relaxed text-body">
              <span className="font-bold text-ink">
                {party.name} holds seats on {standing.length} of the {totalHung} hung {totalHung === 1 ? 'council' : 'councils'}.
              </span>{' '}
              {standingText(standing.length, leading.length, leading.filter((p) => p.majority).length, standing.filter((p) => !p.leads && p.majority).length)}
            </p>
            <p className="mt-3 max-w-[78ch] border-l-4 border-navy bg-navy-tint px-4 py-3 text-[14.5px] leading-relaxed text-body">
              This is arithmetic on the IEC’s seats only. It shows where seats add up to a majority, not which parties are willing to govern together.
              {loaded.state === 'ready' && loaded.origin === 'saved' ? ` The IEC could not be reached just now, so it is worked out from a copy saved on ${fullDate(loaded.at)}.` : ''}
            </p>
            {!hungOnly && (
              <button
                type="button"
                onClick={showHung}
                className="mt-4 inline-flex h-11 cursor-pointer items-center gap-1.5 border-2 border-navy px-5 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white"
              >
                Show {standing.length === 1 ? 'this council' : `these ${standing.length} councils`} <ArrowRight size={15} strokeWidth={2.6} aria-hidden="true" />
              </button>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="party-councils" className="mt-10">
        <h3 id="party-councils" ref={listHeading} tabIndex={-1} className="text-xl font-extrabold tracking-tight outline-none">
          Council by council
        </h3>
        {hungOnly && (
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-l-4 border-navy bg-navy-tint px-4 py-2 text-[15px] leading-snug">
            <span>Showing only hung councils where {party.name} holds seats.</span>
            <button type="button" onClick={() => setHungOnly(false)} className="inline-flex min-h-11 cursor-pointer items-center font-bold text-navy underline underline-offset-[3px]">
              Show all councils
            </button>
          </p>
        )}
        <p className="mt-1 text-[14.5px] text-muted" aria-live="polite">
          {plural(councils.length, 'council', 'councils')}, most seats first.
        </p>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {councils.slice(0, shown).map((c) => {
            const majority = c.seats * 2 > c.councilSeats
            const position = positions.get(c.id)
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
                <div className="min-w-0 flex-1 basis-64">
                  <h4 className="text-[18px] font-extrabold leading-tight">
                    {c.name}
                    {(majority || c.leads) && (
                      <span className={`ml-2 inline-block rounded-full px-2.5 py-0.5 align-middle text-[12px] font-bold ${majority ? 'bg-[#dff5e8] text-[#0b5a2e]' : 'bg-[#fdf1d4] text-[#6b4a00]'}`}>
                        {majority ? 'Outright majority' : 'Largest party'}
                      </span>
                    )}
                  </h4>
                  <p className="mt-0.5 text-[13.5px] text-muted">
                    {c.code && `${c.code} · `}
                    {c.province}
                  </p>
                  <p className="mt-1 text-[15px] leading-snug text-body">
                    <span className="font-bold text-ink">
                      {c.seats} of {c.councilSeats} seats
                    </span>{' '}
                    ({c.wardSeats} ward, {c.seats - c.wardSeats} PR list) · {count(c.votes)} votes, {c.share.toFixed(2)}%
                  </p>
                  {position && <p className="mt-1 text-[15px] leading-snug text-body">{position.line}</p>}
                </div>
                <Link
                  to={`/results/seats?council=${c.id}`}
                  aria-label={`${position ? 'Seats and possible coalitions' : 'Seat calculation'} for ${c.name}`}
                  className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-bold text-ink transition-colors hover:border-navy hover:text-navy"
                >
                  {position ? 'Seats and coalitions' : 'Seat calculation'} <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
        {councils.length > shown && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="inline-flex h-12 cursor-pointer items-center border-2 border-navy px-7 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white"
            >
              Show more councils ({councils.length - shown} left)
            </button>
          </div>
        )}
      </section>
    </>
  )
}

export default function PartyResults() {
  const [params, setParams] = useSearchParams()
  const param = Number(params.get('party'))
  const partyId = isPartyId(param) ? param : null
  const { results } = useNationalResults()
  const directory = usePartyDirectory()
  const party = usePartyResults(partyId)
  useTitle(party?.state === 'ready' ? `${party.data.name} results` : 'Results by party')

  const largest = results.state === 'ready' ? results.data.parties.filter((p) => p.id > 0) : []
  const totalCouncils = results.state === 'ready' ? results.data.totals.councils : null
  const known = partyId !== null && (largest.some((p) => p.id === partyId) || !!directory?.some((p) => p.id === partyId))

  return (
    <div className="wrap max-w-[1040px] pt-5 md:pt-8">
      <nav aria-label="Breadcrumb">
        <Link to="/results" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-navy hover:underline">
          <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" /> IEC results
        </Link>
      </nav>
      <header className="relative mt-1 border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <p className="text-sm font-black uppercase tracking-[0.08em] text-brand">{IEC_EVENT.name}</p>
        <h1 className="mt-1 text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">Results by party</h1>
        <p className="mt-3 max-w-[70ch] text-[16px] leading-relaxed text-body">
          Any party that stood: its votes and seats nationally, in each province and on every council, as published by the IEC. District councils
          are not included.
        </p>
      </header>

      <div className="mt-6 max-w-xl">
        <label htmlFor="party-select" className="block text-[15px] font-extrabold">
          Party
        </label>
        <select
          id="party-select"
          value={partyId ?? ''}
          onChange={(e) => setParams(e.target.value ? { party: e.target.value } : {}, { replace: true })}
          className={`${field} mt-1.5 cursor-pointer`}
        >
          <option value="">Choose a party</option>
          {/* A party opened by link before the lists have loaded still needs an option to show. */}
          {partyId !== null && !known && <option value={partyId}>{party?.state === 'ready' ? party.data.name : party?.state === 'error' ? 'Unknown party' : 'Loading…'}</option>}
          {largest.length > 0 && (
            <optgroup label="Largest parties">
              {largest.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          )}
          {directory && directory.length > 0 && (
            <optgroup label={`All ${directory.length} parties, A to Z`}>
              {directory.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {directory && directory.length === 0 && <p className="mt-1.5 text-[13.5px] text-muted">The full list of parties could not be loaded, so only the largest are offered for now.</p>}
      </div>

      {partyId === null && (
        <section aria-labelledby="party-largest" className="mt-8">
          <h2 id="party-largest" className="text-xl font-extrabold tracking-tight">
            Largest parties
          </h2>
          {largest.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {largest.map((p) => (
                <li key={p.id}>
                  <Link to={`/results/party?party=${p.id}`} replace className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm font-bold hover:border-navy hover:text-navy">
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[15px] text-muted" role="status">
              {results.state === 'loading' ? 'Fetching results from the IEC…' : 'Choose a party from the list above.'}
            </p>
          )}
        </section>
      )}

      {partyId !== null && (
        <section aria-labelledby="party-name" className="mt-8">
          {party?.state === 'loading' && (
            <p role="status" className="text-[16px] font-bold text-body">
              Fetching this party’s results from the IEC…
            </p>
          )}
          {party?.state === 'error' && (
            <div className="max-w-xl">
              <h2 id="party-name" className="text-2xl font-extrabold tracking-tight">
                No results could be loaded for this party
              </h2>
              <p className="mt-2 text-[16px] leading-relaxed text-body">
                It may not have stood in these elections, or the IEC’s results system did not answer. Choose another party, or try again shortly.
              </p>
            </div>
          )}
          {party?.state === 'ready' && (
            <>
              <h2 id="party-name" className="text-[28px] font-extrabold leading-tight tracking-tight">
                {party.data.name}
              </h2>
              {party.origin === 'live' ? (
                <p className="mt-1 text-[14.5px] text-muted">IEC figures as at {fullDate(party.data.reportedAt ?? party.at)}</p>
              ) : (
                <p className="mt-3 max-w-[78ch] border-l-4 border-warn bg-[#fdf1d4] px-4 py-3 text-[15px] font-bold leading-relaxed text-[#5c4000]">
                  The IEC’s results system could not be reached just now. These figures are worked out from a copy of the IEC’s council results saved
                  on {fullDate(party.at)}.
                </p>
              )}
              <Detail
                key={party.data.id}
                party={party.data}
                totalCouncils={totalCouncils}
                summaries={results.state === 'ready' ? results.data.councils : NO_COUNCILS}
                summariesState={results.state}
              />
            </>
          )}
        </section>
      )}
    </div>
  )
}
