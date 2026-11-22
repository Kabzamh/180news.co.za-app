import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useControl } from '../lib/control'
import { useTitle } from '../lib/weather'
import { loadCouncil, useIecNational, majorityOf, type CouncilResults, type NationalResults } from '../lib/iec'
import { formatNum } from '../lib/format'
import { SectionHeading } from '../components/SectionHeading'
import { ResultsBrief } from '../components/ResultsBrief'

const COUNCILS_PER_PAGE = 20

export default function Results() {
  useTitle('IEC results')
  const { settings } = useControl()
  const { results, refreshing, refresh } = useIecNational(settings.refreshMinutes)
  const [shown, setShown] = useState(COUNCILS_PER_PAGE)
  const [openCouncil, setOpenCouncil] = useState<number | null>(null)

  const data = results.state === 'ready' ? results.data : undefined
  const councils = useMemo(() => Object.values((data?.councils ?? {}) as Record<string, CouncilResults>), [data])
  const sorted = useMemo(
    () =>
      councils
        .map((council) => {
          const ranked = council.parties.filter((p) => p.id > 0).sort((a, b) => b.seats - a.seats)
          const leader = ranked[0]
          const totalSeats = council.seats
          const majority = leader && leader.seats >= majorityOf(totalSeats)
          const valid = council.parties.reduce((sum, p) => sum + p.votes, 0)
          return { council, leader, majority, totalSeats, valid }
        })
        .sort((a, b) => (b.leader?.seats ?? 0) - (a.leader?.seats ?? 0) || a.council.name.localeCompare(b.council.name)),
    [councils],
  )

  return (
    <div className="wrap max-w-[1080px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">IEC results</h1>
        <p className="mt-2 max-w-[70ch] text-[15px] text-muted">
          The 2026 local government elections, council by council — votes, seats and who leads. Figures come from the Electoral Commission’s results system.
        </p>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex h-11 cursor-pointer items-center gap-2 border-2 border-navy px-4 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-progress disabled:opacity-60"
        >
          <RefreshCw size={15} strokeWidth={2.5} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden="true" />
          {refreshing ? 'Checking the IEC…' : 'Check the IEC now'}
        </button>
        <p role="status" className="text-[14px] font-bold text-body">
          {results.state === 'loading' && 'Fetching results from the IEC…'}
          {results.state === 'error' && 'The results could not be loaded just now. The saved copies below are the last figures we hold.'}
          {results.state === 'ready' && results.origin === 'live' && 'Live from the IEC.'}
          {results.state === 'ready' && results.origin === 'saved' && 'Saved copy — the IEC could not be reached just now.'}
        </p>
      </div>

      {data && <ResultsBrief className="mt-6" />}

      {data && <CouncilTotals data={data} />}

      <section aria-labelledby="results-councils" className="mt-10">
        <SectionHeading id="results-councils" title="Councils" />
        {!data ? (
          <p className="py-10 text-[16px] text-body">Waiting for results…</p>
        ) : (
          <>
            <div className="overflow-x-auto border border-line">
              <table className="w-full min-w-[720px] border-collapse text-left text-[15px]">
                <thead>
                  <tr className="bg-wash text-[12.5px] uppercase tracking-[0.05em] text-muted">
                    <th scope="col" className="px-4 py-3 font-extrabold">Council</th>
                    <th scope="col" className="px-4 py-3 font-extrabold">Province</th>
                    <th scope="col" className="px-4 py-3 font-extrabold">Leader</th>
                    <th scope="col" className="px-4 py-3 text-right font-extrabold">Seats</th>
                    <th scope="col" className="px-4 py-3 font-extrabold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.slice(0, shown).map(({ council, leader, majority, totalSeats, valid }) => (
                    <tr key={council.id} className="border-t border-line align-top">
                      <th scope="row" className="px-4 py-3 font-bold">
                        <button type="button" onClick={() => setOpenCouncil(openCouncil === council.id ? null : council.id)} className="text-left text-navy underline-offset-2 hover:underline">
                          {council.name}
                        </button>
                      </th>
                      <td className="px-4 py-3 text-body">{council.province}</td>
                      <td className="px-4 py-3 text-body">{leader ? leader.name : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-body">
                        {leader ? `${leader.seats}/${totalSeats}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[12.5px] font-bold ${majority ? 'bg-[#dff5e8] text-[#0b5a2e]' : 'bg-[#fdf1d4] text-[#6b4a00]'}`}>
                          {majority ? 'Won outright' : 'Hung council'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {openCouncil !== null && (() => {
                    const council = sorted.find((row) => row.council.id === openCouncil)
                    if (!council) return null
                    const ranked = council.council.parties.filter((p) => p.id > 0).sort((a, b) => b.seats - a.seats)
                    return (
                      <tr className="border-t border-line bg-wash">
                        <td colSpan={5} className="px-4 py-4">
                          <p className="text-[12.5px] font-black uppercase tracking-[0.05em] text-muted">Seat breakdown — {council.council.name}</p>
                          <ul className="mt-2 grid gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                            {ranked.map((party) => (
                              <li key={party.id} className="flex items-baseline justify-between gap-3 text-[14.5px]">
                                <span className="font-bold text-ink">{party.name}</span>
                                <span className="tabular-nums text-body">
                                  {formatNum(party.seats)} seats · {council.valid > 0 ? ((party.votes / council.valid) * 100).toFixed(1) : '0.0'}%
                                </span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )
                  })()}
                </tbody>
              </table>
            </div>
            {shown < sorted.length && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setShown((n) => n + COUNCILS_PER_PAGE)}
                  className="inline-flex h-12 cursor-pointer items-center border-2 border-navy px-7 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white"
                >
                  Show more councils ({sorted.length - shown} left)
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function CouncilTotals({ data }: { data: NationalResults }) {
  const totals = data.totals
  const rows: [string, string][] = [
    ['Councils on the ballot', formatNum(totals.councils)],
    ['Won outright', formatNum(totals.majority)],
    ['Hung councils', formatNum(totals.hung)],
    ['Seats allocated', `${formatNum(totals.seatsAllocated)} of ${formatNum(totals.seats)}`],
    ['Valid votes', formatNum(totals.validVotes)],
    ['Registered voters', formatNum(totals.registered)],
  ]
  return (
    <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="border border-line bg-paper p-4">
          <dt className="text-[12.5px] font-black uppercase tracking-[0.05em] text-muted">{label}</dt>
          <dd className="mt-1 text-2xl font-black tabular-nums text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
