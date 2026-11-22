import { useEffect, useMemo, useState } from 'react'
import { useControl } from '../lib/control'
import { useTitle } from '../lib/weather'
import { computePartyProbe, loadPartyList, type PartyMeta, type PartyProbe } from '../lib/iec'
import { formatNum } from '../lib/format'

export default function PartyResults() {
  useTitle('Results by party')
  const { settings } = useControl()
  const [parties, setParties] = useState<PartyMeta[]>([])
  const [probe, setProbe] = useState<{ id: number; result: { state: string; data?: PartyProbe; origin?: string } } | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [onlyLeads, setOnlyLeads] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadPartyList().then((list) => {
      if (cancelled) return
      setParties(list)
      setSelected((current) => current ?? list[0]?.id ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (selected === null) return
    let cancelled = false
    setProbe({ id: selected, result: { state: 'loading' } })
    computePartyProbe(selected).then((result) => {
      if (!cancelled) setProbe({ id: selected, result })
    })
    return () => {
      cancelled = true
    }
  }, [selected, settings.refreshMinutes])

  const current = probe && probe.result.state === 'ready' ? probe.result.data : undefined
  const councils = useMemo(() => (current ? (onlyLeads ? current.councils.filter((c) => c.leads) : current.councils) : []), [current, onlyLeads])

  return (
    <div className="wrap max-w-[980px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">Results by party</h1>
        <p className="mt-2 max-w-[70ch] text-[15px] text-muted">How one party did across the country: votes, seats, councils led and outright majorities won.</p>
      </header>

      <div className="mt-6">
        <label htmlFor="party-select" className="block text-[15px] font-extrabold">
          Choose a party
        </label>
        <select
          id="party-select"
          value={selected ?? ''}
          onChange={(e) => setSelected(Number(e.target.value))}
          className="mt-1 h-12 w-full max-w-md border border-ink/35 bg-paper px-3.5 text-base text-ink"
        >
          {parties.map((party) => (
            <option key={party.id} value={party.id}>
              {party.name}
            </option>
          ))}
        </select>
      </div>

      {probe?.result.state === 'loading' && <p className="mt-6 text-[15px] text-muted">Adding up the councils…</p>}
      {probe?.result.state === 'error' && <p className="mt-6 text-[15px] text-muted">The results could not be loaded just now. Try another party or check again shortly.</p>}

      {current && (
        <>
          <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {([
              ['Total votes', formatNum(current.votes)],
              ['National share', `${current.share.toFixed(2)}%`],
              ['Council seats', formatNum(current.seats)],
              ['Ward seats', formatNum(current.wardSeats)],
              ['Councils led', formatNum(current.councilsLed)],
              ['Outright majorities', formatNum(current.majorities)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="border border-line bg-paper p-4">
                <dt className="text-[12.5px] font-black uppercase tracking-[0.05em] text-muted">{label}</dt>
                <dd className="mt-1 text-2xl font-black tabular-nums text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="party-provinces" className="mt-10">
            <h2 id="party-provinces" className="text-2xl font-extrabold tracking-tight">
              By province
            </h2>
            <div className="mt-3 overflow-x-auto border border-line">
              <table className="w-full min-w-[620px] border-collapse text-left text-[15px]">
                <thead>
                  <tr className="bg-wash text-[12.5px] uppercase tracking-[0.05em] text-muted">
                    <th scope="col" className="px-4 py-3 font-extrabold">Province</th>
                    <th scope="col" className="px-4 py-3 text-right font-extrabold">Votes</th>
                    <th scope="col" className="px-4 py-3 text-right font-extrabold">Share</th>
                    <th scope="col" className="px-4 py-3 text-right font-extrabold">Seats</th>
                    <th scope="col" className="px-4 py-3 text-right font-extrabold">Led</th>
                    <th scope="col" className="px-4 py-3 text-right font-extrabold">Majorities</th>
                  </tr>
                </thead>
                <tbody>
                  {current.provinces.map((row) => (
                    <tr key={row.name} className="border-t border-line">
                      <th scope="row" className="px-4 py-3 font-bold">{row.name}</th>
                      <td className="px-4 py-3 text-right tabular-nums text-body">{formatNum(row.votes)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-body">{row.share.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right tabular-nums text-body">{formatNum(row.seats)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-body">{formatNum(row.councilsLed)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-body">{formatNum(row.majorities)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="party-councils" className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="party-councils" className="text-2xl font-extrabold tracking-tight">
                Council by council
              </h2>
              <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={onlyLeads} onChange={(e) => setOnlyLeads(e.target.checked)} className="size-4 accent-[#890303]" />
                Only councils it leads
              </label>
            </div>
            <div className="mt-3 overflow-x-auto border border-line">
              <table className="w-full min-w-[620px] border-collapse text-left text-[15px]">
                <thead>
                  <tr className="bg-wash text-[12.5px] uppercase tracking-[0.05em] text-muted">
                    <th scope="col" className="px-4 py-3 font-extrabold">Council</th>
                    <th scope="col" className="px-4 py-3 font-extrabold">Province</th>
                    <th scope="col" className="px-4 py-3 text-right font-extrabold">Votes</th>
                    <th scope="col" className="px-4 py-3 text-right font-extrabold">Share</th>
                    <th scope="col" className="px-4 py-3 text-right font-extrabold">Seats</th>
                    <th scope="col" className="px-4 py-3 font-extrabold">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {councils.slice(0, 60).map((row) => (
                    <tr key={row.id} className="border-t border-line">
                      <th scope="row" className="px-4 py-3 font-bold">{row.name}</th>
                      <td className="px-4 py-3 text-body">{row.province}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-body">{formatNum(row.votes)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-body">{row.share.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right tabular-nums text-body">
                        {formatNum(row.seats)}/{formatNum(row.councilSeats)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[12.5px] font-bold ${row.leads ? 'bg-[#dff5e8] text-[#0b5a2e]' : 'bg-wash text-body'}`}>
                          {row.leads ? 'In front' : 'Behind'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
