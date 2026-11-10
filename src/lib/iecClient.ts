import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { isCouncilResults, isLargestParties, isNationalResults, isPartyDetail, isPartyId } from './iec'
import type { CouncilResults, LargestParties, NationalResults, PartyCouncil, PartyDetail } from './iec'

/**
 * Results come live from the IEC through /api/iec. When that cannot be
 * reached, the copy saved with the app is used instead and says so.
 */

export type Loaded<T> =
  | { state: 'loading' }
  | { state: 'error' }
  /** `at` is when the figures were fetched (live) or saved (saved copy). */
  | { state: 'ready'; data: T; origin: 'live' | 'saved'; at: number; /** The latest check failed, so these are the figures from the one before. */ missed?: boolean }

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    // A missing endpoint behind the app's rewrite answers 200 with HTML.
    if (!(res.headers.get('content-type') ?? '').includes('json')) throw new Error('Unexpected response')
    return await res.json()
  } finally {
    window.clearTimeout(timer)
  }
}

const record = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {})
const time = (value: unknown) => (typeof value === 'number' && value > 0 ? value : Date.now())

async function loadNational(): Promise<Loaded<NationalResults>> {
  try {
    const live = record(await getJson('/api/iec', 15_000))
    if (isNationalResults(live.data)) return { state: 'ready', data: live.data, origin: 'live', at: time(live.fetchedAt) }
  } catch {
    /* fall through to the saved copy */
  }
  try {
    const saved = record(await getJson('/iec-national.json', 15_000))
    if (isNationalResults(saved.data)) return { state: 'ready', data: saved.data, origin: 'saved', at: time(saved.savedAt) }
  } catch {
    /* nothing to show */
  }
  return { state: 'error' }
}

let savedCouncils: Promise<Record<string, unknown>> | null = null

async function loadCouncil(id: number): Promise<Loaded<CouncilResults>> {
  try {
    const live = record(await getJson(`/api/iec?council=${id}`, 30_000))
    if (isCouncilResults(live.data)) return { state: 'ready', data: live.data, origin: 'live', at: time(live.fetchedAt) }
  } catch {
    /* fall through to the saved copy */
  }
  try {
    savedCouncils ??= getJson('/iec-councils.json', 30_000).then(record)
    const saved = await savedCouncils
    const council = record(saved.councils)[String(id)]
    if (isCouncilResults(council)) return { state: 'ready', data: council, origin: 'saved', at: time(saved.savedAt) }
  } catch {
    savedCouncils = null
  }
  return { state: 'error' }
}

/* The national results are held once for the whole app, so moving between the
   front page, the results page and the calculator does not fetch them again. */
let national: Loaded<NationalResults> = { state: 'loading' }
let nationalCheckedAt = 0
let nationalJob: Promise<void> | null = null
const nationalListeners = new Set<() => void>()

function subscribeNational(listener: () => void): () => void {
  nationalListeners.add(listener)
  return () => nationalListeners.delete(listener)
}

/** What to show after a check: never swap newer live figures for an older saved copy. */
function settle(prev: Loaded<NationalResults>, next: Loaded<NationalResults>): Loaded<NationalResults> {
  if (next.state === 'ready' && next.origin === 'live') return next
  if (prev.state === 'ready' && prev.origin === 'live') return { ...prev, missed: true }
  if (next.state === 'ready') return next
  return prev.state === 'ready' ? prev : next
}

function checkNational(): Promise<void> {
  nationalJob ??= loadNational()
    .then((next) => {
      national = settle(national, next)
      nationalCheckedAt = Date.now()
      nationalListeners.forEach((listener) => listener())
    })
    .finally(() => {
      nationalJob = null
    })
  return nationalJob
}

/**
 * National results, kept live. With `refreshMinutes` above zero they are
 * re-checked on that schedule while the tab is visible, and when it becomes
 * visible again after a longer gap.
 */
