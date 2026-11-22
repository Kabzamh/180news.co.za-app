/**
 * Election results layer. Live figures come from the IEC via /api/iec; when the
 * Commission cannot be reached the last saved copies ship with the app.
 */

export interface PartyResult {
  id: number
  name: string
  votes: number
  prVotes: number
  wardSeats: number
  seats: number
  councilsLed?: number
  majorities?: number
}

export interface NationalResults {
  reportedAt: number
  totals: {
    councils: number
    councilsComplete?: number
    majority: number
    hung: number
    seats: number
    seatsAllocated: number
    districts: number
    districtsCounted: number
    registered: number
    validVotes: number
    spoiltVotes: number
  }
  parties: PartyResult[]
  councils: CouncilResults[]
}

export interface CouncilResults {
  id: number
  code?: string
  name: string
  province: string
  status?: 'complete' | 'pending'
  seats: number
  parties: PartyResult[]
}

export interface PartyProbe {
  id: number
  name: string
  votes: number
  share: number
  wardSeats: number
  seats: number
  councilsLed: number
  majorities: number
  provinces: { name: string; votes: number; share: number; seats: number; councilsLed: number; majorities: number }[]
  councils: {
    id: number
    code?: string
    name: string
    province: string
    votes: number
    share: number
    wardSeats: number
    seats: number
    councilSeats: number
    leads: boolean
  }[]
}

export type LargestMap = Record<string, { id: number; name: string; seats: number }[]>

export interface IecState<T> {
  state: 'loading' | 'ready' | 'error'
  data?: T
  origin?: 'live' | 'saved'
  at?: number
  missed?: boolean
}

const isObj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})
const asTime = (v: unknown): number => (typeof v === 'number' && v > 0 ? v : Date.now())

const isParty = (v: unknown): v is PartyResult => {
  const p = isObj(v)
  return (
    typeof p.id === 'number' &&
    typeof p.name === 'string' &&
    ['votes', 'prVotes', 'wardSeats', 'seats'].every((k) => typeof p[k] === 'number')
  )
}

const isCouncil = (v: unknown): v is CouncilResults => {
  const c = isObj(v)
  return typeof c.id === 'number' && typeof c.name === 'string' && typeof c.seats === 'number' && Array.isArray(c.parties) && c.parties.length > 0 && c.parties.every(isParty)
}

function isNational(v: unknown): v is NationalResults {
  const n = isObj(v)
  const totals = isObj(n.totals)
  return (
    Array.isArray(n.parties) &&
    n.parties.length > 0 &&
    n.parties.every(isParty) &&
    Array.isArray(n.councils) &&
    typeof totals.seats === 'number' &&
    typeof totals.validVotes === 'number'
  )
}

function isPartyProbe(v: unknown): v is PartyProbe {
  const p = isObj(v)
  const numeric = (o: Record<string, unknown>, keys: string[]): boolean => keys.every((k) => typeof o[k] === 'number')
  return (
    typeof p.id === 'number' &&
    typeof p.name === 'string' &&
    numeric(p, ['votes', 'share', 'wardSeats', 'seats', 'councilsLed', 'majorities']) &&
    Array.isArray(p.provinces) &&
    Array.isArray(p.councils) &&
    p.councils.length > 0
  )
}

async function fetchJson(url: string, ms: number): Promise<unknown> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (!(res.headers.get('content-type') ?? '').includes('json')) throw new Error('Unexpected response')
    return await res.json()
  } finally {
    window.clearTimeout(timer)
  }
}

export async function loadNational(): Promise<IecState<NationalResults>> {
  try {
    const payload = isObj(await fetchJson('/api/iec', 15000))
    const data = isObj(payload.data)
    if (isNational(data)) return { state: 'ready', data, origin: 'live', at: asTime(payload.fetchedAt) }
  } catch {
    /* fall through to the saved copy */
  }
  try {
    const payload = isObj(await fetchJson('/iec-national.json', 15000))
    const data = isObj(payload.data)
    if (isNational(data)) return { state: 'ready', data, origin: 'saved', at: asTime(payload.savedAt) }
  } catch {
    /* ignore */
  }
  return { state: 'error' }
}

let councilsCache: Promise<Record<string, unknown>> | null = null
function loadCouncilFile(): Promise<Record<string, unknown>> {
  councilsCache ??= fetchJson('/iec-councils.json', 30000).then((raw) => isObj(isObj(raw).councils))
  return councilsCache
}

export async function loadCouncil(id: number): Promise<IecState<CouncilResults>> {
  try {
    const payload = isObj(await fetchJson(`/api/iec?council=${id}`, 30000))
    const data = isObj(payload.data)
    if (isCouncil(data)) return { state: 'ready', data, origin: 'live', at: asTime(payload.fetchedAt) }
  } catch {
    /* fall through */
  }
  try {
    const file = await loadCouncilFile()
    const data = isObj(file[String(id)])
    if (isCouncil(data)) return { state: 'ready', data, origin: 'saved', at: asTime(isObj(await Promise.resolve(file)).savedAt) }
  } catch {
    councilsCache = null
  }
  return { state: 'error' }
}

