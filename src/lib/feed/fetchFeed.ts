import { parseFeed } from './parse'
import type { FeedDef, NewsItem } from './types'

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 180news/1.0 (+https://180news.co.za)'

export class FeedError extends Error {
  /** Seconds the publisher asked us to wait, when it said so. */
  retryAfterSeconds?: number
  constructor(message: string, retryAfterSeconds?: number) {
    super(message)
    this.name = 'FeedError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/** Server-side: download one publisher feed and normalise it. */
export async function fetchFeed(feed: FeedDef, limit = 24, timeoutMs = 8000): Promise<NewsItem[]> {
  const res = await fetch(feed.url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) {
    const retryAfter = Number(res.headers.get('retry-after'))
    throw new FeedError(`HTTP ${res.status}`, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined)
  }
  const xml = await res.text()
  const items = parseFeed(xml, feed, limit)
  if (items.length === 0) throw new Error('Feed returned no stories')
  return items
}

export function describeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') return 'Timed out'
    return err.message.slice(0, 120)
  }
  return 'Request failed'
}