export function useNationalResults(refreshMinutes = 0): { results: Loaded<NationalResults>; refreshing: boolean; refresh: () => void } {
  const results = useSyncExternalStore(subscribeNational, () => national)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (Date.now() - nationalCheckedAt > 60_000) void checkNational()
  }, [])

  useEffect(() => {
    if (refreshMinutes <= 0) return
    const every = refreshMinutes * 60_000
    const due = () => {
      if (!document.hidden && Date.now() - nationalCheckedAt >= every - 5_000) void checkNational()
    }
    const timer = window.setInterval(due, every)
    document.addEventListener('visibilitychange', due)
    window.addEventListener('online', due)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', due)
      window.removeEventListener('online', due)
    }
  }, [refreshMinutes])

  const refresh = useCallback(() => {
    setRefreshing(true)
    void checkNational().finally(() => setRefreshing(false))
  }, [])

  return { results, refreshing, refresh }
}

export function useCouncilResults(id: number | null): Loaded<CouncilResults> | null {
  const [loaded, setLoaded] = useState<{ id: number; result: Loaded<CouncilResults> } | null>(null)

  useEffect(() => {
    if (id === null) return
    let cancelled = false
    void loadCouncil(id).then((result) => {
      if (!cancelled) setLoaded({ id, result })
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (id === null) return null
  return loaded && loaded.id === id ? loaded.result : { state: 'loading' }
}

/** A party's results worked out from the saved copy of the council files. */
function partyFromSaved(saved: Record<string, unknown>, id: number, undecided: Set<number>): PartyDetail | null {
  const provinces = new Map<string, { valid: number; votes: number; seats: number; led: number; majorities: number; stood: boolean }>()
  const councils: PartyCouncil[] = []
  let name = ''
  let valid = 0
  for (const council of Object.values(record(saved.councils))) {
    if (!isCouncilResults(council)) continue
    const councilValid = council.parties.reduce((sum, p) => sum + p.votes, 0)
    valid += councilValid
    const province = provinces.get(council.province) ?? { valid: 0, votes: 0, seats: 0, led: 0, majorities: 0, stood: false }
    province.valid += councilValid
    provinces.set(council.province, province)
    const own = council.parties.find((p) => p.id === id)
    if (!own) continue
    name ||= own.name
    // As the IEC counts it: a party leads a council when it alone has the most seats, once the council is decided.
    const others = council.parties.filter((p) => p.id !== 0 && p.id !== id).map((p) => p.seats)
    const leads = own.seats > 0 && own.seats > Math.max(0, ...others) && !undecided.has(council.id)
    const majority = own.seats * 2 > council.seats
    province.stood = true
    province.votes += own.votes
    province.seats += own.seats
    if (leads) province.led += 1
    if (majority) province.majorities += 1
    councils.push({
      id: council.id,
      code: council.code,
      name: council.name,
      province: council.province,
      votes: own.votes,
      share: councilValid > 0 ? (own.votes / councilValid) * 100 : 0,
      wardSeats: own.wardSeats,
      seats: own.seats,
      councilSeats: council.seats,
      leads,
    })
  }
  if (councils.length === 0) return null
  const votes = councils.reduce((sum, c) => sum + c.votes, 0)
  const stood = [...provinces].filter(([, p]) => p.stood)
  return {
    id,
    name,
    reportedAt: null,
    votes,
    share: valid > 0 ? (votes / valid) * 100 : 0,
    wardSeats: councils.reduce((sum, c) => sum + c.wardSeats, 0),
    seats: councils.reduce((sum, c) => sum + c.seats, 0),
    councilsLed: stood.reduce((sum, [, p]) => sum + p.led, 0),
    majorities: stood.reduce((sum, [, p]) => sum + p.majorities, 0),
    provinces: stood.map(([province, p]) => ({ name: province, votes: p.votes, share: p.valid > 0 ? (p.votes / p.valid) * 100 : 0, seats: p.seats, councilsLed: p.led, majorities: p.majorities })),
    councils,
  }
}

async function loadParty(id: number): Promise<Loaded<PartyDetail>> {
  try {
    const live = record(await getJson(`/api/iec?party=${id}`, 20_000))
    if (isPartyDetail(live.data)) return { state: 'ready', data: live.data, origin: 'live', at: time(live.fetchedAt) }
  } catch {
    /* fall through to the saved copy */
  }
  try {
    savedCouncils ??= getJson('/iec-councils.json', 30_000).then(record)
    const [saved, national] = await Promise.all([savedCouncils, getJson('/iec-national.json', 15_000).then(record, () => record(null))])
    const undecided = new Set(isNationalResults(national.data) ? national.data.councils.filter((c) => c.status === 'pending').map((c) => c.id) : [])
    const party = partyFromSaved(saved, id, undecided)
    if (party) return { state: 'ready', data: party, origin: 'saved', at: time(saved.savedAt) }
  } catch {
    savedCouncils = null
  }
  return { state: 'error' }
}

export function usePartyResults(id: number | null): Loaded<PartyDetail> | null {
  const [loaded, setLoaded] = useState<{ id: number; result: Loaded<PartyDetail> } | null>(null)

  useEffect(() => {
    if (id === null) return
    let cancelled = false
    void loadParty(id).then((result) => {
      if (!cancelled) setLoaded({ id, result })
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (id === null) return null
  return loaded && loaded.id === id ? loaded.result : { state: 'loading' }
}

async function loadLargest(): Promise<Loaded<LargestParties>> {
  try {
    const live = record(await getJson('/api/iec?largest=1', 20_000))
    if (isLargestParties(live.data)) return { state: 'ready', data: live.data, origin: 'live', at: time(live.fetchedAt) }
  } catch {
    /* fall through to the saved copy */
  }
  try {
    savedCouncils ??= getJson('/iec-councils.json', 30_000).then(record)
    const saved = await savedCouncils
    const out: LargestParties = {}
    for (const council of Object.values(record(saved.councils))) {
      if (!isCouncilResults(council)) continue
      out[council.id] = council.parties
        .filter((p) => p.id > 0 && p.seats > 0)
        .sort((a, b) => b.seats - a.seats)
        .slice(0, 3)
        .map((p) => ({ id: p.id, name: p.name, seats: p.seats }))
    }
    if (Object.keys(out).length > 0) return { state: 'ready', data: out, origin: 'saved', at: time(saved.savedAt) }
  } catch {
    savedCouncils = null
  }
  return { state: 'error' }
}

let largestJob: Promise<Loaded<LargestParties>> | null = null

/** The three largest parties on every council, for the coalition overview. */
export function useLargestParties(): Loaded<LargestParties> {
  const [largest, setLargest] = useState<Loaded<LargestParties>>({ state: 'loading' })

  useEffect(() => {
    let cancelled = false
    largestJob ??= loadLargest().then((result) => {
      // Only a live answer is kept, so the next visit to the page tries the IEC again.
      if (result.state !== 'ready' || result.origin !== 'live') largestJob = null
      return result
    })
    void largestJob.then((result) => {
      if (!cancelled) setLargest(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return largest
}

export interface PartyName {
  id: number
  name: string
}

let partyDirectory: Promise<PartyName[]> | null = null

/** Every party that stood, A to Z. Null while loading; empty if the list could not be loaded. */
export function usePartyDirectory(): PartyName[] | null {
  const [parties, setParties] = useState<PartyName[] | null>(null)

  useEffect(() => {
    let cancelled = false
    partyDirectory ??= getJson('/iec-parties.json', 15_000)
      .then((file) => {
        const entries: unknown = record(file).parties
        return Array.isArray(entries) ? entries.filter((p): p is PartyName => isPartyId(record(p).id) && typeof record(p).name === 'string') : []
      })
      .catch(() => {
        partyDirectory = null
        return []
      })
    void partyDirectory.then((entries) => {
      if (!cancelled) setParties(entries)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return parties
}

/** "9 160 614" – spaces between thousands, as South African newsrooms write figures. */
export const count = (n: number) => Math.round(n).toLocaleString('en-ZA').replace(/[\u00a0\u202f,]/g, '\u00a0')
