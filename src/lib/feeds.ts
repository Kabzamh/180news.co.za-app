/**
 * Sections, newsroom sources and RSS feeds that power 180news.
 */
export interface SectionDef {
  id: string
  label: string
}

export interface SourceDef {
  id: string
  name: string
  home: string
}

export interface FeedDef {
  id: string
  sourceId: string
  section: string
  url: string
  ttlSeconds?: number
  noImages?: boolean
  dateFixMs?: number
}

export const OWN_SOURCE = '180news'

export const SECTIONS: SectionDef[] = [
  { id: 'elections', label: 'Elections' },
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

export const SECTION_BY_ID: Record<string, SectionDef> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s]),
)

export const SOURCES: Record<string, SourceDef> = {
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

const iolTtl = { sourceId: 'iol', ttlSeconds: 300 }
const dmFix = { sourceId: 'dm', dateFixMs: -7200 * 1000 }
const sabcNoImages = { sourceId: 'sabc', noImages: true }

export const FEEDS: FeedDef[] = [
  { id: 'citizen-elections', sourceId: 'citizen', section: 'elections', url: 'https://www.citizen.co.za/news/south-africa/elections/feed/' },
  { id: 'sabc-elections', ...sabcNoImages, section: 'elections', url: 'https://www.sabcnews.com/sabcnews/tag/elections/feed/' },
  { id: 'iol-sa', ...iolTtl, section: 'south-africa', url: 'https://iol.co.za/rss/iol/news/south-africa/' },
  { id: 'dm-main', ...dmFix, section: 'south-africa', url: 'https://www.dailymaverick.co.za/dmrss/' },
  { id: 'citizen-sa', sourceId: 'citizen', section: 'south-africa', url: 'https://www.citizen.co.za/news/south-africa/feed/' },
  { id: 'sabc-sa', ...sabcNoImages, section: 'south-africa', url: 'https://www.sabcnews.com/sabcnews/category/south-africa/feed/' },
  { id: 'groundup', sourceId: 'groundup', section: 'south-africa', url: 'https://groundup.org.za/sitenews/rss/' },
  { id: 'dm-politics', ...dmFix, section: 'politics', url: 'https://www.dailymaverick.co.za/dmrss/?section=politics' },
  { id: 'citizen-politics', sourceId: 'citizen', section: 'politics', url: 'https://www.citizen.co.za/news/south-africa/politics/feed/' },
  { id: 'sabc-politics', ...sabcNoImages, section: 'politics', url: 'https://www.sabcnews.com/sabcnews/category/politics/feed/' },
  { id: 'iol-business', ...iolTtl, section: 'business', url: 'https://iol.co.za/rss/iol/business/' },
  { id: 'moneyweb', sourceId: 'moneyweb', section: 'business', url: 'https://www.moneyweb.co.za/feed/' },
  { id: 'dm-business', ...dmFix, section: 'business', url: 'https://www.dailymaverick.co.za/dmrss/?section=business-maverick' },
  { id: 'citizen-business', sourceId: 'citizen', section: 'business', url: 'https://www.citizen.co.za/business/feed/' },
  { id: 'iol-sport', ...iolTtl, section: 'sport', url: 'https://iol.co.za/rss/iol/sport/' },
  { id: 'citizen-sport', sourceId: 'citizen', section: 'sport', url: 'https://www.citizen.co.za/sport/feed/' },
  { id: 'dm-sport', ...dmFix, section: 'sport', url: 'https://www.dailymaverick.co.za/dmrss/?section=sport' },
  { id: 'sarugby', sourceId: 'sarugby', section: 'sport', url: 'https://www.sarugbymag.co.za/feed/' },
  { id: 'bbc-world', sourceId: 'bbc', section: 'world', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'dm-world', ...dmFix, section: 'world', url: 'https://www.dailymaverick.co.za/dmrss/?section=world' },
  { id: 'aljazeera', sourceId: 'aljazeera', section: 'world', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { id: 'bbc-africa', sourceId: 'bbc', section: 'africa', url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml' },
  { id: 'africanews', sourceId: 'africanews', section: 'africa', url: 'https://www.africanews.com/feed/rss' },
  { id: 'techcentral', sourceId: 'techcentral', section: 'tech', ttlSeconds: 300, url: 'https://techcentral.co.za/feed/' },
  { id: 'itweb', sourceId: 'itweb', section: 'tech', ttlSeconds: 300, url: 'https://www.itweb.co.za/rss' },
  { id: 'iol-lifestyle', ...iolTtl, section: 'life', ttlSeconds: 600, url: 'https://iol.co.za/rss/iol/lifestyle/' },
  { id: 'iol-entertainment', ...iolTtl, section: 'life', ttlSeconds: 600, url: 'https://iol.co.za/rss/iol/entertainment/' },
  { id: 'dm-life', ...dmFix, section: 'life', ttlSeconds: 600, url: 'https://www.dailymaverick.co.za/dmrss/?section=maverick-life' },
  { id: 'citizen-lifestyle', sourceId: 'citizen', section: 'life', ttlSeconds: 600, url: 'https://www.citizen.co.za/lifestyle/feed/' },
  { id: 'dm-opinion', ...dmFix, section: 'opinion', ttlSeconds: 900, url: 'https://www.dailymaverick.co.za/dmrss/?section=opinionistas' },
  { id: 'citizen-opinion', sourceId: 'citizen', section: 'opinion', ttlSeconds: 900, url: 'https://www.citizen.co.za/news/opinion/feed/' },
  { id: 'iol-opinion', ...iolTtl, section: 'opinion', ttlSeconds: 900, url: 'https://iol.co.za/rss/iol/opinion/' },
]

export const feedsForSection = (section: string): FeedDef[] => FEEDS.filter((f) => f.section === section)

export function sourceName(sourceId: string): string {
  return sourceId === OWN_SOURCE ? '180news' : SOURCES[sourceId]?.name ?? 'Source'
}
