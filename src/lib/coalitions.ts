/**
 * Which groups of parties hold more than half of a council's seats.
 *
 * This is arithmetic on seats and nothing more: it says which combinations
 * add up, not which parties are willing to govern together.
 */

export interface Bloc {
  key: string
  name: string
  seats: number
}

export interface Coalition {
  /** Largest party first. */
  members: Bloc[]
  seats: number
}

/** Seats needed for more than half of a council. */
export const majorityOf = (councilSeats: number) => Math.floor(councilSeats / 2) + 1

/**
 * The fewest parties whose seats together reach the majority, taking the
 * largest first. Null when the parties listed do not get there.
 */
export function fewestParties(seats: number[], majority: number): number | null {
  let total = 0
  const sorted = [...seats].sort((a, b) => b - a)
  for (let i = 0; i < sorted.length; i++) {
    total += sorted[i]
    if (total >= majority) return i + 1
  }
  return null
}

const HARD_LIMIT = 20_000

/**
 * Every smallest winning combination of up to `maxParties` parties: together
 * they reach the majority, and taking any one of them out drops below it.
 * Returned with the fewest parties first, then the most seats.
 */
export function possibleCoalitions(blocs: Bloc[], majority: number, maxParties = 4): { coalitions: Coalition[]; truncated: boolean } {
  const sorted = blocs.filter((b) => b.seats > 0).sort((a, b) => b.seats - a.seats || a.name.localeCompare(b.name))
  const prefix = [0]
  for (const b of sorted) prefix.push(prefix[prefix.length - 1] + b.seats)
  /** Seats of the `howMany` largest parties from position `from` on. */
  const best = (from: number, howMany: number) => prefix[Math.min(sorted.length, from + howMany)] - prefix[Math.min(sorted.length, from)]

  const coalitions: Coalition[] = []
  let truncated = false

  const walk = (start: number, picked: Bloc[], sum: number) => {
    for (let i = start; i < sorted.length; i++) {
      if (coalitions.length >= HARD_LIMIT) {
        truncated = true
        return
      }
      const bloc = sorted[i]
      const total = sum + bloc.seats
      if (total >= majority) {
        // The group was short before this party joined, and this party is its smallest member,
        // so no member can be dropped: it is a smallest winning combination.
        coalitions.push({ members: [...picked, bloc], seats: total })
        continue
      }
      const room = maxParties - picked.length - 1
      // Parties come in falling order of seats, so if this one cannot get there with the
      // largest that follow, none after it can either.
      if (room <= 0 || total + best(i + 1, room) < majority) break
      walk(i + 1, [...picked, bloc], total)
    }
  }

  if (majority > 0 && maxParties > 0) walk(0, [], 0)
  coalitions.sort((a, b) => a.members.length - b.members.length || b.seats - a.seats || a.members.map((m) => m.name).join().localeCompare(b.members.map((m) => m.name).join()))
  return { coalitions, truncated }
}
