export type SectionId =
  | 'elections'
  | 'south-africa'
  | 'politics'
  | 'business'
  | 'sport'
  | 'world'
  | 'africa'
  | 'tech'
  | 'life'
  | 'opinion'

export interface SectionDef {
  id: SectionId
  label: string
}

export interface Publisher {
  id: string
  name: string
  home: string
}

export interface FeedDef {
  id: string
  url: string
  section: SectionId
  sourceId: string
  /** Correction added to every pubDate, for feeds that label local time as GMT. */
  dateFixMs?: number
  /** The publisher's image host refuses embedding on other sites, so don't try. */
  noImages?: boolean
  /** How long a fetched copy is reused before asking the publisher again. */
  ttlSeconds?: number
}

export interface NewsItem {
  id: string
  title: string
  link: string
  summary: string
  image?: string
  author?: string
  category?: string
  /** Publication time in epoch milliseconds, or null when the feed gave none. */
  published: number | null
  feedId: string
  sourceId: string
  section: SectionId
  /** Full text. Only articles written in the app have it; feed stories link out instead. */
  body?: string
  /** Photos, video and audio attached to an article written in the app. */
  media?: MediaRef[]
  /** YouTube and Facebook links added to an article written in the app. */
  links?: string[]
  /** Topic tags on an article written in the app. */
  tags?: string[]
}

export type MediaKind = 'photo' | 'video' | 'audio'

/** Pointer to a file kept in this browser's media store. */
export interface MediaRef {
  id: string
  kind: MediaKind
  name: string
  type: string
  size: number
  /** Seconds, for video and audio, when the file says. */
  duration?: number
  caption?: string
}

export type FeedApiEntry = { ok: true; items: NewsItem[]; fetchedAt: number } | { ok: false; error: string }

export interface FeedApiResponse {
  generatedAt: number
  feeds: Record<string, FeedApiEntry>
}

export interface Snapshot {
  generatedAt: number
  feeds: Record<string, NewsItem[]>
}
