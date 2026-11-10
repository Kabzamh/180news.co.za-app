import type { FeedDef, Publisher, SectionDef, SectionId } from './types'

export const SECTIONS: SectionDef[] = [
  { id: 'south-africa', label: 'South Africa' },
  { id: 'politics', label: 'Politics' },
  { id: 'business', label: 'Business' },
  { id: 'sport', label: 'Sport' },
  { id: 'world', label: 'World' },
  { id: 'africa', label: 'Africa' },
  { id: 'tech', label: 'Tech' },
  { id: 'life', label: 'Life' },
  { id: 'opinion', label: 'Opinions' },
]

export const SECTION_BY_ID: Record<SectionId, SectionDef> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s]),
) as Record<SectionId, SectionDef>

export const PUBLISHERS: Record<string, Publisher> = {
  iol: { id: 'iol', name: 'IOL', home: 'https://iol.co.za' },
  dm: { id: 'dm', name: 'Daily Maverick', home: 'https://www.dailymaverick.co.za' },
  citizen: { id: 'citizen', name: 'The Citizen', home: 'https://www.citizen.co.za' },
  sabc: { id: 'sabc', name: 'SABC News', home: 'https://www.sabcnews.com' },
  groundup: { id: 'groundup', name: 'GroundUp', home: 'https://groundup.org.za' },
  moneyweb: { id: 'moneyweb', name: 'Moneyweb', home: 'https://www.moneyweb.co.za' },
  sarugby: { id: 'sarugby', name: 'SA Rugby magazine', home: 'https://www.sarugbymag.co.za' },
  bbc: { id: 'bbc', name: 'BBC News', home: 'https://www.bbc.co.uk/news' },
  aljazeera: { id: 'aljazeera', name: 'Al Jazeera', home: 'https://www.aljazeera.com' },
  africanews: { id: 'africanews', name: 'Africanews', home: 'https://www.africanews.com' },
  techcentral: { id: 'techcentral', name: 'TechCentral', home: 'https://techcentral.co.za' },
  itweb: { id: 'itweb', name: 'ITWeb', home: 'https://www.itweb.co.za' },
}

/**
 * Daily Maverick stamps item dates with South African local time but labels
 * them GMT, which would put every story two hours in the future.
 */
const DM_DATE_FIX = -2 * 60 * 60 * 1000
const dm = { sourceId: 'dm', dateFixMs: DM_DATE_FIX } as const
/** IOL rate-limits aggressively, so its feeds are re-read less often. */
const iol = { sourceId: 'iol', ttlSeconds: 300 } as const
/** SABC's image host blocks embedding from other sites. */
const sabc = { sourceId: 'sabc', noImages: true } as const

export const FEEDS: FeedDef[] = [
  // South Africa
  { id: 'iol-sa', ...iol, section: 'south-africa', url: 'https://iol.co.za/rss/iol/news/south-africa/' },
  { id: 'dm-main', ...dm, section: 'south-africa', url: 'https://www.dailymaverick.co.za/dmrss/' },
  { id: 'citizen-sa', sourceId: 'citizen', section: 'south-africa', url: 'https://www.citizen.co.za/news/south-africa/feed/' },
  { id: 'sabc-sa', ...sabc, section: 'south-africa', url: 'https://www.sabcnews.com/sabcnews/category/south-africa/feed/' },
  { id: 'groundup', sourceId: 'groundup', section: 'south-africa', url: 'https://groundup.org.za/sitenews/rss/' },
  // Politics
  { id: 'dm-politics', ...dm, section: 'politics', url: 'https://www.dailymaverick.co.za/dmrss/?section=politics' },
  { id: 'citizen-politics', sourceId: 'citizen', section: 'politics', url: 'https://www.citizen.co.za/news/south-africa/politics/feed/' },
  { id: 'sabc-politics', ...sabc, section: 'politics', url: 'https://www.sabcnews.com/sabcnews/category/politics/feed/' },
  // Business
  { id: 'iol-business', ...iol, section: 'business', url: 'https://iol.co.za/rss/iol/business/' },
  { id: 'moneyweb', sourceId: 'moneyweb', section: 'business', url: 'https://www.moneyweb.co.za/feed/' },
  { id: 'dm-business', ...dm, section: 'business', url: 'https://www.dailymaverick.co.za/dmrss/?section=business-maverick' },
  { id: 'citizen-business', sourceId: 'citizen', section: 'business', url: 'https://www.citizen.co.za/business/feed/' },
  // Sport
  { id: 'iol-sport', ...iol, section: 'sport', url: 'https://iol.co.za/rss/iol/sport/' },
  { id: 'citizen-sport', sourceId: 'citizen', section: 'sport', url: 'https://www.citizen.co.za/sport/feed/' },
  { id: 'dm-sport', ...dm, section: 'sport', url: 'https://www.dailymaverick.co.za/dmrss/?section=sport' },
  { id: 'sarugby', sourceId: 'sarugby', section: 'sport', url: 'https://www.sarugbymag.co.za/feed/' },
  // World
  { id: 'bbc-world', sourceId: 'bbc', section: 'world', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'dm-world', ...dm, section: 'world', url: 'https://www.dailymaverick.co.za/dmrss/?section=world' },
  { id: 'aljazeera', sourceId: 'aljazeera', section: 'world', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  // Africa
  { id: 'bbc-africa', sourceId: 'bbc', section: 'africa', url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml' },
  { id: 'africanews', sourceId: 'africanews', section: 'africa', url: 'https://www.africanews.com/feed/rss' },
  // Tech
  { id: 'techcentral', sourceId: 'techcentral', section: 'tech', ttlSeconds: 300, url: 'https://techcentral.co.za/feed/' },
  { id: 'itweb', sourceId: 'itweb', section: 'tech', ttlSeconds: 300, url: 'https://www.itweb.co.za/rss' },
  // Life
  { id: 'iol-lifestyle', ...iol, section: 'life', ttlSeconds: 600, url: 'https://iol.co.za/rss/iol/lifestyle/' },
  { id: 'iol-entertainment', ...iol, section: 'life', ttlSeconds: 600, url: 'https://iol.co.za/rss/iol/entertainment/' },
  { id: 'dm-life', ...dm, section: 'life', ttlSeconds: 600, url: 'https://www.dailymaverick.co.za/dmrss/?section=maverick-life' },
  { id: 'citizen-lifestyle', sourceId: 'citizen', section: 'life', ttlSeconds: 600, url: 'https://www.citizen.co.za/lifestyle/feed/' },
  // Opinions
  { id: 'dm-opinion', ...dm, section: 'opinion', ttlSeconds: 900, url: 'https://www.dailymaverick.co.za/dmrss/?section=opinionistas' },
  { id: 'citizen-opinion', sourceId: 'citizen', section: 'opinion', ttlSeconds: 900, url: 'https://www.citizen.co.za/news/opinion/feed/' },
  { id: 'iol-opinion', ...iol, section: 'opinion', ttlSeconds: 900, url: 'https://iol.co.za/rss/iol/opinion/' },
]

export const DEFAULT_TTL_SECONDS = 150

export function feedTtlSeconds(feed: FeedDef): number {
  return feed.ttlSeconds ?? DEFAULT_TTL_SECONDS
}

export const FEED_BY_ID: Record<string, FeedDef> = Object.fromEntries(FEEDS.map((f) => [f.id, f]))

export function feedsForSection(section: SectionId): FeedDef[] {
  return FEEDS.filter((f) => f.section === section)
}

export function publisherName(sourceId: string): string {
  return PUBLISHERS[sourceId]?.name ?? 'Source'
}
