import { useMemo, useState } from 'react'
import { majorityOf, possibleCoalitions } from '../lib/coalitions'
import type { Bloc } from '../lib/coalitions'

const MAX_PARTIES = 4
const FIRST = 8
const MORE = 12
const SIZE_WORD: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four' }

interface Props {
  councilSeats: number
  /** Parties and the seats each holds. */
  parties: Bloc[]
  /** Independent councillors taken together. Each decides alone, so they are kept out of the listed combinations. */
  independents?: Bloc
  /** Where the seats come from, to finish the sentence "Worked out from …". */
  basis: string
}

/** For a hung council: the smallest groups of parties that reach a majority, and a way to add up any group. */
export function Coalitions({ councilSeats, parties, independents, basis }: Props) {
  const majority = majorityOf(councilSeats)
  const blocs = useMemo(() => parties.filter((p) => p.seats > 0).sort((a, b) => b.seats - a.seats || a.name.localeCompare(b.name)), [parties])
  const found = useMemo(() => possibleCoalitions(blocs, majority, MAX_PARTIES), [blocs, majority])
  const [shown, setShown] = useState(FIRST)
  const [picked, setPicked] = useState<Set<string>>(() => new Set())

  const largest = blocs[0]
  if (!largest) return null

  const heading = (
    <h3 id="coalitions" className="text-xl font-extrabold tracking-tight">
      Possible coalitions
    </h3>
  )

  if (largest.seats >= majority) {
    return (
      <section aria-labelledby="coalitions" className="mt-10 border-t border-line pt-7">
        {heading}
        <p className="mt-2 max-w-[78ch] text-[15.5px] leading-relaxed text-body">
          None is needed. <span className="font-bold text-ink">{largest.name}</span> holds {largest.seats} of the {councilSeats} seats, more than half, and can
          govern alone.
        </p>
      </section>
    )
  }

  const loose = independents && independents.seats > 0 ? independents : null
  const choices = loose ? [...blocs, loose] : blocs
  const total = choices.filter((c) => picked.has(c.key)).reduce((sum, c) => sum + c.seats, 0)
  const chosen = choices.filter((c) => picked.has(c.key)).length
  const n = found.coalitions.length
  const bySize = [2, 3, 4].map((size) => [size, found.coalitions.filter((c) => c.members.length === size).length] as const).filter(([, howMany]) => howMany > 0)

  const toggle = (key: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <section aria-labelledby="coalitions" className="mt-10 border-t border-line pt-7">
      {heading}
      <p className="mt-2 max-w-[78ch] text-[15.5px] leading-relaxed text-body">
        No party has more than half the seats, so a majority of <span className="font-bold text-ink">{majority}</span> needs parties to combine. Worked out from{' '}
        {basis}.
      </p>
      <p className="mt-3 max-w-[78ch] border-l-4 border-navy bg-navy-tint px-4 py-3 text-[14.5px] leading-relaxed text-body">
        This is arithmetic only. It shows which parties’ seats add up to a majority, not which parties are willing to govern together.
      </p>

      {n === 0 ? (
        <p className="mt-5 max-w-[78ch] text-[15.5px] leading-relaxed text-body">
          No combination of four parties or fewer reaches the {majority} seats needed. Use the boxes below to add up a larger group.
        </p>
      ) : (
        <>
          <p className="mt-5 max-w-[78ch] text-[15.5px] leading-relaxed text-body">
            <span className="font-bold text-ink">
              {found.truncated ? 'More than ' : ''}
              {n.toLocaleString('en-ZA')} {n === 1 ? 'combination' : 'combinations'} of up to four parties {n === 1 ? 'reaches' : 'reach'} {majority} seats
            </span>
            {bySize.length > 1 ? `: ${bySize.map(([size, howMany]) => `${howMany.toLocaleString('en-ZA')} of ${SIZE_WORD[size]}`).join(', ')}` : ''}. Each is as
            small as it can be: take any party out and it falls short. Those needing the fewest parties come first.
          </p>
          {loose && (
            <p className="mt-2 max-w-[78ch] text-[14.5px] leading-relaxed text-muted">
              The {loose.seats} independent {loose.seats === 1 ? 'councillor is' : 'councillors are'} left out of this list, because each decides alone. You can add them
              in below.
            </p>
          )}
          <ol className="mt-3 divide-y divide-line border-y border-line">
            {found.coalitions.slice(0, shown).map((c) => (
              <li key={c.members.map((m) => m.key).join('+')} className="py-3.5">
                <p className="text-[16px] font-bold leading-snug">
                  {c.members.map((m, i) => (
                    <span key={m.key}>
                      {i > 0 && <span className="font-normal text-muted"> + </span>}
                      {m.name} <span className="font-normal tabular-nums text-body">({m.seats})</span>
                    </span>
                  ))}
                </p>
                <p className="mt-0.5 text-[14px] tabular-nums text-body">
                  <span className="font-extrabold text-ink">{c.seats} seats</span> · {SIZE_WORD[c.members.length] ?? c.members.length} parties ·{' '}
                  {c.seats === majority ? 'exactly the majority' : `${c.seats - majority} more than needed`}
                </p>
              </li>
            ))}
          </ol>
          {n > shown && (
            <button
              type="button"
              onClick={() => setShown((s) => s + MORE)}
              className="mt-4 inline-flex h-11 cursor-pointer items-center border-2 border-navy px-5 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white"
            >
              Show more combinations ({(n - shown).toLocaleString('en-ZA')} left)
            </button>
          )}
        </>
      )}

      <fieldset className="mt-8 border border-line bg-wash p-4 sm:p-5">
        <legend className="px-1 text-[17px] font-extrabold">Try a combination</legend>
        <p className="text-[14.5px] leading-relaxed text-body">Tick parties to add up their seats.</p>
        {/* The running total stays in view under the floating bar while the list of parties scrolls. */}
        <div className="sticky top-[116px] z-10 -mx-4 mt-2 border-b border-line bg-wash px-4 pb-3 pt-3 sm:-mx-5 sm:px-5">
          <div className="relative h-3 bg-line" aria-hidden="true">
            <div className={`h-full ${total >= majority ? 'bg-[#0b5a2e]' : 'bg-navy'}`} style={{ width: `${Math.min(100, (total / councilSeats) * 100)}%` }} />
            <div className="absolute -bottom-1 -top-1 w-0.5 bg-ink" style={{ left: `${(majority / councilSeats) * 100}%` }} />
          </div>
          <p role="status" className="mt-2.5 text-[16px] font-bold leading-snug">
            {chosen === 0
              ? `Nothing ticked yet. A majority is ${majority} of the ${councilSeats} seats.`
              : total >= majority
                ? `${total} of ${councilSeats} seats: a majority${total === majority ? `, exactly the ${majority} needed` : `, with ${total - majority} to spare`}.`
                : `${total} of ${councilSeats} seats: ${majority - total} short of the ${majority} needed.`}
          </p>
        </div>
        <ul className="mt-2 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {choices.map((c) => (
            <li key={c.key}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1 text-[15px] leading-snug">
                <input type="checkbox" checked={picked.has(c.key)} onChange={() => toggle(c.key)} className="size-5 shrink-0 cursor-pointer accent-navy" />
                <span className="min-w-0">
                  <span className="font-bold">{c === loose ? 'Independent councillors' : c.name}</span>{' '}
                  <span className="tabular-nums text-body">
                    ({c.seats}
                    <span className="sr-only"> seats</span>)
                  </span>
                  {c === loose && <span className="block text-[13px] text-muted">each decides alone</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>

        {chosen > 0 && (
          <button type="button" onClick={() => setPicked(new Set())} className="mt-1 inline-flex min-h-11 cursor-pointer items-center text-sm font-bold text-navy underline underline-offset-[3px]">
            Clear ticks
          </button>
        )}
      </fieldset>
    </section>
  )
}
