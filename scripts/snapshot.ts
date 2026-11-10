import { mkdirSync, writeFileSync } from 'node:fs'
import { describeError, fetchFeed } from '../src/lib/feed/fetchFeed'
import { FEEDS } from '../src/lib/feed/sources'
import type { Snapshot } from '../src/lib/feed/types'

/**
 * Saves a real copy of every feed to public/snapshot.json. The app only falls
 * back to it when the live feeds cannot be reached, and labels it as saved.
 */
const snapshot: Snapshot = { generatedAt: Date.now(), feeds: {} }

await Promise.all(
  FEEDS.map(async (feed) => {
    try {
      const items = await fetchFeed(feed, 14, 20000)
      snapshot.feeds[feed.id] = items
      const withImages = items.filter((i) => i.image).length
      console.log(`ok   ${feed.id.padEnd(18)} ${String(items.length).padStart(2)} stories, ${withImages} with images`)
    } catch (err) {
      console.log(`FAIL ${feed.id.padEnd(18)} ${describeError(err)}`)
    }
  }),
)

mkdirSync('public', { recursive: true })
writeFileSync('public/snapshot.json', JSON.stringify(snapshot))
console.log(`\nSaved ${Object.keys(snapshot.feeds).length}/${FEEDS.length} feeds to public/snapshot.json`)
