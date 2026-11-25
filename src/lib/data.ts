// 180news — sections, sources, feeds, cleaning and formatting (replicated from 180news.co.za)
export const SITE_NAME = "180news";
export const ORIGIN = "https://www.180news.co.za";
export const CMS = "https://cms.180news.co.za";

export type SectionDef = { id: string; label: string };
export const SECTIONS: SectionDef[] = [
  { id: "elections", label: "Elections" },
  { id: "south-africa", label: "South Africa" },
  { id: "politics", label: "Politics" },
  { id: "business", label: "Business" },
  { id: "sport", label: "Sport" },
  { id: "world", label: "World" },
  { id: "africa", label: "Africa" },
  { id: "tech", label: "Tech" },
  { id: "life", label: "Life" },
  { id: "opinion", label: "Opinions" },
];
export const SECTION_MAP: Record<string, SectionDef> = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

export type SourceDef = { id: string; name: string; home: string };
export const SOURCES: Record<string, SourceDef> = {
  "180news": { id: "180news", name: "180news", home: "https://www.180news.co.za" },
  iol: { id: "iol", name: "IOL", home: "https://iol.co.za" },
  dm: { id: "dm", name: "Daily Maverick", home: "https://www.dailymaverick.co.za" },
  citizen: { id: "citizen", name: "The Citizen", home: "https://www.citizen.co.za" },
  sabc: { id: "sabc", name: "SABC News", home: "https://www.sabcnews.com" },
  groundup: { id: "groundup", name: "GroundUp", home: "https://groundup.org.za" },
  moneyweb: { id: "moneyweb", name: "Moneyweb", home: "https://www.moneyweb.co.za" },
  sarugby: { id: "sarugby", name: "SA Rugby magazine", home: "https://www.sarugbymag.co.za" },
  bbc: { id: "bbc", name: "BBC News", home: "https://www.bbc.co.uk/news" },
  aljazeera: { id: "aljazeera", name: "Al Jazeera", home: "https://www.aljazeera.com" },
  africanews: { id: "africanews", name: "Africanews", home: "https://www.africanews.com" },
  techcentral: { id: "techcentral", name: "TechCentral", home: "https://techcentral.co.za" },
  itweb: { id: "itweb", name: "ITWeb", home: "https://www.itweb.co.za" },
};
export function sourceName(id: string): string {
  return id === SITE_NAME ? "180news" : (SOURCES[id]?.name ?? "Source");
}

