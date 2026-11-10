import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTitle } from '../lib/extras'
import { fullDate } from '../lib/format'
import { IEC_EVENT, isPartyId } from '../lib/iec'
import type { PartyDetail } from '../lib/iec'
import { count, useNationalResults, usePartyDirectory, usePartyResults } from '../lib/iecClient'

const PAGE = 15
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
function Detail({ party, totalCouncils }: { party: PartyDetail; totalCouncils: number | null }) {
  const [shown, setShown] = useState(PAGE)
  const councils = useMemo(() => [...party.councils].sort((a, b) => b.seats - a.seats || b.votes - a.votes), [party.councils])
  const withSeats = councils.filter((c) => c.seats > 0).length
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

      <section aria-labelledby="party-councils" className="mt-10">
        <h3 id="party-councils" className="text-xl font-extrabold tracking-tight">
          Council by council
        </h3>
        <p className="mt-1 text-[14.5px] text-muted">{plural(councils.length, 'council', 'councils')}, most seats first.</p>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {councils.slice(0, shown).map((c) => {
            const majority = c.seats * 2 > c.councilSeats
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
                </div>
                <Link
                  to={`/results/seats?council=${c.id}`}
                  aria-label={`Seat calculation for ${c.name}`}
                  className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-bold text-ink transition-colors hover:border-navy hover:text-navy"
                >
                  Seat calculation <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
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
              <Detail key={party.data.id} party={party.data} totalCouncils={totalCouncils} />
            </>
          )}
        </section>
      )}
    </div>
  )
}
