// src/lib/feed/parse.ts
var NAMED = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201D",
  ldquo: "\u201C",
  sbquo: "\u201A",
  bdquo: "\u201E",
  ndash: "\u2013",
  mdash: "\u2014",
  hellip: "\u2026",
  bull: "\u2022",
  middot: "\xB7",
  copy: "\xA9",
  reg: "\xAE",
  trade: "\u2122",
  deg: "\xB0",
  times: "\xD7",
  frac12: "\xBD",
  frac14: "\xBC",
  pound: "\xA3",
  euro: "\u20AC",
  cent: "\xA2",
  yen: "\xA5",
  laquo: "\xAB",
  raquo: "\xBB",
  shy: "",
  zwnj: "",
  zwj: "",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  eacute: "\xE9",
  egrave: "\xE8",
  ecirc: "\xEA",
  euml: "\xEB",
  aacute: "\xE1",
  agrave: "\xE0",
  acirc: "\xE2",
  auml: "\xE4",
  aring: "\xE5",
  atilde: "\xE3",
  ccedil: "\xE7",
  iacute: "\xED",
  icirc: "\xEE",
  iuml: "\xEF",
  ntilde: "\xF1",
  oacute: "\xF3",
  ocirc: "\xF4",
  ouml: "\xF6",
  oslash: "\xF8",
  otilde: "\xF5",
  uacute: "\xFA",
  ucirc: "\xFB",
  uuml: "\xFC",
  szlig: "\xDF",
  Eacute: "\xC9",
  Aacute: "\xC1",
  Ouml: "\xD6",
  Uuml: "\xDC",
  Ccedil: "\xC7"
};
function decodeEntities(input) {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const hex = entity[1] === "x" || entity[1] === "X";
      const code = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0 || code > 1114111) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED[entity] ?? NAMED[entity.toLowerCase()] ?? match;
  });
}
function xmlTextToHtml(raw) {
  let out = "";
  let last = 0;
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
  let m;
  while (m = re.exec(raw)) {
    out += decodeEntities(raw.slice(last, m.index));
    out += m[1];
    last = re.lastIndex;
  }
  out += decodeEntities(raw.slice(last));
  return out;
}
function htmlToText(html) {
  const stripped = html.replace(/<(script|style|figcaption|iframe)\b[\s\S]*?<\/\1>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<br\s*\/?>|<\/(p|div|li|h[1-6])>/gi, " ").replace(/<\/?[a-zA-Z][^>]*>/g, "");
  return decodeEntities(stripped).replace(/[\u00a0\s]+/g, " ").trim();
}
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function tagContent(block, name) {
  const n = escapeRe(name);
  const m = new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, "i").exec(block);
  return m ? m[1] : null;
}
function allTagContents(block, name) {
  const n = escapeRe(name);
  const re = new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, "gi");
  const out = [];
  let m;
  while (m = re.exec(block)) out.push(m[1]);
  return out;
}
function attr(tag, name) {
  const m = new RegExp(`\\s${escapeRe(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(tag);
  if (!m) return void 0;
  return decodeEntities(m[1] ?? m[2] ?? "").trim();
}
var IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i;
var JUNK_IMAGE = /gravatar\.com|feedburner|\/emoji\/|s\.w\.org|pixel|1x1|spacer|\.svg(\?|$)/i;
function safeUrl(input) {
  if (!input) return void 0;
  let u = input.trim();
  if (u.startsWith("//")) u = `https:${u}`;
  if (/^http:\/\//i.test(u)) u = `https://${u.slice(7)}`;
  if (!/^https:\/\//i.test(u)) return void 0;
  try {
    return new URL(u).href;
  } catch {
    return void 0;
  }
}
function tuneImage(url) {
  return url.replace(/(ichef\.bbci\.co\.uk\/ace\/standard\/)\d+\//, "$1976/");
}
function imageFromHtml(html) {
  const re = /<img\b[^>]*>/gi;
  let m;
  while (m = re.exec(html)) {
    const src = attr(m[0], "src") ?? attr(m[0], "data-src");
    if (!src || JUNK_IMAGE.test(src)) continue;
    const w = Number(attr(m[0], "width"));
    if (w && w < 80) continue;
    const url = safeUrl(src);
    if (url) return url;
  }
  return void 0;
}
function imageFromItem(block) {
  let best;
  const media = /<media:content\b[^>]*>/gi;
  let m;
  while (m = media.exec(block)) {
    const url = attr(m[0], "url");
    if (!url || JUNK_IMAGE.test(url)) continue;
    const medium = attr(m[0], "medium");
    const type = attr(m[0], "type");
    const isImage = medium ? medium === "image" : type ? type.startsWith("image/") : IMAGE_EXT.test(url);
    if (!isImage) continue;
    const width = Number(attr(m[0], "width")) || 0;
    if (!best || width > best.width) best = { url, width };
  }
  if (best) return safeUrl(best.url);
  const enclosure = /<enclosure\b[^>]*>/gi;
  while (m = enclosure.exec(block)) {
    const url = attr(m[0], "url");
    const type = attr(m[0], "type");
    if (!url) continue;
    if (type ? type.startsWith("image/") : IMAGE_EXT.test(url)) {
      const safe = safeUrl(url);
      if (safe) return safe;
    }
  }
  const thumb = /<media:thumbnail\b[^>]*>/i.exec(block);
  if (thumb) {
    const safe = safeUrl(attr(thumb[0], "url"));
    if (safe) return safe;
  }
  return void 0;
}
function hashId(input) {
  let h1 = 3735928559;
  let h2 = 1103547991;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
  h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
var SPONSORED = /^(sponsored|promoted|company news|partner content|press release|advertorial|brand ?voice|native content)/i;
var GENERIC_CATEGORY = /^(news|sections?|top headlines|featured|latest|uncategori[sz]ed|fast news|show types|home|all)$/i;
function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > max * 0.6 ? space : max).replace(/[\s,;:.–—-]+$/, "")}\u2026`;
}
function cleanSummary(html, title) {
  let text = htmlToText(html).replace(/\s*The post .{0,300}? appeared first on .{0,120}$/i, "").replace(/\s*\[(?:…|\.\.\.)\]\s*$/, "\u2026").replace(/\s*(Read more|Continue reading|Read the full story)\s*[.…»→]*\s*$/i, "").trim();
  if (text.toLowerCase() === title.toLowerCase()) text = "";
  return truncate(text, 340);
}
function cleanAuthor(raw) {
  if (!raw) return void 0;
  let a = htmlToText(raw);
  const named = /\(([^)]+)\)\s*$/.exec(a);
  if (named && a.includes("@")) a = named[1].trim();
  if (!a || a.includes("@") || a.length > 70) return void 0;
  return a;
}
function buildItem(raw, feed, now = Date.now()) {
  const title = htmlToText(raw.title);
  const link = safeUrl(raw.link);
  if (!title || !link) return null;
  const categories = raw.categories.map((c) => htmlToText(c)).filter(Boolean);
  if (categories.some((c) => SPONSORED.test(c))) return null;
  let summary = cleanSummary(raw.descriptionHtml, title);
  if (!summary && raw.contentHtml) summary = cleanSummary(raw.contentHtml, title);
  const image = feed.noImages ? void 0 : raw.image ?? imageFromHtml(raw.descriptionHtml) ?? (raw.contentHtml ? imageFromHtml(raw.contentHtml) : void 0);
  let published = raw.published;
  if (published !== null && (!Number.isFinite(published) || published <= 0)) published = null;
  if (published !== null && feed.dateFixMs) published += feed.dateFixMs;
  if (published !== null && published > now) published = now;
  const category = categories.find((c) => c.length <= 28 && !GENERIC_CATEGORY.test(c));
  const author = cleanAuthor(raw.author);
  return {
    id: hashId(link),
    title,
    link,
    summary,
    ...image ? { image: tuneImage(image) } : {},
    ...author ? { author } : {},
    ...category ? { category } : {},
    published,
    feedId: feed.id,
    sourceId: feed.sourceId,
    section: feed.section
  };
}
var MAX_AGE_MS = 21 * 24 * 60 * 60 * 1e3;
function finalize(items, limit, now = Date.now()) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    if (item.published !== null && now - item.published > MAX_AGE_MS) continue;
    seen.add(item.id);
    out.push(item);
  }
  out.sort((a, b) => (b.published ?? 0) - (a.published ?? 0));
  return out.slice(0, limit);
}
function parseFeed(xml, feed, limit = 24) {
  const now = Date.now();
  const items = [];
  const re = /<item\b[\s\S]*?<\/item>/gi;
  let m;
  while (m = re.exec(xml)) {
    const block = m[0];
    const dateRaw = tagContent(block, "pubDate") ?? tagContent(block, "dc:date") ?? tagContent(block, "published");
    const parsedDate = dateRaw ? Date.parse(htmlToText(xmlTextToHtml(dateRaw))) : NaN;
    const contentRaw = tagContent(block, "content:encoded");
    const item = buildItem(
      {
        title: xmlTextToHtml(tagContent(block, "title") ?? ""),
        link: htmlToText(xmlTextToHtml(tagContent(block, "link") ?? "")),
        descriptionHtml: xmlTextToHtml(tagContent(block, "description") ?? ""),
        contentHtml: contentRaw ? xmlTextToHtml(contentRaw) : void 0,
        image: imageFromItem(block),
        author: (() => {
          const a = tagContent(block, "dc:creator") ?? tagContent(block, "author");
          return a ? xmlTextToHtml(a) : null;
        })(),
        categories: allTagContents(block, "category").map(xmlTextToHtml),
        published: Number.isNaN(parsedDate) ? null : parsedDate
      },
      feed,
      now
    );
    if (item) items.push(item);
  }
  return finalize(items, limit, now);
}

// src/lib/feed/fetchFeed.ts
var UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 180news/1.0 (+https://180news.co.za)";
var FeedError = class extends Error {
  /** Seconds the publisher asked us to wait, when it said so. */
  retryAfterSeconds;
  constructor(message, retryAfterSeconds) {
    super(message);
    this.name = "FeedError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
};
async function fetchFeed(feed, limit = 24, timeoutMs = 8e3) {
  const res = await fetch(feed.url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) {
    const retryAfter = Number(res.headers.get("retry-after"));
    throw new FeedError(`HTTP ${res.status}`, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : void 0);
  }
  const xml = await res.text();
  const items = parseFeed(xml, feed, limit);
  if (items.length === 0) throw new Error("Feed returned no stories");
  return items;
}
function describeError(err) {
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || err.name === "AbortError") return "Timed out";
    return err.message.slice(0, 120);
  }
  return "Request failed";
}

// src/lib/feed/sources.ts
var SECTIONS = [
  { id: "south-africa", label: "South Africa" },
  { id: "politics", label: "Politics" },
  { id: "business", label: "Business" },
  { id: "sport", label: "Sport" },
  { id: "world", label: "World" },
  { id: "africa", label: "Africa" },
  { id: "tech", label: "Tech" },
  { id: "life", label: "Life" },
  { id: "opinion", label: "Opinions" }
];
var SECTION_BY_ID = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s])
);
var DM_DATE_FIX = -2 * 60 * 60 * 1e3;
var dm = { sourceId: "dm", dateFixMs: DM_DATE_FIX };
var iol = { sourceId: "iol", ttlSeconds: 300 };
var sabc = { sourceId: "sabc", noImages: true };
var FEEDS = [
  // South Africa
  { id: "iol-sa", ...iol, section: "south-africa", url: "https://iol.co.za/rss/iol/news/south-africa/" },
  { id: "dm-main", ...dm, section: "south-africa", url: "https://www.dailymaverick.co.za/dmrss/" },
  { id: "citizen-sa", sourceId: "citizen", section: "south-africa", url: "https://www.citizen.co.za/news/south-africa/feed/" },
  { id: "sabc-sa", ...sabc, section: "south-africa", url: "https://www.sabcnews.com/sabcnews/category/south-africa/feed/" },
  { id: "groundup", sourceId: "groundup", section: "south-africa", url: "https://groundup.org.za/sitenews/rss/" },
  // Politics
  { id: "dm-politics", ...dm, section: "politics", url: "https://www.dailymaverick.co.za/dmrss/?section=politics" },
  { id: "citizen-politics", sourceId: "citizen", section: "politics", url: "https://www.citizen.co.za/news/south-africa/politics/feed/" },
  { id: "sabc-politics", ...sabc, section: "politics", url: "https://www.sabcnews.com/sabcnews/category/politics/feed/" },
  // Business
  { id: "iol-business", ...iol, section: "business", url: "https://iol.co.za/rss/iol/business/" },
  { id: "moneyweb", sourceId: "moneyweb", section: "business", url: "https://www.moneyweb.co.za/feed/" },
  { id: "dm-business", ...dm, section: "business", url: "https://www.dailymaverick.co.za/dmrss/?section=business-maverick" },
  { id: "citizen-business", sourceId: "citizen", section: "business", url: "https://www.citizen.co.za/business/feed/" },
  // Sport
  { id: "iol-sport", ...iol, section: "sport", url: "https://iol.co.za/rss/iol/sport/" },
  { id: "citizen-sport", sourceId: "citizen", section: "sport", url: "https://www.citizen.co.za/sport/feed/" },
  { id: "dm-sport", ...dm, section: "sport", url: "https://www.dailymaverick.co.za/dmrss/?section=sport" },
  { id: "sarugby", sourceId: "sarugby", section: "sport", url: "https://www.sarugbymag.co.za/feed/" },
  // World
  { id: "bbc-world", sourceId: "bbc", section: "world", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { id: "dm-world", ...dm, section: "world", url: "https://www.dailymaverick.co.za/dmrss/?section=world" },
  { id: "aljazeera", sourceId: "aljazeera", section: "world", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  // Africa
  { id: "bbc-africa", sourceId: "bbc", section: "africa", url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml" },
  { id: "africanews", sourceId: "africanews", section: "africa", url: "https://www.africanews.com/feed/rss" },
  // Tech
  { id: "techcentral", sourceId: "techcentral", section: "tech", ttlSeconds: 300, url: "https://techcentral.co.za/feed/" },
  { id: "itweb", sourceId: "itweb", section: "tech", ttlSeconds: 300, url: "https://www.itweb.co.za/rss" },
  // Life
  { id: "iol-lifestyle", ...iol, section: "life", ttlSeconds: 600, url: "https://iol.co.za/rss/iol/lifestyle/" },
  { id: "iol-entertainment", ...iol, section: "life", ttlSeconds: 600, url: "https://iol.co.za/rss/iol/entertainment/" },
  { id: "dm-life", ...dm, section: "life", ttlSeconds: 600, url: "https://www.dailymaverick.co.za/dmrss/?section=maverick-life" },
  { id: "citizen-lifestyle", sourceId: "citizen", section: "life", ttlSeconds: 600, url: "https://www.citizen.co.za/lifestyle/feed/" },
  // Opinions
  { id: "dm-opinion", ...dm, section: "opinion", ttlSeconds: 900, url: "https://www.dailymaverick.co.za/dmrss/?section=opinionistas" },
  { id: "citizen-opinion", sourceId: "citizen", section: "opinion", ttlSeconds: 900, url: "https://www.citizen.co.za/news/opinion/feed/" },
  { id: "iol-opinion", ...iol, section: "opinion", ttlSeconds: 900, url: "https://iol.co.za/rss/iol/opinion/" }
];
var DEFAULT_TTL_SECONDS = 150;
function feedTtlSeconds(feed) {
  return feed.ttlSeconds ?? DEFAULT_TTL_SECONDS;
}
var FEED_BY_ID = Object.fromEntries(FEEDS.map((f) => [f.id, f]));

// src/server/feed.ts
var MAX_IDS = 8;
async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  let ids = [];
  try {
    const params = new URL(req.url ?? "/", "http://localhost").searchParams;
    ids = (params.get("ids") ?? "").split(",").map((s) => s.trim()).filter((id) => Object.prototype.hasOwnProperty.call(FEED_BY_ID, id));
  } catch {
    ids = [];
  }
  ids = [...new Set(ids)].slice(0, MAX_IDS);
  if (ids.length === 0) {
    res.statusCode = 400;
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ error: "Pass ?ids= with one or more known feed ids" }));
    return;
  }
  const body = { generatedAt: Date.now(), feeds: {} };
  let failures = 0;
  await Promise.all(
    ids.map(async (id) => {
      const entry = await getFeed(id);
      if (!entry.ok) failures += 1;
      body.feeds[id] = entry;
    })
  );
  const ttl = Math.min(...ids.map((id) => feedTtlSeconds(FEED_BY_ID[id])));
  const cache = failures === 0 ? `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 4}` : failures < ids.length ? "public, s-maxage=45, stale-while-revalidate=120" : "public, s-maxage=10";
  res.setHeader("Cache-Control", cache);
  res.statusCode = 200;
  res.end(JSON.stringify(body));
}
var KEEP_ON_ERROR_MS = 3 * 60 * 60 * 1e3;
var BACKOFF_MS = 6e4;
var MAX_BACKOFF_MS = 10 * 6e4;
var memory = /* @__PURE__ */ new Map();
var backoff = /* @__PURE__ */ new Map();
var inFlight = /* @__PURE__ */ new Map();
function fallback(id, error) {
  const kept = memory.get(id);
  if (kept && Date.now() - kept.at < KEEP_ON_ERROR_MS) return { ok: true, items: kept.items, fetchedAt: kept.at };
  return { ok: false, error };
}
function getFeed(id) {
  const def = FEED_BY_ID[id];
  const kept = memory.get(id);
  if (kept && Date.now() - kept.at < feedTtlSeconds(def) * 1e3) {
    return Promise.resolve({ ok: true, items: kept.items, fetchedAt: kept.at });
  }
  const waiting = backoff.get(id);
  if (waiting && Date.now() < waiting.until) return Promise.resolve(fallback(id, waiting.error));
  const running = inFlight.get(id);
  if (running) return running;
  const job = fetchFeed(def).then((items) => {
    const at = Date.now();
    memory.set(id, { at, items });
    backoff.delete(id);
    return { ok: true, items, fetchedAt: at };
  }).catch((err) => {
    const error = describeError(err);
    const asked = err instanceof FeedError && err.retryAfterSeconds ? err.retryAfterSeconds * 1e3 : BACKOFF_MS;
    backoff.set(id, { until: Date.now() + Math.min(asked, MAX_BACKOFF_MS), error });
    return fallback(id, error);
  }).finally(() => inFlight.delete(id));
  inFlight.set(id, job);
  return job;
}
export {
  handler as default
};