export function mergeNational(previous: IecState<NationalResults>, next: IecState<NationalResults>): IecState<NationalResults> {
  if (next.state === 'ready' && next.origin === 'live') return next
  if (previous.state === 'ready' && previous.origin === 'live') return { ...previous, missed: true }
  return next.state === 'ready' ? next : previous
}

// -- subscribe/store shared across components -------------------------------
let nationalState: IecState<NationalResults> = { state: 'loading' }
let lastLoadedAt = 0
const listeners = new Set<() => void>()
let inflight: Promise<void> | null = null

function emit(): void {
  listeners.forEach((listener) => listener())
}

export function subscribeNational(): () => void {
  listeners.add(() => {})
  listeners.add(emit)
  return () => listeners.delete(emit)
}

export function refreshNational(): Promise<void> {
  inflight ??= loadNational()
    .then((next) => {
      nationalState = mergeNational(nationalState, next)
      lastLoadedAt = Date.now()
      emit()
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function getCachedNational(): IecState<NationalResults> {
  return nationalState
}

export function useIecNational(refreshMinutes = 0): { results: IecState<NationalResults>; refreshing: boolean; refresh: () => void } {
  const { useEffect, useState } = requireReact()
  const [results, setResults] = useState<IecState<NationalResults>>(getCachedNational)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const sync = () => setResults(getCachedNational())
    listeners.add(sync)
    return () => {
      listeners.delete(sync)
    }
  }, [])

  useEffect(() => {
    if (Date.now() - lastLoadedAt > 60000) void refreshNational()
  }, [])

  useEffect(() => {
    if (refreshMinutes <= 0) return
    const intervalMs = refreshMinutes * 60000
    const maybe = () => {
      if (!document.hidden && Date.now() - lastLoadedAt >= intervalMs - 5000) void refreshNational()
    }
    const timer = window.setInterval(maybe, intervalMs)
    document.addEventListener('visibilitychange', maybe)
    window.addEventListener('online', maybe)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', maybe)
      window.removeEventListener('online', maybe)
    }
  }, [refreshMinutes])

  const refresh = () => {
    setRefreshing(true)
    void refreshNational().finally(() => setRefreshing(false))
  }

  return { results, refreshing, refresh }
}

export async function computePartyProbe(partyId: number): Promise<IecState<PartyProbe>> {
  try {
    const payload = isObj(await fetchJson(`/api/iec?party=${partyId}`, 20000))
    const data = isObj(payload.data)
    if (isPartyProbe(data)) return { state: 'ready', data, origin: 'live', at: asTime(payload.fetchedAt) }
  } catch {
    /* fall through */
  }
  try {
    const [councils, national] = await Promise.all([loadCouncilFile(), fetchJson('/iec-national.json', 15000).then(isObj).catch(() => isObj(null))])
    const pending = new Set<number>(
      isNational(isObj(national).data) ? (isObj(isObj(national).data) as unknown as NationalResults).councils.filter((c) => c.status === 'pending').map((c) => c.id) : [],
    )
    const probe = buildPartyProbe(councils as Record<string, unknown>, partyId, pending)
    if (probe) return { state: 'ready', data: probe, origin: 'saved', at: asTime((councils as { savedAt?: number }).savedAt) }
  } catch {
    councilsCache = null
  }
  return { state: 'error' }
}

export function buildPartyProbe(councils: Record<string, unknown>, partyId: number, pending: Set<number>): PartyProbe | null {
  const rows: PartyProbe['councils'] = []
  const provinces = new Map<string, { valid: number; votes: number; seats: number; led: number; majorities: number; stood: boolean }>()
  let name = ''
  let totalVotes = 0
  for (const raw of Object.values(councils)) {
    if (!isCouncil(raw)) continue
    const council = raw
    const valid = council.parties.reduce((sum, p) => sum + p.votes, 0)
    totalVotes += valid
    const province = provinces.get(council.province) ?? { valid: 0, votes: 0, seats: 0, led: 0, majorities: 0, stood: false }
    province.valid += valid
    provinces.set(council.province, province)
    const party = council.parties.find((p) => p.id === partyId)
    if (!party) continue
    if (!name) name = party.name
    const rivals = council.parties.filter((p) => p.id !== 0 && p.id !== partyId).map((p) => p.seats)
    const leads = party.seats > 0 && party.seats > Math.max(0, ...rivals) && !pending.has(council.id)
    const majority = party.seats * 2 > council.seats
    province.stood = true
    province.votes += party.votes
    province.seats += party.seats
    if (leads) province.led += 1
    if (majority) province.majorities += 1
    rows.push({
      id: council.id,
      code: council.code,
      name: council.name,
      province: council.province,
      votes: party.votes,
      share: valid > 0 ? (party.votes / valid) * 100 : 0,
      wardSeats: party.wardSeats,
      seats: party.seats,
      councilSeats: council.seats,
      leads,
    })
  }
  if (!rows.length) return null
  const votes = rows.reduce((sum, r) => sum + r.votes, 0)
  const stood = [...provinces.entries()].filter(([, p]) => p.stood)
  return {
    id: partyId,
    name,
    votes,
    share: totalVotes > 0 ? (votes / totalVotes) * 100 : 0,
    wardSeats: rows.reduce((sum, r) => sum + r.wardSeats, 0),
    seats: rows.reduce((sum, r) => sum + r.seats, 0),
    councilsLed: stood.reduce((sum, [, p]) => sum + p.led, 0),
    majorities: stood.reduce((sum, [, p]) => sum + p.majorities, 0),
    provinces: stood.map(([name_, p]) => ({ name: name_, votes: p.votes, share: p.valid > 0 ? (p.votes / p.valid) * 100 : 0, seats: p.seats, councilsLed: p.led, majorities: p.majorities })),
    councils: rows,
  }
}

