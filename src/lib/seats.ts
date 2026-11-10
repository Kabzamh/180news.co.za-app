import type { CouncilResults } from './iec'

/**
 * How seats on a metro or local council are shared out in South African
 * local government elections (Schedule 1 of the Municipal Structures Act):
 *
 *   quota = (A ÷ (B − C)), fractions dropped, + 1
 *
 * A is every valid vote for the parties on the ward and PR ballots together,
 * B the seats on the council, and C the ward seats won outside the party
 * lists. Each party gets a seat per full quota, the seats left over go to the
 * largest remainders, and a party's PR list seats are its total less the ward
 * seats it has already won. A party that won more wards than its total keeps
 * them, and the quota is worked out again for everyone else.
 *
 * Votes for independents and for parties with no PR list are left out of A and
 * their ward seats counted in C. That is how the IEC's published results
 * behave: with it, this reproduces the declared seats council by council.
 */

export interface SeatParty {
  key: string
  name: string
  votes: number
  wardSeats: number
  /** False for independents and parties with no PR list. */
  counted: boolean
}

export interface SeatRow extends SeatParty {
  /** Won more ward seats than its votes earned, so it sits outside the final quota. */
  overhang: boolean
  /** Votes ÷ quota; null for rows outside the final calculation. */
  quotas: number | null
  whole: number
  extra: number
  total: number
  listSeats: number
}

export interface SeatRound {
  quota: number
  votes: number
  seats: number
  /** Parties taken out after this round because their ward seats exceeded their share. */
  overhang: Array<{ name: string; wardSeats: number; earned: number }>
}

export interface SeatResult {
  rows: SeatRow[]
  /** The quota finally used. */
  quota: number
  /** A, B − C and the leftover seats in the final round. */
  votes: number
  seatsShared: number
  leftover: number
  councilSeats: number
  outsideSeats: number
  outsideVotes: number
  rounds: SeatRound[]
  /** Seats needed for more than half the council. */
  majority: number
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

export function calculateSeats(councilSeats: number, parties: SeatParty[]): { ok: true; result: SeatResult } | { ok: false; error: string } {
  if (!Number.isInteger(councilSeats) || councilSeats < 1) return { ok: false, error: 'Enter how many seats the council has.' }
  if (parties.some((p) => !Number.isInteger(p.votes) || p.votes < 0 || !Number.isInteger(p.wardSeats) || p.wardSeats < 0)) {
    return { ok: false, error: 'Votes and ward seats must be whole numbers.' }
  }
  if (sum(parties.map((p) => p.wardSeats)) > councilSeats) return { ok: false, error: 'The ward seats add up to more than the council’s seats.' }

  const outside = parties.filter((p) => !p.counted)
  const outsideSeats = sum(outside.map((p) => p.wardSeats))
  let pool = parties.filter((p) => p.counted)
  if (sum(pool.map((p) => p.votes)) === 0) return { ok: false, error: 'Enter the votes for at least one party on the PR ballot.' }

  const kept = new Map<string, number>()
  const rounds: SeatRound[] = []
  let whole = new Map<string, number>()
  let extra = new Map<string, number>()
  let quota = 0
  let votes = 0
  let seats = 0

  for (;;) {
    seats = councilSeats - outsideSeats - sum([...kept.values()])
    votes = sum(pool.map((p) => p.votes))
    whole = new Map()
    extra = new Map()
    if (seats <= 0 || votes <= 0) {
      quota = 0
      rounds.push({ quota, votes, seats: Math.max(0, seats), overhang: [] })
      break
    }
    quota = Math.floor(votes / seats) + 1
    for (const p of pool) whole.set(p.key, Math.floor(p.votes / quota))
    const left = seats - sum([...whole.values()])
    // Largest remainder first; equal remainders go to the party with more votes.
    const order = [...pool].sort((a, b) => (b.votes % quota) - (a.votes % quota) || b.votes - a.votes)
    for (let i = 0; i < left; i++) {
      const p = order[i % order.length]
      extra.set(p.key, (extra.get(p.key) ?? 0) + 1)
    }
    const earned = (p: SeatParty) => (whole.get(p.key) ?? 0) + (extra.get(p.key) ?? 0)
    const over = pool.filter((p) => p.wardSeats > earned(p))
    rounds.push({ quota, votes, seats, overhang: over.map((p) => ({ name: p.name, wardSeats: p.wardSeats, earned: earned(p) })) })
    if (over.length === 0) break
    for (const p of over) kept.set(p.key, p.wardSeats)
    pool = pool.filter((p) => !kept.has(p.key))
  }

  const inPool = new Set(pool.map((p) => p.key))
  const rows: SeatRow[] = parties.map((p) => {
    if (!p.counted || !inPool.has(p.key)) {
      return { ...p, overhang: p.counted, quotas: null, whole: 0, extra: 0, total: p.wardSeats, listSeats: 0 }
    }
    const w = whole.get(p.key) ?? 0
    const e = extra.get(p.key) ?? 0
    return { ...p, overhang: false, quotas: quota > 0 ? p.votes / quota : null, whole: w, extra: e, total: w + e, listSeats: w + e - p.wardSeats }
  })
  rows.sort((a, b) => b.total - a.total || b.votes - a.votes)

  return {
    ok: true,
    result: {
      rows,
      quota,
      votes,
      seatsShared: Math.max(0, seats),
      leftover: sum([...extra.values()]),
      councilSeats,
      outsideSeats,
      outsideVotes: sum(outside.map((p) => p.votes)),
      rounds,
      majority: Math.floor(councilSeats / 2) + 1,
    },
  }
}

/** A council's IEC figures as input for the calculation. */
export function seatPartiesFor(council: CouncilResults): SeatParty[] {
  return council.parties.map((p) => ({
    key: String(p.id),
    name: p.name,
    votes: p.votes,
    wardSeats: p.wardSeats,
    // Independents (id 0) and parties that drew no PR votes had no list to fill seats from.
    counted: p.id !== 0 && p.prVotes > 0,
  }))
}
