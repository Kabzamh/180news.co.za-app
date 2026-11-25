import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Bookmark, ChevronRight, ExternalLink, Play, Search, Trash2, X } from "lucide-react";
import { useControl, useNews, usePageTitle, useSaved } from "./lib/providers";
import { CMS, SECTION_MAP, SOURCES, dayLabel, relTime, sourceName, storyPath, tagPath, timeHM, dateTimeSAST, ymd, feedsForSection, cmsNumericId, isCmsItem, type NewsItem } from "./lib/data";
import { AdSlot, FeedsDown, GridSkeleton, IecSummary, LeadCard, PageHead, RandWatch, RowCard, SOCIALS, SaveButton, SectionHead, StoryCard, StoryImage, TextCard } from "./components";

const LATEST_PAGE = 30;
export function LatestPage() {
  usePageTitle("Latest");
  const { ready, all, now } = useNews();
  const [count, setCount] = useState(LATEST_PAGE);
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: NewsItem[] }[] = [];
    for (const item of all.slice(0, count)) {
      const key = item.published === null ? "undated" : ymd(item.published);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(item);
      else out.push({ key, label: item.published === null ? "Undated" : dayLabel(item.published, now), items: [item] });
    }
    return out;
  }, [all, count, now]);
  const remaining = all.length - Math.min(count, all.length);
  return (
    <div className="wrap max-w-[860px] pt-7 md:pt-10">
      <PageHead title="Latest"><p className="mt-2 text-[15px] text-muted">Every headline from every newsroom, newest first. Times are South African Standard Time.</p></PageHead>
      {ready ? (all.length === 0 ? <FeedsDown /> : (
        <>
          {groups.map((g) => (
            <section key={g.key} aria-label={g.label} className="mt-8">
              <h2 className="glass sticky top-[68px] z-10 rounded-xl px-4 py-2.5 text-sm font-black uppercase tracking-[0.05em] text-navy">{g.label}</h2>
              <ol>{g.items.map((b) => (
                <li key={b.id} className="flex gap-3 border-b border-line py-4 sm:gap-5">
                  <span className="w-11 shrink-0 pt-0.5 text-[13.5px] font-extrabold tabular-nums text-brand">{b.published !== null ? timeHM(b.published) : "–"}</span>
                  <div className="min-w-0 flex-1"><RowCard item={b} /></div>
                </li>
              ))}</ol>
            </section>
          ))}
          {remaining > 0 && <div className="mt-10 text-center"><button type="button" onClick={() => setCount((c) => c + LATEST_PAGE)} className="inline-flex h-12 cursor-pointer items-center border-2 border-navy px-7 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white">Show earlier headlines ({remaining} left)</button></div>}
        </>
      )) : (
        <div className="mt-8 space-y-6" role="status" aria-label="Loading headlines">{Array.from({ length: 8 }, (_, i) => <div key={i} className="flex gap-4"><div className="h-4 w-12 animate-pulse bg-line/70 motion-reduce:animate-none" /><div className="flex-1"><div className="h-4 w-11/12 animate-pulse bg-line/70 motion-reduce:animate-none" /><div className="mt-2 h-4 w-1/2 animate-pulse bg-line/70 motion-reduce:animate-none" /></div></div>)}</div>
      )}
    </div>
  );
}
const SECTION_PAGE = 12;
export function SectionPage() {
  const { slug = "" } = useParams();
  const section = SECTION_MAP[slug];
  usePageTitle(section?.label);
  const { ready, bySection, all } = useNews();
  const { settings } = useControl();
  const [sourceFilter, setSourceFilter] = useState("all");
  const [count, setCount] = useState(SECTION_PAGE);
  useEffect(() => { setSourceFilter("all"); setCount(SECTION_PAGE); }, [slug]);
  const items = bySection[slug] ?? [];
  const sources = useMemo(() => {
    const present = [...new Set(items.map((i) => i.sourceId))];
    const ordered = [...new Set(feedsForSection(slug).map((f) => f.sourceId))].filter((s) => present.includes(s));
    // Sources without an RSS feed in this section (180news via the CMS) are included too.
    for (const s of present) if (!ordered.includes(s)) ordered.unshift(s);
    return ordered;
  }, [slug, items]);
  const filtered = useMemo(() => sourceFilter === "all" ? items : items.filter((i) => i.sourceId === sourceFilter), [items, sourceFilter]);
  const lead = filtered.find((i) => i.image) ?? filtered[0];
  const rest = filtered.filter((i) => i !== lead);
  const gridItems = rest.slice(0, 3 + count);
  const remaining = rest.length - 3 - Math.min(count, Math.max(0, rest.length - 3));
  const chip = (active: boolean) => `inline-flex h-11 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full border px-4 text-sm font-bold transition-colors ${active ? "border-navy bg-navy text-white" : "border-line bg-paper text-ink hover:border-navy hover:text-navy"}`;
  return (
    <div className="wrap pt-7 md:pt-10">
      <PageHead title={section?.label ?? slug}>
        {ready && items.length > 0 && <p className="mt-2 text-[15px] text-muted" aria-live="polite">{filtered.length} {filtered.length === 1 ? "story" : "stories"} from {sourceFilter === "all" ? `${sources.length} ${sources.length === 1 ? "newsroom" : "newsrooms"}` : sourceName(sourceFilter)}</p>}
      </PageHead>
      {slug === "elections" && <IecSummary className="mt-5" />}
      {sources.length > 1 && (
        <div role="group" aria-label="Filter by newsroom" className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <button type="button" aria-pressed={sourceFilter === "all"} onClick={() => { setSourceFilter("all"); setCount(SECTION_PAGE); }} className={chip(sourceFilter === "all")}>All newsrooms</button>
          {sources.map((s) => <button key={s} type="button" aria-pressed={sourceFilter === s} onClick={() => { setSourceFilter(s); setCount(SECTION_PAGE); }} className={chip(sourceFilter === s)}>{sourceName(s)}</button>)}
        </div>
      )}
      <div className="mt-8">
        {ready ? (all.length === 0 ? <FeedsDown /> : lead ? (
          <>
            <div className="grid gap-x-8 gap-y-8 lg:grid-cols-12">
              <div className="lg:col-span-7"><LeadCard item={lead} /></div>
              <div className="space-y-6 lg:col-span-5">
                {rest.slice(0, 3).length > 0 && <ul className="divide-y divide-line">{rest.slice(0, 3).map((i) => <li key={i.id} className="py-4 first:pt-0"><RowCard item={i} summary /></li>)}</ul>}
                {slug === "business" && <RandWatch />}
              </div>
            </div>
            {gridItems.length > 0 && <ul className="mt-10 grid gap-x-6 gap-y-9 border-t border-line pt-8 sm:grid-cols-2 lg:grid-cols-3">{gridItems.slice(3).map((i) => <li key={i.id}><StoryCard item={i} summary /></li>)}</ul>}
            {remaining > 0 && <div className="mt-10 text-center"><button type="button" onClick={() => setCount((c) => c + SECTION_PAGE)} className="inline-flex h-12 cursor-pointer items-center border-2 border-navy px-7 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white">Show more {section?.label} ({remaining} left)</button></div>}
          </>
        ) : (
          <p className="py-16 text-center text-[17px] text-body">{slug === "elections" ? "There are no election stories in the feeds at the moment. Other sections are still up to date — use the menu above." : `The ${section?.label ?? slug} feeds are not responding at the moment. Other sections are still up to date — use the menu above, or refresh from the top bar.`}</p>
        )) : <GridSkeleton />}
      </div>
      {settings.hiddenSections.length > 0 && null}
    </div>
  );
}
/* Story embeds for YouTube / Facebook links in own articles */
const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"]);
const FB_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "mbasic.facebook.com", "fb.watch", "fb.com", "www.fb.com"]);
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const FB_VIDEO = /\/(videos?|watch|reels?|video\.php)(\/|$)|\/share\/[vr]\//;
type Embed = { provider: "youtube"; url: string; videoId?: string; vertical?: boolean; start?: number } | { provider: "facebook"; url: string; video: boolean };
function parseStart(v: string | null): number | undefined {
  if (!v) return undefined;
  if (/^\d+$/.test(v)) return Number(v) || undefined;
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(v);
  return m ? (Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) || undefined) : undefined;
}
function parseEmbed(raw: string): Embed | null {
  let s = raw.trim(); if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  let u: URL; try { u = new URL(s); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  u.protocol = "https:"; u.username = ""; u.password = ""; u.port = "";
  const host = u.hostname.toLowerCase();
  if (u.pathname === "/" && !u.search) return null;
  if (YT_HOSTS.has(host)) {
    const parts = u.pathname.split("/").filter(Boolean);
    let id: string | null = null;
    if (host === "youtu.be") id = parts[0] ?? null;
    else if (parts[0] === "watch") id = u.searchParams.get("v");
    else if (["shorts", "embed", "live", "v"].includes(parts[0])) id = parts[1] ?? null;
    const start = parseStart(u.searchParams.get("t") ?? u.searchParams.get("start"));
    return { provider: "youtube", url: u.href, ...(id && YT_ID.test(id) ? { videoId: id } : {}), vertical: parts[0] === "shorts", ...(start ? { start } : {}) };
  }
  if (FB_HOSTS.has(host)) return { provider: "facebook", url: u.href, video: host === "fb.watch" || FB_VIDEO.test(u.pathname) };
  return null;
}
const shortUrl = (i: string) => { const o = i.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, ""); return o.length > 64 ? `${o.slice(0, 63)}…` : o; };
const EXT_LINK = "inline-flex min-h-11 items-center gap-2 text-[14.5px] font-bold text-navy underline decoration-navy/40 underline-offset-[3px] hover:decoration-navy";
function ExtLink({ url, service }: { url: string; service: string }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" className={EXT_LINK}>{service === "YouTube" ? "Watch on YouTube" : "Open on Facebook"}<ExternalLink size={15} strokeWidth={2.4} aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span></a>;
}
function YoutubeEmbed({ link }: { link: Extract<Embed, { provider: "youtube" }> & { videoId: string } }) {
  const [play, setPlay] = useState(false); const [imgFail, setImgFail] = useState(false);
  const box = link.vertical ? "aspect-[9/16] w-full max-w-[340px]" : "aspect-video w-full";
  const src = `https://www.youtube-nocookie.com/embed/${link.videoId}?autoplay=1&rel=0&playsinline=1${link.start ? `&start=${link.start}` : ""}`;
  return (
    <figure>
      <div className={`relative overflow-hidden bg-ink ${box}`}>
        {play ? <iframe src={src} title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 h-full w-full border-0" /> : (
          <button type="button" onClick={() => setPlay(true)} aria-label="Play YouTube video" className="group absolute inset-0 h-full w-full cursor-pointer">
            {!imgFail && <img src={`https://i.ytimg.com/vi/${link.videoId}/hqdefault.jpg`} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImgFail(true)} className="absolute inset-0 h-full w-full object-cover" />}
            <span className="absolute inset-0 bg-ink/25 transition-colors group-hover:bg-ink/10" aria-hidden="true" />
            <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand text-white shadow-[0_6px_20px_rgb(0_0_0_/_0.45)] transition-transform group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"><Play size={26} strokeWidth={2.4} fill="currentColor" className="translate-x-0.5" aria-hidden="true" /></span>
            <span className="absolute bottom-2.5 left-3 rounded-sm bg-ink/80 px-2 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-white">YouTube</span>
          </button>
        )}
      </div>
      <figcaption><ExtLink url={link.url} service="YouTube" /></figcaption>
    </figure>
  );
}
function FacebookEmbed({ link }: { link: Extract<Embed, { provider: "facebook" }> }) {
  const [play, setPlay] = useState(false);
  return (
    <div className="border border-line bg-wash p-4">
      <p className="text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-navy">Facebook {link.video ? "video" : "link"}</p>
      <p className="mt-0.5 break-all text-[14px] text-muted">{shortUrl(link.url)}</p>
      {play && <div className="relative mt-3 aspect-video w-full bg-ink"><iframe src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(link.url)}&show_text=false&autoplay=true`} title="Facebook video player" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen className="absolute inset-0 h-full w-full border-0" /></div>}
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
        {link.video && !play && <button type="button" onClick={() => setPlay(true)} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-navy px-5 text-sm font-extrabold text-white hover:bg-navy-deep"><Play size={15} strokeWidth={2.6} fill="currentColor" aria-hidden="true" />Play here</button>}
        <ExtLink url={link.url} service="Facebook" />
      </div>
    </div>
  );
}
function LinkEmbeds({ links }: { links: string[] }) {
  const embeds = links.map(parseEmbed).filter((e): e is Embed => e !== null);
  if (!embeds.length) return null;
  return (
    <section aria-label="YouTube and Facebook links" className="mt-8 max-w-[64ch] space-y-6">
      {embeds.map((e) => e.provider === "facebook" ? <FacebookEmbed key={e.url} link={e} /> : e.videoId ? <YoutubeEmbed key={e.url} link={e as Extract<Embed, { provider: "youtube" }> & { videoId: string }} /> : (
        <div key={e.url} className="border border-line bg-wash p-4"><p className="text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-navy">YouTube link</p><p className="mt-0.5 break-all text-[14px] text-muted">{shortUrl(e.url)}</p><ExtLink url={e.url} service="YouTube" /></div>
      ))}
    </section>
  );
}
function MediaBlock({ item, position }: { item: NewsItem; position: "before" | "after" }) {
  const media = item.media ?? [];
  const videos = media.filter((m) => m.kind === "video" && (m.position ?? "before") === position);
  const others = media.filter((m) => m.kind !== "video" && (m.position ?? "before") === position);
  const list = [...videos, ...others];
  if (!list.length) return null;
  return <div className="mt-6 space-y-6">{list.map((m) => <SingleMedia key={m.id} m={m} />)}</div>;
}
function SingleMedia({ m }: { m: NonNullable<NewsItem["media"]>[number] }) {
  if (!m.url) return null;
  const hasCaption = !!(m.caption ?? m.credit);
  return (
    <figure>
      {m.kind === "video" && <div className="overflow-hidden bg-ink"><video src={`${m.url}#t=0.001`} controls playsInline preload="metadata" aria-label={m.caption ?? "Video"} className="max-h-[75vh] w-full bg-ink" /></div>}
      {m.kind === "photo" && <div className="bg-wash"><img src={m.url} alt={m.caption ?? ""} referrerPolicy="no-referrer" className="max-h-[80vh] w-full object-contain" /></div>}
      {m.kind === "audio" && <div className="bg-wash px-4 py-3"><audio src={m.url} controls preload="metadata" aria-label={m.caption ?? "Audio clip"} className="w-full" /></div>}
      {hasCaption && <figcaption className="mt-2 text-[13px] text-muted">{m.caption}{m.caption && m.credit ? " · " : ""}{m.credit && <span>Supplied by {m.credit}</span>}</figcaption>}
    </figure>
  );
}
type CmsComment = { name: string; body: string; at: number | null };
function parseComments(raw: unknown): CmsComment[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((c) => c && typeof c === "object").map((c) => {
    const o = c as Record<string, unknown>;
    const body = typeof (o.body ?? o.text ?? o.comment) === "string" ? String(o.body ?? o.text ?? o.comment).trim() : "";
    const atRaw = o.createdAt ?? o.created_at ?? o.when ?? o.publishedAt ?? o.at ?? o.date;
    const at = typeof atRaw === "number" && atRaw > 0 ? atRaw : typeof atRaw === "string" && Number.isFinite(Date.parse(atRaw)) ? Date.parse(atRaw) : null;
    return { name: (typeof (o.name ?? o.author) === "string" ? String(o.name ?? o.author).trim() : "") || "Reader", body, at };
  }).filter((c) => c.body.length > 0);
}
function StoryComments({ cmsId }: { cmsId: number }) {
  const { now } = useNews();
  const [data, setData] = useState<{ open: boolean; comments: CmsComment[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState(""); const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const load = () => fetch(`${CMS}/api/public?resource=comments&id=${cmsId}`, { headers: { Accept: "application/json" } }).then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); const j = await r.json(); return Array.isArray(j) ? { open: true, comments: parseComments(j) } : { open: j.open !== false, comments: parseComments(j.comments ?? j.data) }; });
  useEffect(() => { let dead = false; setLoading(true); setFailed(false); load().then((d) => { if (!dead) setData(d); }).catch(() => { if (!dead) setFailed(true); }).finally(() => { if (!dead) setLoading(false); }); return () => { dead = true; }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmsId]);
  if (loading && !data) return <section aria-labelledby="story-comments" className="mt-10 border-t border-line pt-8"><h2 id="story-comments" className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Comments</h2><p className="mt-4 text-[14px] text-muted">Loading comments…</p></section>;
  if (failed || !data) return null;
  if (!data.open) return <section aria-labelledby="story-comments" className="mt-10 border-t border-line pt-8"><h2 id="story-comments" className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Comments</h2><p className="mt-4 text-[15px] text-muted">Comments are closed on this story.</p></section>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim(); const b = body.trim();
    if (n.length < 2) { setNotice({ tone: "error", text: "Enter your name." }); return; }
    if (b.length < 2) { setNotice({ tone: "error", text: "Write your comment." }); return; }
    setSending(true); setNotice(null);
    try {
      const r = await fetch(`${CMS}/api/public?resource=comment`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ id: cmsId, name: n.slice(0, 60), body: b.slice(0, 800) }) });
      if (!r.ok) { setNotice({ tone: "error", text: "The comment could not be sent just now. Please try again." }); return; }
      const j = await r.json().catch(() => null);
      if (j && j.ok === true) { setBody(""); setNotice({ tone: "ok", text: "Thank you — your comment was sent to the newsroom and appears once it has been approved." }); load().then(setData).catch(() => { /* ignore */ }); }
      else {
        const fields = j?.fields;
        if (fields && typeof fields === "object" && Object.values(fields).length) setNotice({ tone: "error", text: String(Object.values(fields)[0]) });
        else setNotice({ tone: "error", text: "The comment could not be sent just now. Please try again." });
      }
    } catch { setNotice({ tone: "error", text: "The comment could not be sent just now. Please try again." }); }
    finally { setSending(false); }
  };
  const inputCls = "w-full border border-ink/35 bg-paper px-3.5 text-base text-ink placeholder:text-muted";
  return (
    <section aria-labelledby="story-comments" className="mt-10 border-t border-line pt-8">
      <h2 id="story-comments" className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Comments{data.comments.length > 0 ? ` · ${data.comments.length}` : ""}</h2>
      {data.comments.length > 0 ? (
        <ul className="mt-3 divide-y divide-line">{data.comments.map((c, i) => (
          <li key={`${c.name}-${c.at ?? i}-${i}`} className="py-4 first:pt-0">
            <p className="text-[14px] leading-5"><span className="font-extrabold text-ink">{c.name}</span>{c.at !== null && <span className="text-muted"> · <time dateTime={new Date(c.at).toISOString()} title={dateTimeSAST(c.at)}>{relTime(c.at, now)}</time></span>}</p>
            <p className="mt-1.5 whitespace-pre-line text-[16px] leading-relaxed text-body">{c.body}</p>
          </li>
        ))}</ul>
      ) : <p className="mt-3 text-[15px] text-muted">No comments yet. Be the first to have your say — comments are checked by the newsroom before they appear.</p>}
      <form className="mt-6 space-y-3 border border-line bg-wash p-5" onSubmit={submit}>
        <p className="text-[14px] font-extrabold text-navy">Have your say</p>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,16rem)_1fr]">
          <div><label htmlFor="comment-name" className="sr-only">Your name</label><input id="comment-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={60} autoComplete="name" className={`${inputCls} h-12`} /></div>
          <div><label htmlFor="comment-body" className="sr-only">Your comment</label><textarea id="comment-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your comment" maxLength={800} rows={3} className={`${inputCls} resize-y`} /></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="submit" disabled={sending} className="inline-flex h-12 cursor-pointer items-center gap-2 bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong disabled:cursor-progress disabled:opacity-70">{sending ? "Sending…" : "Post comment"}</button>
          <p className="text-[12.5px] text-muted">Comments are moderated by the newsroom before they appear.</p>
        </div>
        {notice && <p role={notice.tone === "error" ? "alert" : "status"} className={`text-[14px] font-bold ${notice.tone === "error" ? "text-brand" : "text-[#0b5a2e]"}`}>{notice.text}</p>}
      </form>
    </section>
  );
}
function truncateForwardText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > max * 0.6 ? lastSpace : max - 1).replace(/[\s,;:.–—-]+$/, "")}…`;
}
function ArticleForwardIcons({ item }: { item: NewsItem }) {
  const storyUrl = /^https:\/\/180news\.co\.za\/story\//.test(item.link) ? item.link : `https://180news.co.za${storyPath(item)}`;
  const summary = truncateForwardText(item.summary || (item.body ?? "").split(/\n\s*\n/).find((p) => p.trim()) || "", 240);
  const forwardText = `${summary ? `${item.title}\n\n${summary}` : item.title}\n\n${storyUrl}`;
  const encodedUrl = encodeURIComponent(storyUrl);
  const hrefFor = (label: string) => {
    switch (label) {
      case "Facebook":
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(truncateForwardText(summary ? `${item.title}\n\n${summary}` : item.title, 360))}`;
      case "X (Twitter)":
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(truncateForwardText(summary ? `${item.title}\n\n${summary}` : item.title, 225))}&url=${encodedUrl}`;
      case "WhatsApp channel":
        return `https://wa.me/?text=${encodeURIComponent(forwardText)}`;
      default:
        return "https://www.instagram.com/";
    }
  };
  const forwardToOwnInstagram = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, text: summary ? `${item.title}\n\n${summary}` : item.title, url: storyUrl });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
    try {
      await navigator.clipboard?.writeText(forwardText);
    } catch {
      // The reader's own Instagram still opens; they can paste or type the link there.
    }
  };
  return (
    <nav aria-label="Forward this article to your socials" className="flex items-center">
      <h2 className="sr-only">Forward this article to your socials</h2>
      <ul className="flex flex-wrap gap-2">
        {SOCIALS.map((s) => {
          const label = s.label === "WhatsApp channel" ? "WhatsApp" : s.label;
          const icon = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d={s.path} /></svg>;
          const className = "grid size-11 place-items-center rounded-full border border-line text-ink transition-colors hover:border-navy hover:bg-navy hover:text-white";
          return (
            <li key={s.label}>
              {s.label === "Instagram" ? (
                <button type="button" onClick={() => void forwardToOwnInstagram()} aria-label="Forward this article to your Instagram" title="Forward to your Instagram" className={className}>
                  {icon}
                  <span className="sr-only">Forward to your Instagram</span>
                </button>
              ) : (
                <a href={hrefFor(s.label)} target="_blank" rel="noopener noreferrer" aria-label={`Forward this article to your ${label} (opens in a new tab)`} title={`Forward to your ${label}`} className={className}>
                  {icon}
                  <span className="sr-only">Forward to your {label} (opens in a new tab)</span>
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
export function StoryPage() {
  const { id = "" } = useParams();
  const { byId, bySection, all, now } = useNews();
  const { articles: ownArticles, liveAt } = useControl();
  const { saved } = useSaved();
  const item = byId.get(id) ?? saved.find((s) => s.id === id);
  const own = ownArticles.find((a) => a.id === id);
  const scheduled = !!own && (own.publishAt ?? 0) > liveAt;
  const takenDown = !!own?.hidden;
  const exists = !!item || !!own;
  usePageTitle(exists && item ? item.title : exists ? own?.title : undefined);
  const relatedSame = item ? (bySection[item.section] ?? []).filter((x) => x.id !== item.id).slice(0, 6) : [];
  const picks = useMemo(() => {
    const seen = new Set([item?.id ?? id]);
    const read: NewsItem[] = [];
    for (const x of [...relatedSame, ...all]) { if (!seen.has(x.id)) { seen.add(x.id); read.push(x); if (read.length >= 3) break; } }
    const sidebar = relatedSame.filter((x) => !seen.has(x.id) && (seen.add(x.id), true));
    const bottom = all.filter((x) => !seen.has(x.id) && !!x.image && (seen.add(x.id), true)).slice(0, 4);
    return { read, sidebar, bottom };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relatedSame, all, item?.id]);
  if (!exists) return (
    <div className="wrap py-20 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">This story has moved on</h1>
      <p className="mx-auto mt-3 max-w-lg text-[17px] leading-relaxed text-body">180news shows what is in each publisher’s live feed, and this headline has dropped out of it. Stories you save stay available here even after that happens.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-flex h-12 items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong">Go to top stories</Link>
        <Link to="/latest" className="inline-flex h-12 items-center border-2 border-navy px-6 text-[15px] font-extrabold text-navy hover:bg-navy hover:text-white">See the latest</Link>
      </div>
    </div>
  );
  if (!item) return (
    <div className="wrap max-w-3xl py-12" role="status" aria-label="Loading story">
      <div className="h-4 w-40 animate-pulse bg-line/70 motion-reduce:animate-none" /><div className="mt-5 h-10 w-11/12 animate-pulse bg-line/70 motion-reduce:animate-none" /><div className="mt-3 h-10 w-2/3 animate-pulse bg-line/70 motion-reduce:animate-none" /><div className="mt-8 aspect-[16/9] animate-pulse bg-line/70 motion-reduce:animate-none" />
    </div>
  );
  const source = item.sourceId === "180news" ? null : SOURCES[item.sourceId];
  const sourceLabel = sourceName(item.sourceId);
  const section = SECTION_MAP[item.section];
  const hasBody = !!item.body;
  const isCms = isCmsItem(item);
  const cmsId = cmsNumericId(item.id);
  return (
    <div className="pt-6 md:pt-9">
      <div className={`wrap ${isCms ? "" : "grid gap-x-12 gap-y-12 lg:grid-cols-12"}`}>
        <article className={isCms ? "" : "lg:col-span-8"}>
          {scheduled && <p role="status" className="mb-5 border-l-4 border-warn bg-[#fdf1d4] px-4 py-3 text-[15px] font-bold leading-snug text-[#6b4a00]">This article is scheduled. It goes live on the front page {own?.publishAt ? dateTimeSAST(own.publishAt) : ""}. Only this device can see it.</p>}
          {takenDown && <p role="status" className="mb-5 border-l-4 border-warn bg-[#fdf1d4] px-4 py-3 text-[15px] font-bold leading-snug text-[#6b4a00]">This article is taken down. It is not on the app.</p>}
          <nav aria-label="Breadcrumb"><ol className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold">
            <li><Link to="/" className="text-muted hover:text-brand hover:underline">Home</Link></li>
            {section && <li className="flex items-center gap-1.5"><ChevronRight size={14} className="text-muted" aria-hidden="true" /><Link to={`/section/${section.id}`} className="uppercase tracking-[0.04em] text-brand hover:underline">{section.label}</Link></li>}
          </ol></nav>
          <h1 className="mt-3 text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em] text-balance sm:text-[40px] lg:text-[46px] lg:leading-[1.05]">{item.title}</h1>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-line py-3">
            <p className="text-[15px] leading-snug text-body">
              {item.author && <>By <span className="font-bold text-ink">{item.author}</span>, </>}
              <span className="font-bold text-ink">{sourceLabel}</span>
              {item.published !== null && <><br /><time dateTime={new Date(item.published).toISOString()} className="text-[13.5px] text-muted">{dateTimeSAST(item.published)}{item.published <= now ? ` · ${relTime(item.published, now)}` : ""}</time></>}
            </p>
            <SaveButton item={item} withLabel />
          </div>
          {item.image && <figure className="mt-6"><StoryImage item={item} priority className="aspect-[16/9]" /><figcaption className="mt-2 text-[13px] text-muted">{item.imageCaption ? `${item.imageCaption}${item.imageCredit ? ` · ${item.imageCredit}` : ""}` : item.body ? "Picture supplied by the author" : `Image supplied by ${sourceLabel}`}</figcaption></figure>}
          {item.summary && !hasBody && !isCms && <p className="mt-6 max-w-[64ch] text-[19px] leading-[1.6] text-body sm:text-xl sm:leading-[1.6]">{item.summary}</p>}
          {item.media && <MediaBlock item={item} position="before" />}
          {hasBody ? (
            <>
              <div className="mt-6 max-w-[64ch] space-y-5 text-[18px] leading-[1.7] text-body">{(item.body ?? "").split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</div>
              {item.links && item.links.length > 0 && <LinkEmbeds links={item.links} />}
              {own && <div className="mt-6 max-w-[64ch] rounded-sm bg-wash px-4 py-3 text-[14px] text-body">Written for 180news by {own.author}. Stored only in this browser — it shows on this device only.</div>}
              {item.media && <MediaBlock item={item} position="after" />}
            </>
          ) : isCms ? (
            <>
              {item.summary && <p className="mt-6 max-w-[64ch] text-[18px] leading-[1.7] text-body">{item.summary}</p>}
            </>
          ) : (
            <>
              <div className="mt-8 border-l-4 border-brand bg-brand-tint p-5 sm:p-6">
                <p className="max-w-[58ch] text-[15.5px] leading-relaxed text-body">This is {sourceLabel}’s headline and summary, as published in their news feed. The full report is on their website.</p>
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-12 items-center gap-2.5 bg-brand px-6 py-3 text-base font-extrabold text-white transition-colors hover:bg-brand-strong">Read the full story on {sourceLabel}<ExternalLink size={18} strokeWidth={2.5} aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span></a>
              </div>
            </>
          )}
          {!isCms && picks.read.length > 0 && (
            <section aria-labelledby="story-read-more" className="mt-8">
              <h2 id="story-read-more" className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Read more</h2>
              <ul className="mt-2.5 divide-y divide-line">{picks.read.map((v) => <li key={v.id}><Link to={`/story/${v.id}`} className="group flex min-h-11 items-center gap-2 py-2 text-[16px] font-bold text-navy underline decoration-navy/40 underline-offset-[3px] hover:decoration-navy"><span className="min-w-0 flex-1">{v.title}</span><ChevronRight size={16} strokeWidth={2.6} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link></li>)}</ul>
            </section>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="mr-1 text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Tags</h2>
                <ul className="flex flex-wrap gap-2">{item.tags.map((t) => <li key={t}><Link to={tagPath(t)} className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm font-bold text-ink hover:border-navy hover:text-navy">{t}</Link></li>)}</ul>
              </div>
            )}
            {!scheduled && !takenDown && <ArticleForwardIcons item={item} />}
          </div>
          {isCms && cmsId !== null && <StoryComments cmsId={cmsId} />}
          {source && <p className="mt-4 border-t border-line pt-4 text-sm text-muted">More from <a href={source.home} target="_blank" rel="noopener noreferrer" className="font-bold text-navy underline">{source.name}</a></p>}
          {!scheduled && <AdSlot id="article" at="inline" className="mt-9" />}
        </article>
        {!isCms && picks.sidebar.length > 0 && section && (
          <aside aria-labelledby="story-related" className="lg:col-span-4">
            <SectionHead id="story-related" title={`More ${section.label}`} to={`/section/${section.id}`} />
            <ul className="divide-y divide-line">{picks.sidebar.map((v) => <li key={v.id} className="py-3.5 first:pt-0"><TextCard item={v} /></li>)}</ul>
          </aside>
        )}
      </div>
      {!scheduled && <AdSlot id="article" at="below" className="wrap mt-12" />}
      {!isCms && picks.bottom.length > 0 && (
        <section aria-labelledby="story-more" className="wrap mt-14">
          <SectionHead id="story-more" title="Latest headlines" to="/latest" moreLabel="See all" />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 lg:grid-cols-4">{picks.bottom.map((v) => <li key={v.id}><StoryCard item={v} size="sm" /></li>)}</ul>
        </section>
      )}
    </div>
  );
}
const SEARCH_CAP = 60;
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("q") ?? "";
  const query = raw.trim();
  usePageTitle(query ? `Search: ${query}` : "Search");
  const { all, ready } = useNews();
  const { sections } = useControl();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return all.filter((i) => {
      const hay = `${i.title} ${i.summary} ${sourceName(i.sourceId)} ${i.author ?? ""} ${i.category ?? ""} ${(i.tags ?? []).join(" ")}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [all, query]);
  const setQuery = (v: string) => setParams(v ? { q: v } : {}, { replace: true });
  return (
    <div className="wrap max-w-[860px] pt-7 md:pt-10">
      <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">Search</h1>
      <form role="search" onSubmit={(e) => { e.preventDefault(); inputRef.current?.blur(); navigate(`/search?q=${encodeURIComponent(query)}`); }} className="relative mt-5">
        <label htmlFor="page-search" className="sr-only">Search current headlines</label>
        <Search size={20} strokeWidth={2.4} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input ref={inputRef} id="page-search" type="search" value={raw} onChange={(e) => setQuery(e.target.value)} placeholder="Search current headlines" autoComplete="off" enterKeyHint="search" autoFocus={!raw} className="h-14 w-full border-2 border-ink bg-paper pl-12 pr-14 text-lg font-semibold placeholder:font-normal placeholder:text-muted [&::-webkit-search-cancel-button]:hidden" />
        {raw && <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Clear search" className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted hover:bg-wash hover:text-ink"><X size={20} strokeWidth={2.5} aria-hidden="true" /></button>}
      </form>
      <div aria-live="polite" className="mt-4 min-h-6 text-[15px] text-muted">
        {query && ready && <p>{results.length === 0 ? `No current headlines match “${query}”.` : `${results.length} ${results.length === 1 ? "headline matches" : "headlines match"} “${query}”${results.length > SEARCH_CAP ? ` — showing the newest ${SEARCH_CAP}` : ""}`}</p>}
        {query && !ready && <p>Loading headlines…</p>}
      </div>
      {results.length > 0 && <ol className="mt-2 divide-y divide-line border-t border-line">{results.slice(0, SEARCH_CAP).map((i) => <li key={i.id} className="py-4"><RowCard item={i} summary /></li>)}</ol>}
      {(!query || (ready && results.length === 0)) && (
        <div className="mt-6 border-t border-line pt-6">
          <p className="max-w-xl text-[16px] leading-relaxed text-body">{query ? "Search covers the headlines currently in the feeds, so older stories will not appear. Try a shorter phrase, a name or a place — or browse a section." : "Search the headlines currently on 180news by topic, name, place or newsroom — or browse a section."}</p>
          <ul className="mt-4 flex flex-wrap gap-2">{sections.map((s) => <li key={s.id}><Link to={`/section/${s.id}`} className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm font-bold hover:border-navy hover:text-navy">{s.label}</Link></li>)}</ul>
        </div>
      )}
    </div>
  );
}
export function SavedPage() {
  usePageTitle("Saved");
  const { saved, remove } = useSaved();
  return (
    <div className="wrap max-w-[860px] pt-7 md:pt-10">
      <PageHead title="Saved"><p className="mt-2 text-[15px] text-muted" aria-live="polite">{saved.length === 0 ? "Your reading list, kept on this device." : `${saved.length} ${saved.length === 1 ? "story" : "stories"} kept on this device.`}</p></PageHead>
      {saved.length === 0 ? (
        <div className="mt-10 border border-dashed border-line bg-wash px-6 py-14 text-center">
          <Bookmark size={30} strokeWidth={2} className="mx-auto text-navy" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Nothing saved yet</h2>
          <p className="mx-auto mt-2 max-w-md text-[16px] leading-relaxed text-body">Tap the bookmark on any story to keep it here. Saved stories stay available even after they leave the live feeds.</p>
          <Link to="/" className="mt-6 inline-flex h-12 items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong">Browse top stories</Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line border-b border-line">
          {saved.map((u) => (
            <li key={u.id} className="flex items-start gap-4 py-5">
              <div className="group relative flex min-w-0 flex-1 items-start gap-4">
                <StoryImage item={u} className="aspect-[4/3] w-[96px] shrink-0 sm:w-[150px]" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[17px] font-extrabold leading-[1.25] tracking-[-0.005em] sm:text-xl"><Link to={`/story/${u.id}`} className="decoration-brand decoration-2 underline-offset-[3px] after:absolute after:inset-0 after:content-[''] group-hover:underline">{u.title}</Link></h2>
                  <p className="mt-1.5 text-[12.5px] leading-5"><span className="font-extrabold uppercase tracking-[0.04em] text-brand">{sourceName(u.sourceId)}</span>{u.published !== null && <span className="text-muted"> · {dateTimeSAST(u.published)}</span>}</p>
                </div>
              </div>
              <button type="button" onClick={() => remove(u.id)} aria-label={`Remove from saved: ${u.title}`} title="Remove from saved" className="-mr-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-brand-tint hover:text-brand"><Trash2 size={19} strokeWidth={2.2} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export function TagPage() {
  const { tag = "" } = useParams();
  const wanted = decodeURIComponent(tag).toLowerCase();
  usePageTitle(`Tag: ${wanted}`);
  const { ready, all } = useNews();
  const matches = all.filter((i) => i.tags?.some((t) => t.toLowerCase() === wanted) || i.category?.toLowerCase() === wanted);
  const label = wanted.trim() || "Tag";
  return (
    <div className="wrap max-w-[860px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <p className="text-sm font-black uppercase tracking-[0.08em] text-brand">Tag</p>
        <h1 className="mt-1 break-words text-4xl font-black leading-none tracking-[-0.02em] md:text-5xl">{label}</h1>
        <p className="mt-2 text-[15px] text-muted" aria-live="polite">{!ready && matches.length === 0 ? "Loading…" : `${matches.length} ${matches.length === 1 ? "story" : "stories"}`}</p>
      </header>
      {matches.length > 0 ? <ol className="mt-6 divide-y divide-line border-y border-line">{matches.map((i) => <li key={i.id} className="py-4"><TextCard item={i} /></li>)}</ol> : ready && (
        <div className="mt-8"><p className="max-w-xl text-[16px] leading-relaxed text-body">No current stories carry this tag. Tags only cover what is on 180news right now.</p><Link to="/" className="mt-5 inline-flex h-12 items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong">Go to top stories</Link></div>
      )}
    </div>
  );
}
