import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Coalitions } from '../components/Coalitions'
import { majorityOf } from '../lib/coalitions'
import { useTitle } from '../lib/extras'
import { fullDate } from '../lib/format'
import { IEC_EVENT, isCouncilId } from '../lib/iec'
import type { CouncilResults } from '../lib/iec'
import { count, useCouncilResults, useNationalResults } from '../lib/iecClient'
import { calculateSeats, seatPartiesFor } from '../lib/seats'
import type { SeatParty } from '../lib/seats'

const field = 'h-12 w-full border border-ink/35 bg-paper px-3.5 text-base text-ink placeholder:text-muted'
const outline =
  'inline-flex h-11 cursor-pointer items-center gap-2 border-2 border-navy px-4 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white'
const digits = (value: string) => value.replace(/\D/g, '').slice(0, 9)
const whole = (value: string) => Number(digits(value) || '0')

/** The working, step by step, and the seats each party ends up with. */
interface WorkingProps {
  seats: number
  parties: SeatParty[]
  /** Seats the IEC shows for each party, for a council. */
  declared?: Map<string, number>
  /** True once the IEC has allocated every seat on the council. */
  declaredComplete?: boolean
  /** Key of the row that stands for independent councillors taken together. */
  independentsKey?: string
}

function Working({ seats, parties, declared, declaredComplete = false, independentsKey }: WorkingProps) {
  const calc = useMemo(() => calculateSeats(seats, parties), [seats, parties])
  const [showAll, setShowAll] = useState(false)
  const { search } = useLocation()
  // Coalitions are counted on the IEC's declared seats where it has allocated them all, otherwise on the calculation.
  const onDeclared = !!declared && declaredComplete
  const holdings = useMemo(
    () => (calc.ok ? calc.result.rows.map((row) => ({ key: row.key, name: row.name, seats: onDeclared ? (declared?.get(row.key) ?? 0) : row.total })) : []),
    [calc, declared, onDeclared],
  )
  const hung = holdings.length > 0 && Math.max(...holdings.map((h) => h.seats)) < majorityOf(seats)

  if (!calc.ok) {
    return (
      <p role="status" className="mt-6 border-l-4 border-navy bg-navy-tint px-4 py-3 text-[15px] font-bold text-ink">
        {calc.error}
      </p>
    )
  }

  const r = calc.result
  const first = r.rounds[0]
  const withSeats = r.rows.filter((row) => row.total > 0 || (declared?.get(row.key) ?? 0) > 0)
  const rows = showAll ? r.rows : withSeats
  const hidden = r.rows.length - withSeats.length
  const largest = r.rows[0]
  const differences = declared ? r.rows.filter((row) => (declared.get(row.key) ?? 0) !== row.total) : []
  const th = 'px-2 py-3 font-extrabold sm:px-3'
  const td = 'px-2 py-2.5 tabular-nums sm:px-3'
  // The per-party working needs room; on a phone the table keeps to votes and seats.
  const wide = 'hidden sm:table-cell'

  return (
    <div className="mt-6">
      {hung && (
        <p className="mb-5">
          <Link to={`${search}#coalitions`} className="inline-flex min-h-11 items-center text-[15px] font-bold text-navy underline underline-offset-[3px]">
            No party has a majority here. Jump to possible coalitions
          </Link>
        </p>
      )}
      <h3 className="text-xl font-extrabold tracking-tight">The working</h3>
      <ol className="mt-3 max-w-[78ch] list-decimal space-y-2 pl-5 text-[15.5px] leading-relaxed text-body">
        <li>
          <span className="font-bold text-ink">Votes that count: {count(first.votes)}.</span> Every valid vote for a party, on the ward and PR ballots
          together.{r.outsideVotes > 0 ? ` The ${count(r.outsideVotes)} votes for independents and for parties with no PR list are left out.` : ''}
        </li>
        <li>
          <span className="font-bold text-ink">Seats to share: {count(first.seats)}.</span> The council’s {count(r.councilSeats)} seats
          {r.outsideSeats > 0 ? `, less the ${r.outsideSeats} ward ${r.outsideSeats === 1 ? 'seat' : 'seats'} won by independents and parties with no PR list` : ''}.
        </li>
        <li>
          <span className="font-bold text-ink">
            {r.rounds.length > 1 ? 'First quota' : 'Quota'}: {count(first.quota)} votes a seat.
          </span> {count(first.votes)} ÷ {count(first.seats)}, drop the fraction, add 1.
        </li>
        {r.rounds.slice(0, -1).map((round, i) => {
          const next = r.rounds[i + 1]
          return (
            <li key={i}>
              <span className="font-bold text-ink">
                {round.overhang.map((o) => `${o.name} won ${o.wardSeats} ward seats against the ${o.earned} its votes earned`).join('; ')}.
              </span>{' '}
              {round.overhang.length > 1 ? 'Parties in that position keep their ward seats and take' : 'A party in that position keeps its ward seats and takes'} no PR
              list seats, and the quota is worked out again for the others: {count(next.votes)} ÷ {count(next.seats)}, drop the fraction, add 1 ={' '}
              <span className="font-bold text-ink">{count(next.quota)}</span>.
            </li>
          )
        })}
        <li>
          Each party gets a seat for every full quota in its votes.{' '}
          {r.leftover > 0 ? `The ${r.leftover} ${r.leftover === 1 ? 'seat' : 'seats'} left over go to the parties with the largest remainders.` : 'No seats are left over.'}
        </li>
        <li>A party’s PR list seats are its total seats less the ward seats it has already won.</li>
      </ol>

      <div className="mt-5 overflow-x-auto border border-line">
        <table className="w-full border-collapse text-left text-[14.5px] sm:min-w-[680px] sm:text-[15px]">
          <caption className="sr-only">Seats by party</caption>
          <thead>
            <tr className="bg-wash text-[12.5px] uppercase tracking-[0.05em] text-muted">
              <th scope="col" className={th}>
                Party
              </th>
              <th scope="col" className={`${th} ${wide} text-right`}>
                Votes
              </th>
              <th scope="col" className={`${th} ${wide} text-right`}>
                Votes ÷ quota
              </th>
              <th scope="col" className={`${th} ${wide} text-right`}>
                Full seats
              </th>
              <th scope="col" className={`${th} ${wide} text-right`}>
                Extra
              </th>
              <th scope="col" className={`${th} text-right`}>
                Ward
              </th>
              <th scope="col" className={`${th} text-right`}>
                PR list
              </th>
              <th scope="col" className={`${th} text-right`}>
                Total
              </th>
              {declared && (
                <th scope="col" className={`${th} text-right`}>
                  IEC
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const iec = declared?.get(row.key) ?? 0
              return (
                <tr key={row.key} className="border-t border-line">
                  <th scope="row" className="px-2 py-2.5 font-bold leading-snug sm:px-3">
                    {row.name}
                    <span className="block text-[12.5px] font-normal tabular-nums text-muted sm:hidden">{count(row.votes)} votes</span>
                    {!row.counted && <span className="block text-[12.5px] font-normal text-muted">not on the PR ballot</span>}
                    {row.overhang && <span className="block text-[12.5px] font-normal text-muted">keeps its ward seats</span>}
                  </th>
                  <td className={`${td} ${wide} text-right`}>{count(row.votes)}</td>
                  <td className={`${td} ${wide} text-right`}>{row.quotas === null ? '–' : row.quotas.toFixed(3)}</td>
                  <td className={`${td} ${wide} text-right`}>{row.quotas === null ? '–' : row.whole}</td>
                  <td className={`${td} ${wide} text-right`}>{row.quotas === null ? '–' : row.extra > 0 ? `+${row.extra}` : '0'}</td>
                  <td className={`${td} text-right`}>{row.wardSeats}</td>
                  <td className={`${td} text-right`}>{row.listSeats}</td>
                  <td className={`${td} text-right text-[16px] font-extrabold`}>{row.total}</td>
                  {declared && <td className={`${td} text-right ${iec !== row.total ? 'font-extrabold text-brand' : ''}`}>{iec}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[13.5px] leading-relaxed text-muted sm:hidden">
        Turn your phone sideways, or use a wider screen, to see each party’s votes ÷ quota, full seats and extra seats.
      </p>

      {hidden > 0 && (
        <button type="button" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)} className="mt-2 inline-flex min-h-11 cursor-pointer items-center text-sm font-bold text-navy underline underline-offset-[3px]">
          {showAll ? 'Show only parties with seats' : `Show the ${hidden} ${hidden === 1 ? 'party' : 'parties'} with no seats`}
        </button>
      )}

      <div role="status" className="mt-4 max-w-[78ch] space-y-2 text-[15.5px] leading-relaxed text-body">
        <p>
          A majority needs <span className="font-bold text-ink">{r.majority}</span> of the {r.councilSeats} seats.{' '}
          {largest.total >= r.majority
            ? `${largest.name} has ${largest.total}: an outright majority.`
            : `The largest party, ${largest.name}, has ${largest.total}, so no party has a majority and the council is hung.`}
        </p>
        {declared &&
          (differences.length === 0 ? (
            <p className="flex items-start gap-2 font-bold text-[#0b5a2e]">
              <Check size={19} strokeWidth={2.8} className="mt-0.5 shrink-0" aria-hidden="true" />
              This matches the seats the IEC has declared for every party.
            </p>
          ) : (
            <p className="border-l-4 border-brand bg-brand-tint px-4 py-3 font-bold text-ink">
              This differs from the seats the IEC shows for {differences.map((d) => `${d.name} (IEC ${declared.get(d.key) ?? 0}, calculated ${d.total})`).join('; ')}.
            </p>
          ))}
      </div>

      <Coalitions
        councilSeats={r.councilSeats}
        parties={holdings.filter((h) => h.key !== independentsKey)}
        independents={holdings.find((h) => h.key === independentsKey)}
        basis={onDeclared ? 'the seats the IEC has declared' : declared ? 'the seats calculated above, because the IEC has not allocated all of this council’s seats yet' : 'the seats calculated above'}
      />
    </div>
  )
}

interface Row {
  key: string
  name: string
  votes: string
  wardSeats: string
  listed: boolean
}
interface OwnFigures {
  seats: string
  rows: Row[]
}

let nextKey = 0
const blankRow = (): Row => ({ key: `own-${++nextKey}`, name: '', votes: '', wardSeats: '', listed: true })
const blankFigures = (): OwnFigures => ({ seats: '', rows: [blankRow(), blankRow(), blankRow()] })
const figuresFrom = (council: CouncilResults): OwnFigures => ({
  seats: String(council.seats),
  rows: seatPartiesFor(council).map((p) => ({ key: `own-${++nextKey}`, name: p.name, votes: String(p.votes), wardSeats: String(p.wardSeats), listed: p.counted })),
})

function OwnForm({ figures, onChange }: { figures: OwnFigures; onChange: (next: OwnFigures) => void }) {
  const setRow = (key: string, patch: Partial<Row>) => onChange({ ...figures, rows: figures.rows.map((row) => (row.key === key ? { ...row, ...patch } : row)) })
  const small = 'block text-[13px] font-extrabold'

  return (
    <div className="mt-5">
      <div className="max-w-[14rem]">
        <label htmlFor="calc-seats" className="block text-[15px] font-extrabold">
          Seats on the council
        </label>
        <input
          id="calc-seats"
          inputMode="numeric"
          value={figures.seats}
          onChange={(e) => onChange({ ...figures, seats: digits(e.target.value).slice(0, 4) })}
          autoComplete="off"
          className={`${field} mt-1.5`}
        />
      </div>

      <ul className="mt-5 space-y-3">
        {figures.rows.map((row, i) => {
          const who = row.name.trim() || `party ${i + 1}`
          return (
            <li key={row.key} className="grid grid-cols-2 items-end gap-x-3 gap-y-2.5 border border-line bg-wash p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor={`${row.key}-name`} className={small}>
                  Party
                </label>
                <input id={`${row.key}-name`} value={row.name} onChange={(e) => setRow(row.key, { name: e.target.value.slice(0, 60) })} autoComplete="off" className={`${field} mt-1`} />
              </div>
              <div>
                <label htmlFor={`${row.key}-votes`} className={small}>
                  Votes<span className="sr-only"> for {who}</span>
                </label>
                <input id={`${row.key}-votes`} inputMode="numeric" value={row.votes} onChange={(e) => setRow(row.key, { votes: digits(e.target.value) })} autoComplete="off" className={`${field} mt-1`} />
              </div>
              <div>
                <label htmlFor={`${row.key}-wards`} className={small}>
                  Ward seats<span className="sr-only"> won by {who}</span>
                </label>
                <input
                  id={`${row.key}-wards`}
                  inputMode="numeric"
                  value={row.wardSeats}
                  onChange={(e) => setRow(row.key, { wardSeats: digits(e.target.value).slice(0, 4) })}
                  autoComplete="off"
                  className={`${field} mt-1`}
                />
              </div>
              <label className="flex min-h-12 cursor-pointer items-center gap-2.5 text-[14px] font-bold">
                <input type="checkbox" checked={row.listed} onChange={(e) => setRow(row.key, { listed: e.target.checked })} className="size-5 shrink-0 cursor-pointer accent-navy" />
                <span>
                  On the PR ballot<span className="sr-only">: {who}</span>
                </span>
              </label>
              <button
                type="button"
                onClick={() => onChange({ ...figures, rows: figures.rows.filter((r) => r.key !== row.key) })}
                aria-label={`Remove ${who}`}
                className="grid size-12 cursor-pointer place-items-center justify-self-end rounded-full text-muted hover:bg-brand-tint hover:text-brand"
              >
                <Trash2 size={19} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2.5">
        <button type="button" onClick={() => onChange({ ...figures, rows: [...figures.rows, blankRow()] })} className={outline}>
          <Plus size={16} strokeWidth={2.6} aria-hidden="true" /> Add a party
        </button>
        <button type="button" onClick={() => onChange(blankFigures())} className={outline}>
          Clear everything
        </button>
      </div>
      <p className="mt-3 max-w-[78ch] text-[13.5px] leading-relaxed text-muted">
        Votes are a party’s ward and PR votes added together. Untick “On the PR ballot” for an independent, or a party that only stood ward
        candidates: its votes are then left out and its ward seats come off the seats to share.
      </p>
    </div>
  )
}

export default function SeatCalculator() {
  useTitle('LGE seat calculator')
  const [params, setParams] = useSearchParams()
  const { results } = useNationalResults()
  const [figures, setFigures] = useState<OwnFigures>(blankFigures)

  const param = Number(params.get('council'))
  // A council in the address shows the IEC's figures; without one the page works on the reader's own.
  const councilId = isCouncilId(param) ? param : null
  const council = useCouncilResults(councilId)
  const councils = results.state === 'ready' ? results.data.councils : []
  const provinces = [...new Set(councils.map((c) => c.province))].sort()
  const listed = councils.find((c) => c.id === councilId)

  const choose = (value: string) => {
    setParams(value ? { council: value } : {}, { replace: true })
  }

  const ownParties = useMemo<SeatParty[]>(
    () =>
      figures.rows
        .map((row, i) => ({ key: row.key, name: row.name.trim() || `Party ${i + 1}`, votes: whole(row.votes), wardSeats: whole(row.wardSeats), counted: row.listed, used: !!(row.name.trim() || row.votes || row.wardSeats) }))
        .filter((row) => row.used),
    [figures.rows],
  )
  const iecParties = useMemo(() => (council?.state === 'ready' ? seatPartiesFor(council.data) : []), [council])
  const declared = useMemo(() => (council?.state === 'ready' ? new Map(council.data.parties.map((p) => [String(p.id), p.seats])) : undefined), [council])

  return (
    <div className="wrap max-w-[1040px] pt-5 md:pt-8">
      <nav aria-label="Breadcrumb">
        <Link to="/results" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-navy hover:underline">
          <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" /> IEC results
        </Link>
      </nav>
      <header className="relative mt-1 border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <p className="text-sm font-black uppercase tracking-[0.08em] text-brand">{IEC_EVENT.name}</p>
        <h1 className="mt-1 text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">LGE seat calculator</h1>
        <p className="mt-3 max-w-[70ch] text-[16px] leading-relaxed text-body">
          How a party’s votes turn into seats on a metro or local council, and where no party has a majority, which combinations of parties add up
          to one. Pick a council to see the calculation on the IEC’s figures, or enter figures of your own. District councils are worked out
          differently and are not covered.
        </p>
      </header>

      <div className="mt-6 max-w-xl">
        <label htmlFor="calc-council" className="block text-[15px] font-extrabold">
          Council
        </label>
        <select id="calc-council" value={councilId ?? ''} onChange={(e) => choose(e.target.value)} className={`${field} mt-1.5 cursor-pointer`}>
          <option value="">My own figures</option>
          {provinces.map((province) => (
            <optgroup key={province} label={province}>
              {councils
                .filter((c) => c.province === province)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.code ? ` (${c.code})` : ''}
                  </option>
                ))}
            </optgroup>
          ))}
          {/* A council opened by link before the list has loaded still needs an option to show. */}
          {councilId !== null && !listed && <option value={councilId}>{council?.state === 'ready' ? council.data.name : 'Loading…'}</option>}
        </select>
        {results.state === 'error' && <p className="mt-1.5 text-[13.5px] text-muted">The list of councils could not be loaded, so only your own figures can be used for now.</p>}
      </div>

      {councilId === null ? (
        <section aria-labelledby="calc-own" className="mt-8">
          <h2 id="calc-own" className="text-2xl font-extrabold tracking-tight">
            Your own figures
          </h2>
          <OwnForm figures={figures} onChange={setFigures} />
          <Working seats={whole(figures.seats)} parties={ownParties} />
        </section>
      ) : (
        <section aria-labelledby="calc-council-heading" className="mt-8">
          {council?.state === 'loading' && (
            <p role="status" className="text-[16px] font-bold text-body">
              Fetching this council’s figures from the IEC…
            </p>
          )}
          {council?.state === 'error' && (
            <div className="max-w-xl">
              <h2 id="calc-council-heading" className="text-2xl font-extrabold tracking-tight">
                This council’s figures could not be loaded
              </h2>
              <p className="mt-2 text-[16px] leading-relaxed text-body">The IEC’s results system did not answer and there is no saved copy for it. Try again shortly, or enter your own figures.</p>
            </div>
          )}
          {council?.state === 'ready' && (
            <>
              <h2 id="calc-council-heading" className="text-2xl font-extrabold tracking-tight">
                {council.data.name}
              </h2>
              <p className="mt-1 text-[14.5px] leading-relaxed text-muted">
                {council.data.province && `${council.data.province} · `}
                {council.data.seats} seats · {council.data.wards} wards · {council.data.parties.length} parties and independents ·{' '}
                {council.origin === 'live' ? 'IEC figures' : 'saved copy of IEC figures'}
                {` as at ${fullDate(council.data.reportedAt ?? council.at)}`}
              </p>
              {(council.data.districtsPct < 100 || council.data.seatsAllocated < council.data.seats) && (
                <p className="mt-3 max-w-[78ch] border-l-4 border-warn bg-[#fdf1d4] px-4 py-3 text-[15px] font-bold leading-relaxed text-[#5c4000]">
                  {council.data.districtsPct < 100 ? `Counting is not finished here: ${council.data.districtsPct}% of voting districts are in, so the votes can still change. ` : ''}
                  {council.data.seatsAllocated < council.data.seats ? `The IEC has allocated ${council.data.seatsAllocated} of the ${council.data.seats} seats so far. ` : ''}
                  Until the IEC finishes, its seats and this calculation may not agree.
                </p>
              )}
              <Working
                key={council.data.id}
                seats={council.data.seats}
                parties={iecParties}
                declared={declared}
                declaredComplete={council.data.seatsAllocated === council.data.seats}
                independentsKey="0"
              />
              <button
                type="button"
                onClick={() => {
                  setFigures(figuresFrom(council.data))
                  setParams({}, { replace: true })
                }}
                className={`${outline} mt-5`}
              >
                Change these figures
              </button>
            </>
          )}
        </section>
      )}
    </div>
  )
}