export type FeedDef = { id: string; sourceId: string; section: string; url: string; ttlSeconds?: number; dateFixMs?: number; noImages?: boolean };
const IOL = { sourceId: "iol", ttlSeconds: 300 } as const;
const DM = { sourceId: "dm", dateFixMs: -7200 * 1000 } as const;
const SABC = { sourceId: "sabc", noImages: true } as const;
export const FEEDS: FeedDef[] = [
  { id: "citizen-elections", sourceId: "citizen", section: "elections", url: "https://www.citizen.co.za/news/south-africa/elections/feed/" },
  { id: "sabc-elections", ...SABC, section: "elections", url: "https://www.sabcnews.com/sabcnews/tag/elections/feed/" },
  { id: "iol-sa", ...IOL, section: "south-africa", url: "https://iol.co.za/rss/iol/news/south-africa/" },
  { id: "dm-main", ...DM, section: "south-africa", url: "https://www.dailymaverick.co.za/dmrss/" },
  { id: "citizen-sa", sourceId: "citizen", section: "south-africa", url: "https://www.citizen.co.za/news/south-africa/feed/" },
  { id: "sabc-sa", ...SABC, section: "south-africa", url: "https://www.sabcnews.com/sabcnews/category/south-africa/feed/" },
  { id: "groundup", sourceId: "groundup", section: "south-africa", url: "https://groundup.org.za/sitenews/rss/" },
  { id: "dm-politics", ...DM, section: "politics", url: "https://www.dailymaverick.co.za/dmrss/?section=politics" },
  { id: "citizen-politics", sourceId: "citizen", section: "politics", url: "https://www.citizen.co.za/news/south-africa/politics/feed/" },
  { id: "sabc-politics", ...SABC, section: "politics", url: "https://www.sabcnews.com/sabcnews/category/politics/feed/" },
  { id: "iol-business", ...IOL, section: "business", url: "https://iol.co.za/rss/iol/business/" },
  { id: "moneyweb", sourceId: "moneyweb", section: "business", url: "https://www.moneyweb.co.za/feed/" },
  { id: "dm-business", ...DM, section: "business", url: "https://www.dailymaverick.co.za/dmrss/?section=business-maverick" },
  { id: "citizen-business", sourceId: "citizen", section: "business", url: "https://www.citizen.co.za/business/feed/" },
  { id: "iol-sport", ...IOL, section: "sport", url: "https://iol.co.za/rss/iol/sport/" },
  { id: "citizen-sport", sourceId: "citizen", section: "sport", url: "https://www.citizen.co.za/sport/feed/" },
  { id: "dm-sport", ...DM, section: "sport", url: "https://www.dailymaverick.co.za/dmrss/?section=sport" },
  { id: "sarugby", sourceId: "sarugby", section: "sport", url: "https://www.sarugbymag.co.za/feed/" },
  { id: "bbc-world", sourceId: "bbc", section: "world", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { id: "dm-world", ...DM, section: "world", url: "https://www.dailymaverick.co.za/dmrss/?section=world" },
  { id: "aljazeera", sourceId: "aljazeera", section: "world", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { id: "bbc-africa", sourceId: "bbc", section: "africa", url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml" },
  { id: "africanews", sourceId: "africanews", section: "africa", url: "https://www.africanews.com/feed/rss" },
  { id: "techcentral", sourceId: "techcentral", section: "tech", ttlSeconds: 300, url: "https://techcentral.co.za/feed/" },
  { id: "itweb", sourceId: "itweb", section: "tech", ttlSeconds: 300, url: "https://www.itweb.co.za/rss" },
  { id: "iol-lifestyle", ...IOL, section: "life", ttlSeconds: 600, url: "https://iol.co.za/rss/iol/lifestyle/" },
  { id: "iol-entertainment", ...IOL, section: "life", ttlSeconds: 600, url: "https://iol.co.za/rss/iol/entertainment/" },
  { id: "dm-life", ...DM, section: "life", ttlSeconds: 600, url: "https://www.dailymaverick.co.za/dmrss/?section=maverick-life" },
  { id: "citizen-lifestyle", sourceId: "citizen", section: "life", ttlSeconds: 600, url: "https://www.citizen.co.za/lifestyle/feed/" },
  { id: "dm-opinion", ...DM, section: "opinion", ttlSeconds: 900, url: "https://www.dailymaverick.co.za/dmrss/?section=opinionistas" },
  { id: "citizen-opinion", sourceId: "citizen", section: "opinion", ttlSeconds: 900, url: "https://www.citizen.co.za/news/opinion/feed/" },
  { id: "iol-opinion", ...IOL, section: "opinion", ttlSeconds: 900, url: "https://iol.co.za/rss/iol/opinion/" },
];
export const feedsForSection = (section: string) => FEEDS.filter((f) => f.section === section);

export type MediaItem = { id: string; kind: "photo" | "video" | "audio"; url: string; caption?: string; credit?: string; width?: number; height?: number; contentType?: string; position?: "before" | "after" };
export type NewsItem = {
  id: string; title: string; link: string; summary: string;
  image?: string; author?: string; category?: string;
  published: number | null; feedId: string; sourceId: string; section: string;
  body?: string; links?: string[]; tags?: string[]; slug?: string; headline?: boolean; media?: MediaItem[];
  placement?: string; imageCaption?: string; imageCredit?: string;
};
/** Synthetic feed id used to surface the CMS (180news' own stories) in feed status. */
export const CMS_FEED_ID = "cms-180news";
/** Canonical story id for a CMS article — matches the CMS public path /story/my-cmsNNNNNNN. */
export const cmsStoryId = (numericId: number) => `my-cms${String(numericId).padStart(7, "0")}`;
export function cmsNumericId(id: string): number | null { const m = /(\d+)$/.exec(id); return m ? Number(m[1]) : null; }
export const isCmsItem = (item: NewsItem) => item.feedId === "cms" || /^cms-\d+$/.test(item.id) || /^my-cms\d+$/.test(item.id);

// --- feed cleaning (ported from the original) ---
const decodeEntities = (s: string) => s.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#0?39;/g, "'").replace(/&apos;/gi, "'").replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)));
export const stripHtml = (s: string) => decodeEntities(s.replace(/<(script|style|figcaption|iframe)\b[\s\S]*?<\/\1>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<br\s*\/?>|<\/(p|div|li|h[1-6])>/gi, " ").replace(/<\/?[a-zA-Z][^>]*>/g, "")).replace(/[\u00a0\s]+/g, " ").trim();
function attr(tag: string, name: string): string | undefined {
  const u = new RegExp(`\\s${name.replace(/[.*+?^${"{}()|[\]\\]/g, "\\$&")}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(tag);
  return u ? decodeEntities(u[1] ?? u[2] ?? "").trim() : undefined;
}
const BAD_IMG = /gravatar\.com|feedburner|\/emoji\/|s\.w\.org|pixel|1x1|spacer|\.svg(\?|$)/i;
export function cleanUrl(i?: string | null): string | undefined {
  if (!i) return undefined;
  let o = i.trim();
  if (o.startsWith("//")) o = `https:${o}`;
  if (/^http:\/\//i.test(o)) o = `https://${o.slice(7)}`;
  if (!/^https:\/\//i.test(o)) return undefined;
  try { return new URL(o).href; } catch { return undefined; }
}
const bumpBbc = (i: string) => i.replace(/(ichef\.bbci\.co\.uk\/ace\/standard\/)\d+\//, "$1976/");
export function firstImage(html: string): string | undefined {
  const o = /<img\b[^>]*>/gi; let u: RegExpExecArray | null;
  while ((u = o.exec(html))) {
    const c = attr(u[0], "src") ?? attr(u[0], "data-src");
    if (!c || BAD_IMG.test(c)) continue;
    const d = Number(attr(u[0], "width"));
    if (d && d < 80) continue;
    const h = cleanUrl(c);
    if (h) return bumpBbc(h);
  }
  return undefined;
}
export function storyId(link: string): string {
  let o = 3735928559, u = 1103547991;
  for (let c = 0; c < link.length; c++) { const d = link.charCodeAt(c); o = Math.imul(o ^ d, 2654435761); u = Math.imul(u ^ d, 1597334677); }
  o = Math.imul(o ^ (o >>> 16), 2246822507) ^ Math.imul(u ^ (u >>> 13), 3266489909);
  u = Math.imul(u ^ (u >>> 16), 2246822507) ^ Math.imul(o ^ (o >>> 13), 3266489909);
  return (4294967296 * (2097151 & u) + (o >>> 0)).toString(36);
}
const SPONSORED = /^(sponsored|promoted|company news|partner content|press release|advertorial|brand ?voice|native content)/i;
const GENERIC_CAT = /^(news|sections?|top headlines|featured|latest|uncategori[sz]ed|fast news|show types|home|all)$/i;
function truncate(i: string, o: number): string {
  if (i.length <= o) return i;
  const u = i.slice(0, o), c = u.lastIndexOf(" ");
  return `${u.slice(0, c > o * 0.6 ? c : o).replace(/[\s,;:.\u2013\u2014-]+$/, "")}…`;
}
function cleanSummary(html: string, title: string): string {
  let u = stripHtml(html).replace(/\s*The post .{0,300}? appeared first on .{0,120}$/i, "").replace(/\s*\[(?:…|\.\.\.)\]\s*$/u, "…").replace(/\s*(Read more|Continue reading|Read the full story)\s*[.…»→]*\s*$/i, "").trim();
  if (u.toLowerCase() === title.toLowerCase()) u = "";
  return truncate(u, 340);
}
function cleanAuthor(i?: string): string | undefined {
  if (!i) return undefined;
  let o = stripHtml(i);
  const u = /\(([^)]+)\)\s*$/.exec(o);
  if (u && o.includes("@")) o = u[1].trim();
  if (!o || o.includes("@") || o.length > 70) return undefined;
  return o;
}
export type RawItem = { title: string; link: string; descriptionHtml: string; contentHtml?: string; image?: string; author?: string; categories: string[]; published: number | null };
export function toNewsItem(i: RawItem, feed: FeedDef, now = Date.now()): NewsItem | null {
  const title = stripHtml(i.title); const link = cleanUrl(i.link);
  if (!title || !link) return null;
  const cats = i.categories.map((m) => stripHtml(m)).filter(Boolean);
  if (cats.some((m) => SPONSORED.test(m))) return null;
  let summary = cleanSummary(i.descriptionHtml, title);
  if (!summary && i.contentHtml) summary = cleanSummary(i.contentHtml, title);
  const image = feed.noImages ? undefined : (cleanUrl(i.image) ?? firstImage(i.descriptionHtml) ?? (i.contentHtml ? firstImage(i.contentHtml) : undefined));
  let published = i.published;
  if (published !== null && (!Number.isFinite(published) || published <= 0)) published = null;
  if (published !== null && feed.dateFixMs) published += feed.dateFixMs;
  if (published !== null && published > now) published = now;
  const category = cats.find((m) => m.length <= 28 && !GENERIC_CAT.test(m));
  const author = cleanAuthor(i.author);
  return { id: storyId(link), title, link, summary, ...(image ? { image: bumpBbc(image) } : {}), ...(author ? { author } : {}), ...(category ? { category } : {}), published, feedId: feed.id, sourceId: feed.sourceId, section: feed.section };
}
const MAX_AGE = 504 * 60 * 60 * 1000;
export function dedupeCap(items: NewsItem[], cap: number, now = Date.now()): NewsItem[] {
  const seen = new Set<string>(); const out: NewsItem[] = [];
  for (const h of items) {
    if (seen.has(h.id)) continue;
    if (h.published !== null && now - h.published > MAX_AGE) continue;
    seen.add(h.id); out.push(h);
  }
  return out.sort((a, b) => (b.published ?? 0) - (a.published ?? 0)).slice(0, cap);
}
export function isNewsItem(i: unknown): i is NewsItem {
  if (!i || typeof i !== "object") return false;
  const o = i as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.title === "string" && typeof o.link === "string" && /^https:\/\//.test(o.link) && typeof o.summary === "string" && (o.image === undefined || (typeof o.image === "string" && /^https?:\/\//.test(o.image))) && (o.published === null || typeof o.published === "number") && typeof o.feedId === "string" && typeof o.sourceId === "string" && typeof o.section === "string";
}
export const byPublished = (a: NewsItem, b: NewsItem) => (b.published ?? 0) - (a.published ?? 0);
/** Round-robin by source for the freshest window (original "Ud"). */
export function interleave(i: NewsItem[], windowMs = 1080 * 60 * 1000): NewsItem[] {
  if (i.length < 3) return [...i].sort(byPublished);
  const sorted = [...i].sort(byPublished);
  const newest = sorted[0].published ?? 0;
  const fresh = sorted.filter((b) => (b.published ?? 0) >= newest - windowMs);
  const older = sorted.filter((b) => (b.published ?? 0) < newest - windowMs);
  const bySource = new Map<string, NewsItem[]>();
  for (const b of fresh) { const y = bySource.get(b.sourceId); if (y) y.push(b); else bySource.set(b.sourceId, [b]); }
  const out: NewsItem[] = []; let groups = [...bySource.values()];
  while (groups.length) {
    groups.sort((a, b) => byPublished(a[0], b[0]));
    for (const g of groups) { const v = g.shift(); if (v) out.push(v); }
    groups = groups.filter((g) => g.length);
  }
  return [...out, ...older];
}
export const titleKey = (i: NewsItem) => i.title.toLowerCase().replace(/[^a-z0-9]+/g, "");

// --- dates (SAST) ---
const TZ = "Africa/Johannesburg";
const fmtFullDate = new Intl.DateTimeFormat("en-ZA", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtDayLong = new Intl.DateTimeFormat("en-ZA", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const fmtDayShort = new Intl.DateTimeFormat("en-ZA", { timeZone: TZ, day: "numeric", month: "short" });
const fmtTime = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fmtDateLong = new Intl.DateTimeFormat("en-ZA", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
const fmtYmd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
export const fullDate = (t: number) => fmtFullDate.format(t);
export const timeHM = (t: number) => fmtTime.format(t);
export const dayShort = (t: number) => fmtDayShort.format(t);
export const dateTimeSAST = (t: number) => `${fmtDateLong.format(t)} at ${fmtTime.format(t)} SAST`;
export const ymd = (t: number) => fmtYmd.format(t);
export function relTime(published: number | null, now: number): string {
  if (published === null) return "";
  const mins = Math.floor(Math.max(0, now - published) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : ymd(published) === ymd(now - 86400000) ? "Yesterday" : fmtDayShort.format(published);
}
export function dayLabel(t: number, now: number): string {
  const u = ymd(t);
  return u === ymd(now) ? "Today" : u === ymd(now - 86400000) ? "Yesterday" : fmtDayLong.format(t);
}
export function timeOrDate(t: number, now: number): string {
  return ymd(t) === ymd(now) ? fmtTime.format(t) : `${fmtDayShort.format(t)}, ${fmtTime.format(t)}`;
}
export const fmtNum = (i: number) => Math.round(i).toLocaleString("en-ZA").replace(/[\u00a0\u202f,]/g, " ");

export type City = { id: string; name: string; lat: number; lon: number };
export const CITIES: City[] = [
  { id: "jhb", name: "Johannesburg", lat: -26.2041, lon: 28.0473 },
  { id: "cpt", name: "Cape Town", lat: -33.9249, lon: 18.4241 },
  { id: "dbn", name: "Durban", lat: -29.8587, lon: 31.0218 },
  { id: "pta", name: "Pretoria", lat: -25.7479, lon: 28.2293 },
  { id: "gqe", name: "Gqeberha", lat: -33.9608, lon: 25.6022 },
  { id: "bfn", name: "Bloemfontein", lat: -29.0852, lon: 26.1596 },
  { id: "els", name: "East London", lat: -33.0153, lon: 27.9116 },
  { id: "plk", name: "Polokwane", lat: -23.9045, lon: 29.4689 },
  { id: "mbo", name: "Mbombela", lat: -25.4753, lon: 30.9694 },
  { id: "kim", name: "Kimberley", lat: -28.7282, lon: 24.7499 },
  { id: "mhk", name: "Mahikeng", lat: -25.856, lon: 25.6403 },
];
export type WeatherKind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";
export function weatherFor(code: number): { label: string; kind: WeatherKind } {
  return code === 0 ? { label: "Clear", kind: "clear" } : code === 1 ? { label: "Mostly clear", kind: "partly" } : code === 2 ? { label: "Partly cloudy", kind: "partly" } : code === 3 ? { label: "Overcast", kind: "cloudy" } : code === 45 || code === 48 ? { label: "Fog", kind: "fog" } : code >= 51 && code <= 57 ? { label: "Drizzle", kind: "drizzle" } : (code >= 61 && code <= 67) || (code >= 80 && code <= 82) ? { label: "Rain", kind: "rain" } : (code >= 71 && code <= 77) || code === 85 || code === 86 ? { label: "Snow", kind: "snow" } : code >= 95 ? { label: "Thunderstorms", kind: "storm" } : { label: "Cloudy", kind: "cloudy" };
}
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
export const tagPath = (tag: string) => `/tag/${encodeURIComponent(tag.toLowerCase())}`;
export const storyPath = (item: NewsItem) => `/story/${item.id}`;