export async function loadLargest(): Promise<IecState<LargestMap>> {
  try {
    const payload = isObj(await fetchJson('/api/iec?largest=1', 20000))
    const data = isObj(payload.data)
    const entries = Object.entries(data)
    if (entries.length > 0) return { state: 'ready', data: entries as unknown as LargestMap, origin: 'live', at: asTime(payload.fetchedAt) }
  } catch {
    /* fall through */
  }
  try {
    const file = (await loadCouncilFile()) as unknown as { savedAt?: number }
    const councils = isObj(isObj(file).councils)
    const out: LargestMap = {}
    for (const raw of Object.values(councils)) {
      if (!isCouncil(raw)) continue
      out[String(raw.id)] = raw.parties
        .filter((p) => p.id > 0 && p.seats > 0)
        .sort((a, b) => b.seats - a.seats)
        .slice(0, 3)
        .map((p) => ({ id: p.id, name: p.name, seats: p.seats }))
    }
    if (Object.keys(out).length > 0) return { state: 'ready', data: out, origin: 'saved', at: asTime(file.savedAt) }
  } catch {
    councilsCache = null
  }
  return { state: 'error' }
}

export interface PartyMeta {
  id: number
  name: string
  abbrev?: string
  leader?: string
}

let partiesPromise: Promise<PartyMeta[]> | null = null
export function loadPartyList(): Promise<PartyMeta[]> {
  partiesPromise ??= fetchJson('/iec-parties.json', 15000)
    .then((raw) => {
      const list = isObj(raw).parties
      return Array.isArray(list)
        ? list
            .filter((p) => typeof isObj(p).id === 'number' && typeof isObj(p).name === 'string')
            .map((p) => ({ id: isObj(p).id as number, name: isObj(p).name as string, abbrev: typeof isObj(p).abbrev === 'string' ? (isObj(p).abbrev as string) : undefined }))
        : []
    })
    .catch(() => {
      partiesPromise = null
      return []
    })
  return partiesPromise
}

// Minimal react import shim so this module stays dependency-light.
import * as React from 'react'
function requireReact(): typeof React {
  return React
}

/** Seats needed for an outright majority on a council. */
export const majorityOf = (seats: number): number => Math.floor(seats / 2) + 1

export interface Coalition {
  members: { id: number; name: string; seats: number }[]
  seats: number
}

export function possibleCoalitions(parties: { id: number; name: string; seats: number }[], seats: number, maxMembers = 4, limit = 20000): { coalitions: Coalition[]; truncated: boolean } {
  const ranked = parties
    .filter((p) => p.seats > 0)
    .sort((a, b) => b.seats - a.seats || a.name.localeCompare(b.name))
  const prefix = [0]
  for (const party of ranked) prefix.push(prefix[prefix.length - 1] + party.seats)
  const window = (start: number, size: number): number => prefix[Math.min(ranked.length, start + size)] - prefix[Math.min(ranked.length, start)]
  const coalitions: Coalition[] = []
  let truncated = false
  const walk = (start: number, members: { id: number; name: string; seats: number }[], total: number): void => {
    for (let i = start; i < ranked.length; i++) {
      if (coalitions.length >= limit) {
        truncated = true
        return
      }
      const party = ranked[i]
      const next = total + party.seats
      if (next >= seats) {
        coalitions.push({ members: [...members, party], seats: next })
        continue
      }
      const remaining = maxMembers - members.length - 1
      if (remaining <= 0 || next + window(i + 1, remaining) < seats) break
      walk(i + 1, [...members, party], next)
    }
  }
  if (seats > 0 && maxMembers > 0) walk(0, [], 0)
  coalitions.sort(
    (a, b) =>
      a.members.length - b.members.length ||
      b.seats - a.seats ||
      a.members.map((m) => m.name).join().localeCompare(b.members.map((m) => m.name).join()),
  )
  return { coalitions, truncated }
}
