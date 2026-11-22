import { useMemo, useState } from 'react'
import { useControl } from '../lib/control'
import { useTitle } from '../lib/weather'
import { majorityOf, possibleCoalitions, useIecNational, type CouncilResults } from '../lib/iec'
import { formatNum } from '../lib/format'

export default function SeatCalculator() {
  useTitle('Seat calculator')
  const { settings } = useControl()
  const { results } = useIecNational(settings.refreshMinutes)
  const data = results.state === 'ready' ? results.data : undefined
  const councils = useMemo(() => Object.values((data?.councils ?? {}) as Record<string, CouncilResults>), [data])
  const sorted = useMemo(
    () => councils.map((c) => ({ id: c.id, name: c.name, province: c.province, seats: c.seats })).sort((a, b) => a.name.localeCompare(b.name)),
    [councils],
  )
  const [councilId, setCouncilId] = useState<number | null>(null)
  const [manual, setManual] = useState<Record<number, number>>({})

  const activeId = councilId ?? sorted[0]?.id ?? null
  const council = councils.find((c) => c.id === activeId)
  const parties = useMemo(
    () =>
      (council?.parties ?? [])
        .filter((p) => p.id > 0 && p.seats > 0)
        .map((p) => ({ id: p.id, name: p.name, seats: manual[p.id] ?? p.seats }))
        .sort((a, b) => b.seats - a.seats || a.name.localeCompare(b.name)),
    [council, manual],
  )
  const seats = council?.seats ?? 0
  const majority = majorityOf(seats)
  const { coalitions, truncated } = useMemo(() => possibleCoalitions(parties, majority, 4, 8000), [parties, majority])
  const allocated = parties.reduce((sum, p) => sum + p.seats, 0)
  const [shown, setShown] = useState(12)

  return (
    <div className="wrap max-w-[980px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">Seat calculator</h1>
        <p className="mt-2 max-w-[70ch] text-[15px] text-muted">
          Pick a council, adjust the seats, and see which combinations of parties could reach a majority. It is arithmetic, not a prediction.
        </p>
      </header>

      {!data ? (
        <p className="mt-8 text-[15px] text-muted">Loading council results…</p>
      ) : (
        <>
          <div className="mt-6">
            <label htmlFor="council-select" className="block text-[15px] font-extrabold">
              Council
            </label>
            <select
              id="council-select"
              value={activeId ?? ''}
              onChange={(e) => {
                setCouncilId(Number(e.target.value))
                setManual({})
                setShown(12)
              }}
              className="mt-1 h-12 w-full max-w-md border border-ink/35 bg-paper px-3.5 text-base text-ink"
            >
              {sorted.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.province})
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="border border-line bg-paper p-4">
              <p className="text-[12.5px] font-black uppercase tracking-[0.05em] text-muted">Council seats</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-ink">{formatNum(seats)}</p>
            </div>
            <div className="border border-line bg-paper p-4">
              <p className="text-[12.5px] font-black uppercase tracking-[0.05em] text-muted">Seats for a majority</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-ink">{formatNum(majority)}</p>
            </div>
            <div className="border border-line bg-paper p-4">
              <p className="text-[12.5px] font-black uppercase tracking-[0.05em] text-muted">Seats in this tally</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-ink">{formatNum(allocated)}</p>
            </div>
          </div>

          {council && (
            <section aria-labelledby="adjust" className="mt-8">
              <h2 id="adjust" className="text-2xl font-extrabold tracking-tight">
                Adjust the seats
              </h2>
              <p className="mt-1 text-[14.5px] text-muted">By-elections and floor-crossings change a tally. Type any number between 0 and the council size.</p>
              <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {parties.map((party) => (
                  <li key={party.id} className="flex items-center justify-between gap-3">
                    <label htmlFor={`seats-${party.id}`} className="min-w-0 flex-1 truncate text-[15px] font-bold">
                      {party.name}
                    </label>
                    <input
                      id={`seats-${party.id}`}
                      type="number"
                      min={0}
                      max={seats}
                      value={party.seats}
                      onChange={(e) => setManual((m) => ({ ...m, [party.id]: Math.max(0, Math.min(seats, Number(e.target.value) || 0)) }))}
                      className="h-11 w-24 border border-ink/35 bg-paper px-3 text-base tabular-nums text-ink"
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="coalitions" className="mt-10">
            <h2 id="coalitions" className="text-2xl font-extrabold tracking-tight">
              Possible coalitions
            </h2>
            <p className="mt-1 text-[14.5px] text-muted">
              Every combination of up to four parties that reaches {formatNum(majority)} seats, starting with the fewest members first. These are possible majorities, not
              agreements.
            </p>
            {coalitions.length === 0 ? (
              <p className="mt-4 border border-line bg-wash p-5 text-[15.5px] text-body">
                No combination of up to four parties reaches a majority with this tally. Either a single party already has {formatNum(majority)} seats, or the council is
                gridlocked under these numbers.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {coalitions.slice(0, shown).map((coalition, index) => (
                  <li key={index} className="border border-line bg-paper p-4">
                    <p className="text-[16px] font-extrabold text-ink">{coalition.members.map((m) => m.name).join(' + ')}</p>
                    <p className="mt-1 text-[14px] tabular-nums text-body">
                      {formatNum(coalition.seats)} seats — {coalition.seats - majority >= 0 ? `+${coalition.seats - majority}` : ''} over the {formatNum(majority)} needed
                      {' · '}
                      {coalition.members.length} {coalition.members.length === 1 ? 'party' : 'parties'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {shown < coalitions.length && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setShown((n) => n + 12)}
                  className="inline-flex h-12 cursor-pointer items-center border-2 border-navy px-7 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white"
                >
                  Show more combinations ({coalitions.length - shown} left)
                </button>
              </div>
            )}
            {truncated && <p className="mt-3 text-[13.5px] text-muted">The full list is longer than 8 000 combinations, so it has been cut off.</p>}
          </section>
        </>
      )}
    </div>
  )
}
