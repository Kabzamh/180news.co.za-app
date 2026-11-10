import {
  PROVINCE_IDS,
  councilFileUrl,
  isCouncilId,
  isPartyId,
  nationalFileUrl,
  parseCouncil,
  parseLargest,
  parseNational,
  parseParty,
  partyFileUrl,
  provinceFileUrl,
} from '../lib/iec'

/**
 * GET /api/iec              national results and one line per council
 * GET /api/iec?council=3003 one council's party votes and seats
 * GET /api/iec?party=7      one party's results nationally, by province and by council
 * GET /api/iec?largest=1    the three largest parties on every council
 *
 * Reads the Electoral Commission's public results files server-side (they do
 * not send CORS headers, and a council file can be 17 MB) and returns compact
 * JSON. Only the IEC's own results files can be reached through it.
 * Bundled to api/iec.js by `npm run build:api`.
 */

interface Req {
  url?: string
  method?: string
}
interface Res {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 180news/1.0 (+https://180news.co.za)'
const KEEP_ON_ERROR_MS = 6 * 60 * 60 * 1000

interface Target {
  key: string
  /** Seconds a fetched copy is reused before the IEC is asked again. */
  ttl: number
  timeoutMs: number
  /** One file, or several that are read together. */
  urls: string[]
  parse: (texts: string[]) => unknown
}

/** Which IEC file a request is for, or why it cannot be served. */
function targetFor(params: URLSearchParams): Target | { error: string } {
  const council = params.get('council')
  if (council !== null) {
    const id = /^\d{4}$/.test(council) ? Number(council) : NaN
    if (!isCouncilId(id)) return { error: 'council must be a four-digit IEC municipality id' }
    return { key: `council-${id}`, ttl: 600, timeoutMs: 25_000, urls: [councilFileUrl(id)], parse: ([text]) => parseCouncil(text, id) }
  }
  const party = params.get('party')
  if (party !== null) {
    const id = /^\d{1,5}$/.test(party) ? Number(party) : NaN
    if (!isPartyId(id)) return { error: 'party must be an IEC party id' }
    return { key: `party-${id}`, ttl: 300, timeoutMs: 15_000, urls: [partyFileUrl(id)], parse: ([text]) => parseParty(JSON.parse(text), id) }
  }
  if (params.get('largest') !== null) {
    return { key: 'largest', ttl: 300, timeoutMs: 12_000, urls: PROVINCE_IDS.map(provinceFileUrl), parse: (texts) => parseLargest(texts.map((text) => JSON.parse(text) as unknown)) }
  }
  return { key: 'national', ttl: 120, timeoutMs: 12_000, urls: [nationalFileUrl()], parse: ([text]) => parseNational(JSON.parse(text)) }
}

class HttpError extends Error {
  status: number
  constructor(status: number) {
    super(`HTTP ${status}`)
    this.status = status
  }
}

/** A warm instance keeps its last good answers, to spare the IEC repeat requests and to cover for it when one fails. */
const memory = new Map<string, { at: number; data: unknown }>()
const inFlight = new Map<string, Promise<unknown>>()

async function download(url: string, timeoutMs: number): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new HttpError(res.status)
  return (await res.text()).replace(/^\uFEFF/, '')
}

function load(target: Target): Promise<unknown> {
  const running = inFlight.get(target.key)
  if (running) return running
  const job = Promise.all(target.urls.map((url) => download(url, target.timeoutMs)))
    .then((texts) => {
      const data = target.parse(texts)
      memory.set(target.key, { at: Date.now(), data })
      return data
    })
    .finally(() => inFlight.delete(target.key))
  inFlight.set(target.key, job)
  return job
}

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('X-Content-Type-Options', 'nosniff')

  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET, HEAD')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  let params = new URLSearchParams()
  try {
    params = new URL(req.url ?? '/', 'http://localhost').searchParams
  } catch {
    /* treated as a request for the national results */
  }
  const target = targetFor(params)
  if ('error' in target) {
    res.statusCode = 400
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify({ error: target.error }))
    return
  }

  const { key, ttl } = target
  const kept = memory.get(key)

  if (kept && Date.now() - kept.at < ttl * 1000) {
    res.statusCode = 200
    res.setHeader('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 5}`)
    res.end(JSON.stringify({ fetchedAt: kept.at, data: kept.data }))
    return
  }

  try {
    const data = await load(target)
    res.statusCode = 200
    res.setHeader('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 5}`)
    res.end(JSON.stringify({ fetchedAt: Date.now(), data }))
  } catch (err) {
    // An older copy, with the time it was really fetched, is better than nothing.
    if (kept && Date.now() - kept.at < KEEP_ON_ERROR_MS) {
      res.statusCode = 200
      res.setHeader('Cache-Control', 'public, s-maxage=30')
      res.end(JSON.stringify({ fetchedAt: kept.at, data: kept.data }))
      return
    }
    // The IEC has no file for an id that did not stand in these elections.
    if (err instanceof HttpError && err.status === 404) {
      res.statusCode = 404
      res.setHeader('Cache-Control', 'public, s-maxage=300')
      res.end(JSON.stringify({ error: 'The IEC has no results for that id' }))
      return
    }
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
    res.statusCode = 502
    res.setHeader('Cache-Control', 'public, s-maxage=15')
    res.end(JSON.stringify({ error: timedOut ? 'The IEC results system timed out' : 'The IEC results system could not be read' }))
  }
}
