import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUp, Bookmark, ChevronRight, Clock, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Home, Moon, Pause, Play, RefreshCw, Search, Sun } from "lucide-react";
import { useControl, useNews, useSaved } from "./lib/providers";
import { useRand, useWeatherCity, useLotto, useIec, randText, type RandRates } from "./lib/extras";
import { CITIES, SOURCES, fullDate, relTime, dayShort, timeOrDate, dateTimeSAST, sourceName, storyPath, telHref, weatherFor, fmtNum, type NewsItem } from "./lib/data";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <picture>
      <source srcSet="/logo.webp" type="image/webp" />
      <img src="/logo.png" alt="180° News" width={480} height={274} className={className} />
    </picture>
  );
}
const WEATHER_ICONS: Record<string, typeof Sun> = { clear: Sun, partly: CloudSun, cloudy: Cloud, fog: CloudFog, drizzle: CloudDrizzle, rain: CloudRain, snow: CloudSnow, storm: CloudLightning };
function WeatherWidget() {
  const { city, weather, chooseCity } = useWeatherCity();
  const info = weather ? weatherFor(weather.code) : null;
  const Icon = info ? (info.kind === "clear" && weather && !weather.isDay ? Moon : WEATHER_ICONS[info.kind]) : Cloud;
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon size={16} strokeWidth={2.2} className="shrink-0 text-white/80" aria-hidden="true" />
      <span className="shrink-0 font-bold tabular-nums" aria-live="polite">
        {weather && info ? <>{Math.round(weather.temp)}°<span className="sr-only">C, {info.label}</span></> : <span className="text-white/60">–°</span>}
      </span>
      <label className="sr-only" htmlFor="weather-city">Weather city</label>
      <select id="weather-city" value={city.id} onChange={(e) => chooseCity(e.target.value)} className="h-9 min-w-0 max-w-[7rem] cursor-pointer truncate rounded bg-transparent pr-1 font-semibold text-white hover:underline sm:max-w-[9.5rem]">
        {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  );
}
function RandStrip({ className = "" }: { className?: string }) {
  const rates = useRand();
  if (!rates) return null;
  const rows: [string, number][] = [["US dollar", rates.usd], ["Euro", rates.eur], ["British pound", rates.gbp]];
  const symbols = ["$", "€", "£"];
  return (
    <dl className={`items-center gap-4 ${className}`} title={`Daily reference rates, ${dayShort(rates.updatedAt)}`}>
      {rows.map(([name, val], i) => (
        <div key={name} className="flex items-baseline gap-1.5">
          <dt className="text-white/70"><span aria-hidden="true">R/{symbols[i]}</span><span className="sr-only">Rand per {name}</span></dt>
          <dd className="font-bold tabular-nums">{val.toFixed(2)}</dd>
        </div>
      ))}
    </dl>
  );
}
export function RandWatch() {
  const rates = useRand();
  if (!rates) return null;
  const rows: [string, string, number][] = [["US dollar", "USD", rates.usd], ["Euro", "EUR", rates.eur], ["British pound", "GBP", rates.gbp]];
  return (
    <aside aria-labelledby="rand-watch" className="border border-line bg-wash p-5">
      <h3 id="rand-watch" className="text-sm font-black uppercase tracking-[0.04em] text-navy">Rand watch</h3>
      <dl className="mt-3 divide-y divide-line">
        {rows.map(([name, code, val]) => (
          <div key={code} className="flex items-baseline justify-between gap-3 py-2.5">
            <dt className="text-[15px] font-semibold text-body">{name} <span className="text-muted">{code}</span></dt>
            <dd className="text-xl font-extrabold tabular-nums text-ink">{randText(val)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12.5px] leading-snug text-muted">What one unit costs in rand. Daily reference rates, updated {dayShort(rates.updatedAt)} — not live trading prices. <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-navy">Rates by ExchangeRate-API</a></p>
    </aside>
  );
}
function LiveStatus() {
  const { status, refreshing, refresh, now } = useNews();
  let prefix = ""; let label: string; let dot: string;
  if (status.kind === "live" && status.at) { prefix = "Live · "; label = timeOrDate(status.at, now); dot = "bg-live live-dot"; }
  else if (status.kind === "loading") { label = "Updating…"; dot = "bg-white/60"; }
  else if (status.kind === "saved" && status.at) { prefix = "Last updated "; label = timeOrDate(status.at, now); dot = "bg-warn"; }
  else { label = "Feeds unreachable"; dot = "bg-warn"; }
  const saved = status.kind === "saved";
  return (
    <button type="button" onClick={refresh} disabled={refreshing} aria-label={`${prefix}${label}. Refresh headlines`} title="Refresh headlines" className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded px-1 font-bold hover:underline disabled:cursor-progress">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      <span>{prefix && <span className={saved ? "hidden sm:inline" : ""}>{prefix}</span>}{label}</span>
      <RefreshCw size={14} strokeWidth={2.5} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />
    </button>
  );
}
function TopBar() {
  const { now } = useNews();
  return (
    <div className="on-dark bg-navy-deep text-[12.5px] text-white">
      <div className="wrap flex h-10 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-5">
          <p className="hidden shrink-0 font-semibold md:block">{fullDate(now)}</p>
          <WeatherWidget />
        </div>
        <div className="flex items-center gap-6">
          <RandStrip className="hidden lg:flex" />
          <LiveStatus />
        </div>
      </div>
    </div>
  );
}
const CRAWL_SPEEDS: Record<string, number> = { slow: 38, normal: 64, fast: 104 };
const estWidth = (s: string) => s.length * 8.2 + 190;
function Crawl() {
  const { all, now } = useNews();
  const [paused, setPaused] = useState(false);
  const { settings } = useControl();
  const message = settings.crawlMessage.trim();
  const items = all.slice(0, 12);
  if (!settings.crawlEnabled || (items.length === 0 && !message)) return null;
  const total = items.reduce((s, m) => s + estWidth(m.title), message ? estWidth(message) : 0);
  const duration = Math.max(12, Math.round(total / CRAWL_SPEEDS[settings.crawlSpeed]));
  const renderList = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {message && (
        <li className="flex shrink-0 items-center whitespace-nowrap">
          <span className="mr-2.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase leading-none tracking-[0.08em] text-navy-deep">Notice</span>
          <span className="text-[14.5px] font-bold text-white sm:text-[15px]">{message}</span>
          <span className="mx-5 size-1.5 rounded-full bg-white/55" aria-hidden="true" />
        </li>
      )}
      {items.map((m) => (
        <li key={m.id} className="flex shrink-0 items-center whitespace-nowrap">
          <Link to={`/story/${m.id}`} tabIndex={paused ? -1 : undefined} className="text-[14.5px] font-bold text-white decoration-white decoration-2 underline-offset-[3px] hover:underline sm:text-[15px]">{m.title}</Link>
          <span className="ml-2.5 text-[12.5px] font-semibold text-white/80">{sourceName(m.sourceId)} · {relTime(m.published, now)}</span>
          <span className="mx-5 size-1.5 rounded-full bg-white/55" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Latest headlines" className="on-dark glass-navy flex h-11 items-center gap-1 pl-1.5 pr-1">
      <span className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full bg-brand px-3.5 text-[11.5px] font-black uppercase leading-none tracking-[0.08em] text-white">
        <span className="live-dot size-1.5 rounded-full bg-white [--pulse-color:#ffffff]" aria-hidden="true" />Latest
      </span>
      <div className="crawl-track min-w-0 flex-1 overflow-hidden" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) e.currentTarget.scrollLeft = 0; }}>
        <div className="crawl flex w-max" data-paused={paused} style={{ animationDuration: `${duration}s` }}>
          {renderList(false)}{renderList(true)}
        </div>
      </div>
      <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play headline crawl" : "Pause headline crawl"} title={paused ? "Play" : "Pause"} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-white/80 hover:bg-white/15 hover:text-white motion-reduce:hidden">
        {paused ? <Play size={16} strokeWidth={2.6} aria-hidden="true" /> : <Pause size={16} strokeWidth={2.6} aria-hidden="true" />}
      </button>
    </section>
  );
}
export function PendingPill() {
  const { pendingCount, applyPending } = useNews();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[116px] z-50 flex justify-center px-4">
      {pendingCount > 0 && (
        <button type="button" onClick={applyPending} className="rise pointer-events-auto inline-flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-brand px-5 text-sm font-extrabold text-white shadow-[0_8px_24px_rgb(2_3_79_/_0.28)] hover:bg-brand-strong">
          {pendingCount} new {pendingCount === 1 ? "story" : "stories"}
        </button>
      )}
    </div>
  );
}
/* CMS is the only master controller for adverts. This component renders a
   creative only while the CMS is actively serving adverts through its live
   public API. Bundle/stale records, a disabled CMS slot or switch, or a
   missing creative render nothing (no local house-ad fallback). */
export function CmsBanner({ slot, className = "" }: { slot: string; className?: string }) {
  const { cmsAds, adsEnabled, cmsAdsStatus } = useNews();
  if (!adsEnabled || cmsAdsStatus.state !== "live") return null;
  const ad = cmsAds.find((candidate) => candidate.slot === slot && candidate.enabled && candidate.image);
  if (!ad?.image) return null;
  const w = ad.width && ad.width > 0 ? ad.width : undefined;
  const h = ad.height && ad.height > 0 ? ad.height : undefined;
  const image = <img src={ad.image} alt={ad.advertiser ? `Advertisement — ${ad.advertiser}` : "Advertisement"} width={w} height={h} className={w && h ? "mx-auto block max-w-full object-contain" : "mx-auto block max-h-48 w-full max-w-full object-contain"} style={w && h ? { width: w, height: "auto", aspectRatio: `${w} / ${h}` } : undefined} />;
  return (
    <aside aria-label="Advertisement" data-ad-slot={slot} data-ad-id={ad.id} data-ad-size={w && h ? `${w}x${h}` : "fluid"} className={className}>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Advertisement{w && h ? ` · ${w}×${h}` : ""}</p>
      <div className="bg-wash">
        {ad.linkUrl ? <a href={ad.linkUrl} target="_blank" rel="sponsored noopener noreferrer" className="block">{image}<span className="sr-only">(opens in a new tab)</span></a> : image}
      </div>
      {ad.advertiser && <p className="mt-1.5 text-[12px] text-muted">Presented by {ad.advertiser}</p>}
    </aside>
  );
}
const CMS_SLOT_BY_PLACEMENT: Record<string, Record<string, string>> = {
  home: { top: "mid", middle: "sidebar", bottom: "bottom" },
  article: { inline: "inarticle", below: "bottom" },
};
export function AdSlot({ id, at, className = "" }: { id: "home" | "article"; at: string; className?: string }) {
  const slot = CMS_SLOT_BY_PLACEMENT[id]?.[at];
  return slot ? <CmsBanner slot={slot} className={className} /> : null;
}
function BannerAd({ at }: { at: string }) {
  // CMS "top" slot above the section nav, with its phone-optimised "mobile"
  // slot underneath on small screens — the same placement the CMS uses.
  if (at !== "abovemenu") return null;
  return (
    <>
      <CmsBanner slot="top" className="border-b border-line bg-wash px-4 py-2 text-center mb-3 border-t" />
      <div className="md:hidden">
        <CmsBanner slot="mobile" className="border-b border-line bg-wash px-4 py-2 text-center mb-3" />
      </div>
    </>
  );
}
function routeKind(pathname: string): string | null {
  const p = pathname.split(/[?#]/)[0];
  return p === "/admin" ? "account" : p === "/submit" ? "write" : p === "/admin/team" ? "team" : (p === "/control" || p.startsWith("/admin/")) ? "tools" : null;
}
function SearchForm({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const initial = location.pathname === "/search" ? params.get("q") ?? "" : "";
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };
  return (
    <form role="search" onSubmit={onSubmit} className={`hidden w-full max-w-sm items-stretch ${compact ? "lg:flex" : "md:flex"}`}>
      <label htmlFor="site-search" className="sr-only">Search headlines</label>
      <input id="site-search" name="q" type="search" defaultValue={initial} placeholder="Search headlines" autoComplete="off" className="h-11 min-w-0 flex-1 border border-r-0 border-line bg-wash px-3.5 text-[15px] placeholder:text-muted focus:bg-paper" />
      <button type="submit" aria-label="Search" className="grid h-11 w-12 cursor-pointer place-items-center bg-navy text-white transition-colors hover:bg-navy-deep"><Search size={18} strokeWidth={2.5} aria-hidden="true" /></button>
    </form>
  );
}
function SectionNav() {
  const listRef = useRef<HTMLUListElement>(null);
  const { sections } = useControl();
  const { pathname } = useLocation();
  useEffect(() => {
    const el = listRef.current; const active = el?.querySelector('[aria-current="page"]') as HTMLElement | null;
    if (!el || !active) return;
    el.scrollLeft = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
  }, [pathname]);
  const cls = ({ isActive }: { isActive: boolean }) => `relative flex h-12 items-center whitespace-nowrap px-3 text-[15px] font-bold transition-colors after:absolute after:inset-x-3 after:bottom-1.5 after:h-[3px] after:rounded-full after:content-[''] ${isActive ? "text-brand after:bg-brand" : "text-ink hover:text-brand"}`;
  return (
    <div className="sticky top-2 z-40">
      <div className="wrap">
        <div className="glass-bar">
          <nav aria-label="Sections" className="glass px-1 sm:px-2">
            <ul ref={listRef} className="no-scrollbar relative flex overflow-x-auto pr-6 [mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)] lg:pr-0 lg:[mask-image:none]">
              <li><NavLink to="/" end className={cls}>Top stories</NavLink></li>
              <li><NavLink to="/latest" className={cls}>Latest</NavLink></li>
              {sections.map((s) => (
                <React.Fragment key={s.id}>
                  <li><NavLink to={`/section/${s.id}`} className={cls}>{s.label}</NavLink></li>
                  {s.id === "elections" && <li><NavLink to="/results" className={cls}>IEC results</NavLink></li>}
                </React.Fragment>
              ))}
            </ul>
          </nav>
          <Crawl />
        </div>
      </div>
    </div>
  );
}
export function SiteHeader() {
  const { saved } = useSaved();
  const { pathname } = useLocation();
  const plain = routeKind(pathname) === null;
  return (
    <>
      <header>
        <TopBar />
        <div className="wrap flex items-center gap-4 py-2 md:gap-8 md:py-3">
          <Link to="/" aria-label="180news — home" className="shrink-0"><Logo className="h-[52px] w-auto md:h-[76px]" /></Link>
          <div className="ml-auto flex flex-1 items-center justify-end gap-3">
            <SearchForm />
            <Link to="/saved" className="hidden h-11 shrink-0 items-center gap-2 border border-line px-4 text-[15px] font-bold transition-colors hover:border-brand hover:text-brand md:inline-flex">
              <Bookmark size={17} strokeWidth={2.3} aria-hidden="true" />Saved
              {saved.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-extrabold text-white">{saved.length}<span className="sr-only"> stories</span></span>}
            </Link>
            <Link to="/search" aria-label="Search headlines" className="grid size-11 place-items-center rounded-full text-ink hover:bg-wash md:hidden"><Search size={22} strokeWidth={2.3} aria-hidden="true" /></Link>
          </div>
        </div>
      </header>
      {plain && <BannerAd at="abovemenu" />}
      <SectionNav />
    </>
  );
}
export const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61577988715628", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
  { label: "X (Twitter)", href: "https://x.com/180DegreesNews", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  { label: "Instagram", href: "https://www.instagram.com/180degressnews/", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" },
  { label: "WhatsApp channel", href: "https://www.whatsapp.com/channel/0029VbBLaNJLY6d9zl6t6Z43", path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.666.134-.181.298-.46.446-.689.149-.229.223-.347.335-.521.111-.174.074-.348-.037-.521-.111-.174-.978-2.349-1.341-3.208-.363-.858-.752-.735-.996-.75-.242-.013-.512-.016-.782-.016-.27 0-.705.101-1.074.475-.369.374-1.408 1.376-1.408 3.357s1.441 3.886 1.642 4.157c.2.271 2.83 4.318 6.855 5.051.956.169 1.703.231 2.283.284.963.092 1.836-.164 2.435-.655.6-.492.963-1.352.963-2.285 0-.284-.149-1.126-.423-1.458-.274-.333-1.006-.669-1.202-.817zM12.05 2C6.495 2 2 6.495 2 12.05c0 1.765.462 3.493 1.34 5.01L2 22l5.07-1.32a10.02 10.02 0 0 0 4.98 1.32c5.555 0 10.05-4.495 10.05-10.05S17.605 2 12.05 2zm0 18.1c-1.51 0-2.99-.405-4.28-1.17l-.31-.185-3.09.81.825-3.01-.2-.315a8.06 8.06 0 0 1-1.235-4.29c0-4.455 3.63-8.085 8.09-8.085 2.16 0 4.19.845 5.72 2.37a8.03 8.03 0 0 1 2.365 5.715c0 4.455-3.63 8.085-8.085 8.085z" },
];
export function SiteFooter() {
  const year = new Date().getFullYear();
  const { settings, sections } = useControl();
  const linkCls = "inline-flex min-h-9 items-center text-[15px] text-white/85 hover:text-white hover:underline";
  return (
    <footer className="on-dark mt-16 bg-navy-deep pb-[calc(82px+env(safe-area-inset-bottom))] text-white md:pb-0">
      <div className="wrap grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link to="/" aria-label="180news — home" className="inline-block bg-white px-4 py-3"><Logo className="h-16 w-auto" /></Link>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/85">180news brings the latest headlines from South African and international newsrooms onto one front page. Every story links to the publisher that reported it.</p>
          <div className="mt-5">
            <h2 className="text-sm font-black uppercase tracking-[0.06em]">Follow 180news</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`180news on ${s.label} (opens in a new tab)`} title={s.label} className="grid size-11 place-items-center border border-white/25 bg-white/10 text-white transition-colors hover:bg-white hover:text-navy-deep">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d={s.path} /></svg>
                    <span className="sr-only">{s.label} (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-4 text-[15px] font-bold">180news.co.za</p>
          <address className="mt-3 not-italic">
            <h2 className="sr-only">Contact the newsroom</h2>
            <ul>
              <li><a href={`mailto:${settings.email}`} className="inline-flex min-h-11 items-center gap-2.5 text-[15px] font-semibold text-white hover:underline"><span className="sr-only">Email: </span><span className="break-all">{settings.email}</span></a></li>
              <li><a href={telHref(settings.phone)} className="inline-flex min-h-11 items-center gap-2.5 text-[15px] font-semibold tabular-nums text-white hover:underline"><span className="sr-only">Phone: </span>{settings.phone}</a></li>
            </ul>
          </address>
          <div className="mt-4 max-w-sm border border-white/25 bg-white/10 px-4 py-3">
            <h2 className="flex items-center gap-2.5 text-sm font-black uppercase tracking-[0.06em]">Advertise with us</h2>
            <p className="text-[15px] text-white/85">Call: <a href={telHref(settings.adPhone)} className="inline-flex min-h-11 items-center font-bold tabular-nums text-white hover:underline">{settings.adPhone}</a></p>
          </div>
        </div>
        <nav aria-label="Footer sections" className="md:col-span-3">
          <h2 className="text-sm font-black uppercase tracking-[0.06em]">Sections</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-6">
            <li><Link to="/" className={linkCls}>Top stories</Link></li>
            <li><Link to="/latest" className={linkCls}>Latest</Link></li>
            {sections.map((s) => <li key={s.id}><Link to={`/section/${s.id}`} className={linkCls}>{s.label}</Link></li>)}
          </ul>
        </nav>
        <nav aria-label="News sources" className="md:col-span-3">
          <h2 className="text-sm font-black uppercase tracking-[0.06em]">Sources</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-6">
            {Object.values(SOURCES).map((s) => <li key={s.id}><a href={s.home} target="_blank" rel="noopener noreferrer" className={linkCls}>{s.name}</a></li>)}
          </ul>
        </nav>
        <nav aria-label="About and policies" className="md:col-span-2">
          <h2 className="text-sm font-black uppercase tracking-[0.06em]">About 180news</h2>
          <ul className="mt-3">
            <li><Link to="/about" className={linkCls}>About &amp; feed status</Link></li>
            <li><Link to="/policy" className={linkCls}>Privacy Policy</Link></li>
            <li><Link to="/terms" className={linkCls}>Terms &amp; Conditions</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/20">
        <div className="wrap flex flex-col gap-2 py-5 text-[13px] leading-relaxed text-white/75 md:flex-row md:items-center md:justify-between">
          <p>© {year} 180news. Headlines, summaries and images belong to their respective publishers.</p>
          <p>Weather by <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Open-Meteo</a> · <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Rates by ExchangeRate-API</a></p>
        </div>
      </div>
    </footer>
  );
}
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  };
  return (
    <button type="button" onClick={scrollToTop} aria-label="Back to top" title="Back to top" className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 grid size-11 cursor-pointer place-items-center rounded-full bg-navy-deep text-white shadow-[0_8px_24px_rgb(2_3_79_/_0.28)] transition-colors hover:bg-brand md:bottom-6 md:right-6">
      <ArrowUp size={20} strokeWidth={2.5} aria-hidden="true" />
      <span className="sr-only">Back to top</span>
    </button>
  );
}
export function MobileNav() {
  const { saved } = useSaved();
  const items = [
    { to: "/", label: "Home", icon: Home, end: true, badge: 0 },
    { to: "/latest", label: "Latest", icon: Clock, end: false, badge: 0 },
    { to: "/search", label: "Search", icon: Search, end: false, badge: 0 },
    { to: "/saved", label: "Saved", icon: Bookmark, end: false, badge: saved.length },
  ];
  return (
    <nav aria-label="App" className="glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 overflow-hidden rounded-[22px] md:hidden">
      <ul className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon, end, badge }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={({ isActive }) => `relative flex h-[58px] flex-col items-center justify-center gap-1 text-[11.5px] font-bold before:absolute before:inset-x-4 before:top-0 before:h-[3px] before:rounded-b-full before:content-[''] ${isActive ? "text-brand before:bg-brand" : "text-body"}`}>
              <span className="relative"><Icon size={21} strokeWidth={2.2} aria-hidden="true" />{badge > 0 && <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-extrabold leading-none text-white">{badge > 99 ? "99+" : badge}</span>}</span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
/* Story building blocks */
export function SectionHead({ id, title, to, moreLabel, dark = false, children }: { id: string; title: string; to?: string; moreLabel?: string; dark?: boolean; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 id={id} className={`text-[21px] font-black uppercase leading-none tracking-[-0.01em] sm:text-2xl ${dark ? "text-white" : "text-ink"}`}>
        {to ? <Link to={to} className={dark ? "hover:underline" : "hover:text-brand"}>{title}</Link> : title}
      </h2>
      {children}
      {to && moreLabel && <Link to={to} className={`-my-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-bold hover:underline ${dark ? "text-white" : "text-navy"}`}>{moreLabel}<ChevronRight size={16} strokeWidth={2.5} aria-hidden="true" /></Link>}
    </div>
  );
}
export function SaveButton({ item, dark = false, withLabel = false, className = "" }: { item: NewsItem; dark?: boolean; withLabel?: boolean; className?: string }) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(item.id);
  const tone = dark ? (saved ? "text-white" : "text-white/70 hover:text-white") : (saved ? "text-brand" : "text-muted hover:text-brand");
  return (
    <button type="button" onClick={() => toggle(item)} aria-pressed={saved} aria-label={withLabel ? undefined : saved ? `Remove from saved: ${item.title}` : `Save for later: ${item.title}`} title={saved ? "Remove from saved" : "Save for later"} className={`relative z-10 inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full transition-colors ${withLabel ? "h-11 border border-line px-4 text-sm font-bold hover:border-brand" : "-my-2 -mr-2 size-10"} ${tone} ${className}`}>
      <Bookmark size={withLabel ? 18 : 17} strokeWidth={2.2} fill={saved ? "currentColor" : "none"} fillOpacity={saved ? 0.15 : 0} aria-hidden="true" />
      {withLabel && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
export function StoryImage({ item, className = "aspect-[16/9]", priority = false }: { item: NewsItem; className?: string; priority?: boolean }) {
  const tile = (
    <div className="dot-tile absolute inset-0 flex items-end p-3" aria-hidden="true">
      <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/85">{item.sourceId === "180news" ? "180news" : item.sourceId.replace(/-/, " ")}</span>
    </div>
  );
  if (!item.image) {
    const video = item.media?.find((m) => m.kind === "video" && m.url);
    if (video) return (
      <div className={`relative overflow-hidden bg-ink ${className}`}>
        <video src={`${video.url}#t=0.001`} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        <span aria-hidden="true" className="absolute bottom-2 left-2 rounded-sm bg-ink/80 px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-white">Video</span>
      </div>
    );
    return <div className={`relative overflow-hidden bg-wash ${className}`}>{tile}</div>;
  }
  return (
    <div className={`relative overflow-hidden bg-wash ${className}`}>
      <img src={item.image} alt="" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
    </div>
  );
}
export const STRETCH = "after:absolute after:inset-0 after:content-['']";
export function StoryMeta({ item, dark = false, className = "" }: { item: NewsItem; dark?: boolean; className?: string }) {
  const { now } = useNews();
  const rel = relTime(item.published, now);
  return (
    <p className={`flex min-w-0 items-center gap-x-2 text-[12.5px] leading-5 ${className}`}>
      <span className={`truncate font-extrabold uppercase tracking-[0.04em] ${dark ? "text-white" : "text-brand"}`}>{sourceName(item.sourceId)}</span>
      {rel && item.published !== null && <time dateTime={new Date(item.published).toISOString()} title={dateTimeSAST(item.published)} className={`shrink-0 ${dark ? "text-white/70" : "text-muted"}`}>{rel}</time>}
    </p>
  );
}
export function LeadCard({ item }: { item: NewsItem }) {
  return (
    <article className="group relative">
      {(item.image || !item.body) && <StoryImage item={item} priority className="mb-4 aspect-[16/10] sm:aspect-[16/9]" />}
      <div>
        <h2 className="text-[27px] font-extrabold leading-[1.1] tracking-[-0.015em] text-balance sm:text-4xl lg:text-[40px] lg:leading-[1.06]">
          <Link to={storyPath(item)} className={`${STRETCH} decoration-brand decoration-[3px] underline-offset-4 group-hover:underline`}>{item.title}</Link>
        </h2>
        {item.summary && <p className="mt-3 max-w-[62ch] text-[17px] leading-relaxed text-body">{item.summary}</p>}
        <div className="mt-3 flex items-center justify-between gap-3"><StoryMeta item={item} /><SaveButton item={item} /></div>
      </div>
    </article>
  );
}
const CARD_SIZES: Record<string, string> = { sm: "text-[15px] leading-[1.25] sm:text-base", md: "text-[17px] leading-[1.22] sm:text-lg", lg: "text-[22px] leading-[1.14] sm:text-[26px]" };
export function StoryCard({ item, size = "md", summary = false, dark = false, save = true }: { item: NewsItem; size?: "sm" | "md" | "lg"; summary?: boolean; dark?: boolean; save?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col">
      <StoryImage item={item} />
      <h3 className={`mt-3 font-extrabold tracking-[-0.01em] text-balance ${CARD_SIZES[size]} ${dark ? "text-white" : "text-ink"}`}>
        <Link to={storyPath(item)} className={`${STRETCH} decoration-2 underline-offset-[3px] group-hover:underline ${dark ? "decoration-white" : "decoration-brand"}`}>{item.title}</Link>
      </h3>
      {summary && item.summary && <p className={`mt-2 line-clamp-3 text-[15px] leading-relaxed ${dark ? "text-white/80" : "text-body"}`}>{item.summary}</p>}
      <div className="mt-auto flex items-center justify-between gap-2 pt-2.5"><StoryMeta item={item} dark={dark} />{save && <SaveButton item={item} dark={dark} />}</div>
    </article>
  );
}
export function RowCard({ item, thumb = true, dark = false, summary = false }: { item: NewsItem; thumb?: boolean; dark?: boolean; summary?: boolean }) {
  return (
    <article className="group relative flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <h3 className={`text-base font-bold leading-[1.28] tracking-[-0.005em] sm:text-[17px] ${dark ? "text-white" : "text-ink"}`}>
          <Link to={storyPath(item)} className={`${STRETCH} decoration-2 underline-offset-[3px] group-hover:underline ${dark ? "decoration-white" : "decoration-brand"}`}>{item.title}</Link>
        </h3>
        {summary && item.summary && <p className={`mt-1.5 line-clamp-2 text-[15px] leading-relaxed ${dark ? "text-white/80" : "text-body"}`}>{item.summary}</p>}
        <StoryMeta item={item} dark={dark} className="mt-1.5" />
      </div>
      {thumb && item.image && <StoryImage item={item} className="aspect-[4/3] w-[104px] shrink-0 sm:w-[128px]" />}
    </article>
  );
}
export function TextCard({ item, dark = false }: { item: NewsItem; dark?: boolean }) {
  return (
    <article className="group relative">
      <h3 className={`text-[15.5px] font-bold leading-[1.3] ${dark ? "text-white" : "text-ink"}`}>
        <Link to={storyPath(item)} className={`${STRETCH} decoration-2 underline-offset-[3px] group-hover:underline ${dark ? "decoration-white" : "decoration-brand"}`}>{item.title}</Link>
      </h3>
      <StoryMeta item={item} dark={dark} className="mt-1" />
    </article>
  );
}
const LOTTO_STYLES: Record<string, { ball: string; special: string; chip: string }> = {
  lotto: { ball: "bg-brand text-white", special: "bg-warn text-navy-deep", chip: "bg-brand text-white" },
  "lotto-plus-1": { ball: "bg-brand-strong text-white", special: "bg-warn text-navy-deep", chip: "bg-brand-strong text-white" },
  "daily-lotto": { ball: "bg-live text-navy-deep", special: "", chip: "bg-live text-navy-deep" },
  powerball: { ball: "bg-navy text-white", special: "bg-brand text-white", chip: "bg-navy text-white" },
  "powerball-plus": { ball: "bg-navy-deep text-white", special: "bg-brand text-white", chip: "bg-navy-deep text-white" },
};
export function LottoResults() {
  const data = useLotto();
  if (!data) return null;
  return (
    <aside aria-labelledby="lotto-results" className="border border-line bg-paper">
      <div className="on-dark dot-band lotto-head">
        <h3 id="lotto-results" className="text-sm font-black uppercase tracking-[0.04em]">Lotto results</h3>
        <span className="flex items-center gap-1.5" aria-hidden="true"><span className="lotto-dot bg-brand" /><span className="lotto-dot bg-warn" /><span className="lotto-dot bg-live" /></span>
      </div>
      <dl className="lotto-body">
        {data.games.map((g) => {
          const style = LOTTO_STYLES[g.key] ?? { ball: "bg-navy text-white", special: "bg-warn text-navy-deep", chip: "bg-navy text-white" };
          return (
            <div key={g.key} className="lotto-row">
              <dt className="flex items-baseline justify-between gap-3"><span className={`lotto-chip ${style.chip}`}>{g.label}</span>{g.drawDate && <span className="lotto-date text-muted">{g.drawDate}</span>}</dt>
              <dd className="lotto-balls" aria-label={`Winning numbers: ${g.numbers.join(", ")}${g.special ? `, ${g.special}` : ""}`}>
                {g.numbers.map((n) => <span key={n} className={`lotto-ball ${style.ball}`}>{n}</span>)}
                {g.special !== undefined && <span className={`lotto-ball ${style.special}`} title={g.key.startsWith("powerball") ? "PowerBall" : "Bonus ball"}>{g.special}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="lotto-foot text-muted">Winning numbers from the South African national lottery{data.fetchedAt ? `, updated ${new Date(data.fetchedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}` : ""}. <a href="https://www.nationallottery.co.za" target="_blank" rel="noopener noreferrer" className="lotto-link">Verify on the official site</a>. 18+ only — play responsibly.</p>
    </aside>
  );
}
const IEC_BTN = "inline-flex h-11 items-center gap-1.5 border-2 border-navy px-4 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white";
export function IecSummary({ className = "" }: { className?: string }) {
  const { settings } = useControl();
  const { now } = useNews();
  const { results } = useIec(settings.refreshMinutes);
  const TOP_N = 6;
  const data = results.state === "ready" ? results.data : undefined;
  const totals = data?.totals;
  const top = data ? data.parties.filter((p) => p.id > 0).slice(0, TOP_N) : [];
  const valid = totals?.validVotes || 1;
  const share = (v: number) => v / valid * 100;
  const maxShare = Math.max(...top.map((p) => share(p.votes)), 1);
  const undecided = totals ? totals.councils - totals.majority - totals.hung : 0;
  const asAt = data?.reportedAt ? ` · figures as at ${timeOrDate(data.reportedAt, now)}` : "";
  return (
    <section aria-labelledby="home-results" className={`border border-brand/25 bg-paper p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 id="home-results" className="text-[19px] font-black uppercase leading-tight tracking-[-0.01em]">IEC results <span className="text-[13.5px] font-extrabold normal-case tracking-normal text-muted">· 2026 local government elections</span></h3>
        <p role="status" className="flex items-center gap-2 text-[13.5px] font-bold text-body">
          {results.state === "loading" && "Fetching results from the IEC…"}
          {results.state === "error" && "The results could not be loaded just now."}
          {results.state === "ready" && results.origin === "live" && !results.missed && <><span className="live-dot size-2 shrink-0 rounded-full bg-brand [--pulse-color:var(--color-brand)]" aria-hidden="true" /><span>Live from the IEC{asAt}</span></>}
          {results.state === "ready" && results.origin === "live" && results.missed && <><span className="size-2 shrink-0 rounded-full bg-warn" aria-hidden="true" /><span>The IEC could not be reached on the last check{asAt}</span></>}
          {results.state === "ready" && results.origin === "saved" && <><span className="size-2 shrink-0 rounded-full bg-warn" aria-hidden="true" /><span>Saved copy{asAt}</span></>}
        </p>
      </div>
      {results.state === "loading" && (
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:grid-cols-6" aria-hidden="true">
          {Array.from({ length: TOP_N }, (_, i) => <div key={i} className="h-[88px] animate-pulse bg-line/70 motion-reduce:animate-none" />)}
        </div>
      )}
      {data && totals && (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
            {top.map((p) => (
              <li key={p.id} className="flex flex-col">
                <span className="text-[25px] font-black leading-none tabular-nums tracking-[-0.01em] sm:text-[27px]">{share(p.votes).toFixed(2)}%</span>
                <span className="mt-1.5 text-[14.5px] font-extrabold leading-snug">{p.name}</span>
                <span className="mt-auto block pt-2" aria-hidden="true"><span className="block h-1.5 bg-line"><span className="block h-full bg-navy" style={{ width: `${share(p.votes) / maxShare * 100}%` }} /></span></span>
                <span className="mt-1.5 text-[13.5px] tabular-nums text-body">{fmtNum(p.seats)} council seats</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-[14.5px] leading-relaxed text-body">
            <span className="font-bold text-ink">{fmtNum(totals.councils)} councils:</span> {fmtNum(totals.majority)} won outright, <Link to="/results?result=hung#results-councils" className="font-bold text-navy underline underline-offset-[3px]">{fmtNum(totals.hung)} hung</Link>{undecided > 0 ? `, ${fmtNum(undecided)} still being decided` : ""}. {fmtNum(totals.seatsAllocated)} of {fmtNum(totals.seats)} seats allocated. Share is of all valid votes on the ward and PR ballots.
          </p>
        </>
      )}
      <ul className="mt-3 flex flex-wrap gap-2.5">
        <li><Link to="/results" className={IEC_BTN}>Full results, council by council <ChevronRight size={15} strokeWidth={2.6} aria-hidden="true" /></Link></li>
        <li><Link to="/results/party" className={IEC_BTN}>Results by party <ChevronRight size={15} strokeWidth={2.6} aria-hidden="true" /></Link></li>
        <li><Link to="/results#results-coalitions" className={IEC_BTN}>Possible coalitions <ChevronRight size={15} strokeWidth={2.6} aria-hidden="true" /></Link></li>
        <li><Link to="/results/seats" className={IEC_BTN}>Seat calculator and coalitions <ChevronRight size={15} strokeWidth={2.6} aria-hidden="true" /></Link></li>
      </ul>
    </section>
  );
}
export function Pulse({ className = "" }: { className?: string }) { return <div className={`animate-pulse bg-line/70 motion-reduce:animate-none ${className}`} />; }
export function CardSkeleton() { return <div><Pulse className="aspect-[16/9]" /><Pulse className="mt-3 h-4 w-11/12" /><Pulse className="mt-3 h-3 w-1/3" /></div>; }
export function HomeSkeleton() {
  return (
    <div className="wrap pt-6" role="status" aria-label="Loading headlines">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-6"><Pulse className="aspect-[16/9]" /><Pulse className="mt-4 h-8 w-11/12" /><Pulse className="mt-2 h-8 w-2/3" /><Pulse className="mt-4 h-4 w-full" /><Pulse className="mt-2 h-4 w-5/6" /></div>
        <div className="grid grid-cols-2 gap-5 lg:col-span-3 lg:grid-cols-1"><CardSkeleton /><CardSkeleton /></div>
        <div className="space-y-5 lg:col-span-3">{Array.from({ length: 6 }, (_, i) => <div key={i}><Pulse className="h-3 w-16" /><Pulse className="mt-2 h-4 w-full" /><Pulse className="mt-1.5 h-4 w-2/3" /></div>)}</div>
      </div>
    </div>
  );
}
export function GridSkeleton({ count = 6 }: { count?: number }) {
  return <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading headlines">{Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}</div>;
}
export function FeedsDown() {
  const { refresh, refreshing } = useNews();
  return (
    <div className="wrap py-20 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight">We can’t reach the news feeds right now</h1>
      <p className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-body">Your connection may be offline, or the publishers’ feeds are not responding. Nothing has been lost — try again in a moment.</p>
      <button type="button" onClick={refresh} disabled={refreshing} className="mt-6 inline-flex h-12 cursor-pointer items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong disabled:cursor-progress disabled:opacity-70">{refreshing ? "Checking feeds…" : "Try again"}</button>
    </div>
  );
}
export function PageHead({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
      <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">{title}</h1>
      {children}
    </header>
  );
}
