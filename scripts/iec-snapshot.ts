import { mkdirSync, writeFileSync } from 'node:fs'
import { councilFileUrl, nationalFileUrl, parseCouncil, parseNational, parseParty, partyFileUrl } from '../src/lib/iec'
import type { CouncilResults } from '../src/lib/iec'
import { calculateSeats, seatPartiesFor } from '../src/lib/seats'

/**
 * Saves a real copy of the IEC results to public/. The app only falls back to
 * it when the IEC cannot be reached, and labels it as saved. It also runs the
 * seat calculation over every council and reports how many agree with the
 * seats the IEC declared.
 */
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 180news/1.0 (+https://180news.co.za)'

async function download(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(90_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.text()).replace(/^\uFEFF/, '')
}

const savedAt = Date.now()
const national = parseNational(JSON.parse(await download(nationalFileUrl())))
console.log(`national: ${national.parties.length} party rows, ${national.councils.length} councils`)

const councils: Record<string, CouncilResults> = {}
const queue = [...national.councils]
const failed: string[] = []
await Promise.all(
  Array.from({ length: 8 }, async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      try {
        councils[c.id] = parseCouncil(await download(councilFileUrl(c.id)), c.id)
      } catch (err) {
        failed.push(`${c.name}: ${err instanceof Error ? err.message : err}`)
      }
    }
  }),
)

let agree = 0
let complete = 0
const differ: string[] = []
for (const council of Object.values(councils)) {
  if (council.seatsAllocated !== council.seats) continue
  complete += 1
  const calc = calculateSeats(council.seats, seatPartiesFor(council))
  const declared = new Map(council.parties.map((p) => [String(p.id), p.seats]))
  const off = calc.ok ? calc.result.rows.filter((r) => r.total !== declared.get(r.key)) : null
  if (off && off.length === 0) agree += 1
  else differ.push(`${council.name} (${council.districtsPct}% of districts counted): ${off ? off.map((r) => `${r.name} IEC ${declared.get(r.key)} / calculated ${r.total}`).join('; ') : 'could not be calculated'}`)
}

mkdirSync('public', { recursive: true })
writeFileSync('public/iec-national.json', JSON.stringify({ savedAt, data: national }))
writeFileSync('public/iec-councils.json', JSON.stringify({ savedAt, councils }))

// Every party that stood, for the party picker. Who stood does not change after election day.
const names = new Map<number, string>()
for (const council of Object.values(councils)) for (const p of council.parties) if (p.id > 0 && !names.has(p.id)) names.set(p.id, p.name)
const parties = [...names].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
writeFileSync('public/iec-parties.json', JSON.stringify({ savedAt, parties }))
console.log(`parties that stood: ${parties.length}`)

// The IEC's own per-party files should add up to the same figures as the council files.
for (const id of [national.parties[0].id, national.parties[4].id, parties[Math.floor(parties.length / 2)].id]) {
  const detail = parseParty(JSON.parse(await download(partyFileUrl(id))), id)
  const rows = Object.values(councils).flatMap((c) => c.parties.filter((p) => p.id === id))
  const votes = rows.reduce((sum, p) => sum + p.votes, 0)
  const seats = rows.reduce((sum, p) => sum + p.seats, 0)
  const same = detail.councils.length === rows.length && detail.votes === votes && detail.seats === seats
  console.log(`  party file check, ${detail.name}: ${detail.councils.length} councils, ${detail.votes} votes, ${detail.seats} seats — ${same ? 'agrees with the council files' : `council files give ${rows.length} councils, ${votes} votes, ${seats} seats`}`)
}
console.log(`councils saved: ${Object.keys(councils).length}/${national.councils.length}${failed.length ? ` (failed: ${failed.join(', ')})` : ''}`)
console.log(`seat calculation agrees with the IEC's declared seats in ${agree} of the ${complete} councils whose seats are all allocated`)
for (const line of differ) console.log(`  differs: ${line}`)
