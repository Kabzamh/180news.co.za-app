/**
 * Results of the 2026 Local Government Elections, read from the files behind the
 * Electoral Commission's public results dashboard. Shared by the serverless
 * endpoint, the saved-copy script and the browser so all three read the files
 * the same way.
 */

export const IEC_EVENT = { year: 2026, id: 1887, name: '2026 Local Government Elections' }
export const IEC_DASHBOARD = 'https://results.elections.org.za/dashboards/lge/'

const FILES = `${IEC_DASHBOARD}MapsJason/${IEC_EVENT.year}/EEID${IEC_EVENT.id}`
export const nationalFileUrl = () => `${FILES}LiteMapsNational.js`
export const councilFileUrl = (id: number) => `${FILES}Munic${id}.js`
export const partyFileUrl = (id: number) => `${FILES}Party${id}.js`
/** One file per province (1 to 9), each listing the three parties with the most seats on every council in it. */
export const PROVINCE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
export const provinceFileUrl = (id: number) => `${FILES}Province${id}.js`

/** Municipality ids in the IEC files are four digits, the first being the province. */
export const isCouncilId = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1000 && value <= 9999

/** IEC party ids are positive whole numbers; 0 and below are the grouped rows (independents, "other"). */
export const isPartyId = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 99999

export interface PartyCouncil {
  id: number
  code: string
  name: string
  province: string
  votes: number
  /** Percentage of the council's valid votes. */
  share: number
  wardSeats: number
  seats: number
  councilSeats: number
  /** Has the most seats on the council. */
  leads: boolean
}

export interface PartyProvince {
  name: string
  votes: number
  share: number
  seats: number
  councilsLed: number
  majorities: number
}

export interface PartyDetail {
  id: number
  name: string
  reportedAt: number | null
  votes: number
  share: number
  wardSeats: number
  seats: number
  councilsLed: number
  majorities: number
  provinces: PartyProvince[]
  councils: PartyCouncil[]
}

export interface PartyResult {
  /** IEC party id. 0 is independent candidates taken together; -2 is "other parties" in the national table. */
  id: number
  name: string
  /** Valid votes on the ward and PR ballots together. */
  votes: number
  prVotes: number
  wardSeats: number
  /** Ward and PR list seats together. */
  seats: number
  /** National table only: councils where the party has the most seats, and those where it has more than half. */
  councilsLed?: number
  majorities?: number
}

export interface CouncilSummary {
  id: number
  code: string
  name: string
  province: string
  seats: number
  seatsAllocated: number
  /** Percentage of voting districts counted. */
  districtsPct: number
  status: 'majority' | 'hung' | 'pending'
  leader: { name: string; share: number; seats: number } | null
}

export interface NationalResults {
  /** When the IEC produced the figures, epoch milliseconds. */
  reportedAt: number | null
  totals: {
    councils: number
    councilsComplete: number
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
  councils: CouncilSummary[]
}

export interface CouncilResults {
  id: number
  code: string
  name: string
  province: string
  reportedAt: number | null
  seats: number
  wards: number
  seatsAllocated: number
  districtsPct: number
  parties: PartyResult[]
}

type Raw = Record<string, unknown>
const obj = (value: unknown): Raw => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : {})
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)
const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/** "2026-11-10T19:44:04.0800522+02:00" -> epoch milliseconds. */
function reportTime(value: unknown): number | null {
  const ms = Date.parse(str(value).replace(/(\.\d{3})\d+/, '$1'))
  return Number.isNaN(ms) ? null : ms
}

const SMALL_WORDS = new Set(['of', 'the', 'for', 'and', 'in', 'to', 'a', 'on'])
const titleCase = (text: string) =>
  text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => (i > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')

const PARTY_NAMES: Record<string, string> = {
  ACTIONSA: 'ActionSA',
  'UMKHONTO WESIZWE PARTY': 'uMkhonto weSizwe Party',
  'AL JAMA-AH': 'Al Jama-ah',
}

/** The IEC writes party names in capitals; this gives them ordinary casing. */
export function partyName(id: number, raw: string): string {
  if (id === 0) return 'Independent candidates'
  if (id === -2) return 'Other parties'
  // Two-language names ("VRYHEIDSFRONT PLUS | FREEDOM FRONT PLUS") are shown in English.
  const name = raw.includes('|') ? raw.slice(raw.lastIndexOf('|') + 1).trim() : raw.trim()
  return PARTY_NAMES[name.toUpperCase()] ?? titleCase(name)
}

/** "NC085 - TSANTSABANE" -> { code: 'NC085', name: 'Tsantsabane' } */
export function councilName(raw: string): { code: string; name: string } {
  const at = raw.indexOf(' - ')
  const code = at > 0 ? raw.slice(0, at).trim() : ''
  const name = (at > 0 ? raw.slice(at + 3) : raw).trim()
  return { code, name: name && name === name.toUpperCase() ? titleCase(name) : name }
}

function party(value: unknown, national: boolean): PartyResult {
  const r = obj(value)
  const id = num(r.ID)
  return {
    id,
    name: partyName(id, str(r.Name)),
    votes: num(r.TotalValidVotes),
    prVotes: num(r.PRVotes),
    wardSeats: num(r.WardSeatsWon),
    seats: num(r.TotalSeatsWon),
    ...(national ? { councilsLed: num(r.CouncilsWon), majorities: num(r.MajorityWon) } : {}),
  }
}

/** Named parties by votes, then "other parties" and independents. */
function byVotes(a: PartyResult, b: PartyResult): number {
  const rank = (p: PartyResult) => (p.id === 0 ? 2 : p.id === -2 ? 1 : 0)
  return rank(a) - rank(b) || b.votes - a.votes
}

/** The national file: totals, the national party table and one line per council. */
export function parseNational(raw: unknown): NationalResults {
  const root = obj(raw)
  const partyRows = list(root.PartyBallotResults)
  const provinces = list(root.ProvinceResults)
  if (partyRows.length === 0 || provinces.length === 0) throw new Error('Unexpected IEC results file')

  const councils: CouncilSummary[] = []
  for (const entry of provinces) {
    const province = obj(entry)
    for (const item of list(province.MunicipalityResults)) {
      const m = obj(item)
      const id = num(m.MunicipalityID)
      if (!isCouncilId(id)) continue
      const top = obj(list(m.PartyBallotResults)[0])
      const topId = num(top.ID)
      councils.push({
        id,
        ...councilName(str(m.Municipality)),
        province: str(m.Province) || str(province.Province),
        seats: num(m.SeatsExpected),
        seatsAllocated: num(m.SeatsComplete),
        districtsPct: num(m.Perc_VDsComplete),
        status: num(m.MajorityCouncils) > 0 ? 'majority' : num(m.HungCouncils) > 0 ? 'hung' : 'pending',
        leader: str(top.Name) ? { name: partyName(topId, str(top.Name)), share: num(top.PercOfVotes), seats: num(top.TotalSeatsWon) } : null,
      })
    }
  }
  if (councils.length === 0) throw new Error('Unexpected IEC results file')
  councils.sort((a, b) => a.name.localeCompare(b.name))

  const first = obj(partyRows[0])
  return {
    reportedAt: reportTime(root.ReportDate),
    totals: {
      councils: num(root.MunicExpected),
      councilsComplete: num(root.MuncipalitiesComplete),
      majority: num(root.MajorityCouncils),
      hung: num(root.HungCouncils),
      seats: num(root.SeatsExpected),
      seatsAllocated: num(root.SeatsComplete),
      districts: num(root.VDExpected),
      districtsCounted: num(root.VDsComplete),
      registered: num(root.RegPop),
      validVotes: num(first.ValidVotesCast),
      spoiltVotes: num(first.SpoiltVotes),
    },
    parties: partyRows.map((p) => party(p, true)).sort(byVotes),
    councils,
  }
}

/**
 * One council's file. These run to many megabytes because they carry every
 * ward and voting district; the council-wide party table is the last thing in
 * the file, so only the end is parsed.
 */
export function parseCouncil(text: string, id: number): CouncilResults {
  const at = text.lastIndexOf('"PartyBallotResults":')
  if (at < 0) throw new Error('Unexpected IEC council file')
  const tail = obj(JSON.parse(`{${text.slice(at)}`))
  const parties = list(tail.PartyBallotResults).map((p) => party(p, false))
  if (parties.length === 0) throw new Error('Unexpected IEC council file')

  const head = text.slice(0, 800)
  const field = (name: string) => new RegExp(`"${name}":"([^"]*)"`).exec(head)?.[1] ?? ''
  return {
    id,
    ...councilName(field('Municipality')),
    province: field('Province'),
    reportedAt: reportTime(field('ReportDate')),
    seats: num(tail.SeatsExpected),
    wards: num(tail.WardExpected),
    seatsAllocated: num(tail.SeatsComplete),
    districtsPct: num(tail.Perc_VDsComplete),
    parties: parties.sort(byVotes),
  }
}

export interface LargestParty {
  id: number
  name: string
  seats: number
}

/** Council id -> the parties with the most seats there, largest first (three, as the IEC publishes them). */
export type LargestParties = Record<string, LargestParty[]>

/** Province files -> the largest parties on each council. */
export function parseLargest(files: unknown[]): LargestParties {
  const out: LargestParties = {}
  for (const file of files) {
    for (const item of list(obj(file).MunicipalityResults)) {
      const m = obj(item)
      const id = num(m.MunicipalityID)
      if (!isCouncilId(id)) continue
      out[id] = list(m.PartyBallotResults)
        .map(obj)
        .filter((p) => num(p.ID) > 0)
        .map((p) => ({ id: num(p.ID), name: partyName(num(p.ID), str(p.Name)), seats: num(p.TotalSeatsWon) }))
        .sort((a, b) => b.seats - a.seats)
    }
  }
  if (Object.keys(out).length === 0) throw new Error('Unexpected IEC province files')
  return out
}

export function isLargestParties(value: unknown): value is LargestParties {
  const entries = Object.entries(obj(value))
  return (
    entries.length > 0 &&
    entries.every(([id, parties]) => isCouncilId(Number(id)) && Array.isArray(parties) && parties.every((p) => typeof obj(p).name === 'string' && typeof obj(p).seats === 'number'))
  )
}

/** One party's file: its national line, a line per province and a line for every council it stood in. */
export function parseParty(raw: unknown, id: number): PartyDetail {
  const root = obj(raw)
  const own = (rows: unknown) => list(rows).map(obj).find((p) => num(p.ID) === id)
  const national = own(root.PartyBallotResults)
  if (!national) throw new Error('Unexpected IEC party file')

  const provinces: PartyProvince[] = []
  const councils: PartyCouncil[] = []
  for (const entry of list(root.ProvinceResults)) {
    const province = obj(entry)
    const line = own(province.PartyBallotResults)
    if (line) {
      provinces.push({
        name: str(province.Province),
        votes: num(line.TotalValidVotes),
        share: num(line.PercOfVotes),
        seats: num(line.TotalSeatsWon),
        councilsLed: num(line.CouncilsWon),
        majorities: num(line.MajorityWon),
      })
    }
    for (const item of list(province.MunicipalityResults)) {
      const m = obj(item)
      const row = own(m.PartyBallotResults)
      const councilId = num(m.MunicipalityID)
      if (!row || !isCouncilId(councilId)) continue
      councils.push({
        id: councilId,
        ...councilName(str(m.Municipality)),
        province: str(m.Province) || str(province.Province),
        votes: num(row.TotalValidVotes),
        share: num(row.PercOfVotes),
        wardSeats: num(row.WardSeatsWon),
        seats: num(row.TotalSeatsWon),
        councilSeats: num(row.AvailableSeats),
        leads: row.IsCouncilWinner === true,
      })
    }
  }

  const valid = num(national.ValidVotesCast)
  const votes = num(national.TotalValidVotes)
  return {
    id,
    name: partyName(id, str(national.Name)),
    reportedAt: reportTime(root.ReportDate),
    votes,
    share: valid > 0 ? (votes / valid) * 100 : num(national.PercOfVotes),
    wardSeats: num(national.WardSeatsWon),
    seats: num(national.TotalSeatsWon),
    councilsLed: num(national.CouncilsWon),
    majorities: num(national.MajorityWon),
    provinces,
    councils,
  }
}

export function isPartyDetail(value: unknown): value is PartyDetail {
  const v = obj(value)
  const numeric = (o: Raw, keys: string[]) => keys.every((k) => typeof o[k] === 'number')
  return (
    isPartyId(v.id) &&
    typeof v.name === 'string' &&
    numeric(v, ['votes', 'share', 'wardSeats', 'seats', 'councilsLed', 'majorities']) &&
    Array.isArray(v.provinces) &&
    v.provinces.every((p) => typeof obj(p).name === 'string' && numeric(obj(p), ['votes', 'share', 'seats', 'councilsLed', 'majorities'])) &&
    Array.isArray(v.councils) &&
    v.councils.every((c) => isCouncilId(obj(c).id) && typeof obj(c).name === 'string' && typeof obj(c).province === 'string' && numeric(obj(c), ['votes', 'share', 'wardSeats', 'seats', 'councilSeats']))
  )
}

const isParty = (value: unknown): value is PartyResult => {
  const p = obj(value)
  return typeof p.id === 'number' && typeof p.name === 'string' && typeof p.votes === 'number' && typeof p.prVotes === 'number' && typeof p.wardSeats === 'number' && typeof p.seats === 'number'
}

/** Runtime checks for results arriving from the network or the saved copy. */
export function isNationalResults(value: unknown): value is NationalResults {
  const v = obj(value)
  const t = obj(v.totals)
  return Array.isArray(v.parties) && v.parties.length > 0 && v.parties.every(isParty) && Array.isArray(v.councils) && typeof t.seats === 'number' && typeof t.validVotes === 'number'
}

export function isCouncilResults(value: unknown): value is CouncilResults {
  const v = obj(value)
  return isCouncilId(v.id) && typeof v.name === 'string' && typeof v.seats === 'number' && Array.isArray(v.parties) && v.parties.length > 0 && v.parties.every(isParty)
}
