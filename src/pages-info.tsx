import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useControl, useNews, usePageTitle } from "./lib/providers";
import { CMS, CMS_FEED_ID, FEEDS, SECTION_MAP, SOURCES, timeOrDate } from "./lib/data";
import { PageHead } from "./components";

export function AboutPage() {
  usePageTitle("About & feed status");
  const { feeds, now, refreshing, ready, refresh, status, cmsStatus } = useNews();
  const { settings, sections } = useControl();
  const badgeFor = (feedId: string): { label: string; tone: string } => {
    const f = feeds[feedId];
    if (!f || (f.origin === "none" && !ready)) return { label: "Checking…", tone: "bg-line text-body" };
    if (f.origin === "live" || f.origin === "relay") return f.error ? { label: "Live, last check failed", tone: "bg-[#fdf1d4] text-[#6b4a00]" } : { label: f.origin === "relay" ? "Live via relay" : "Live", tone: "bg-[#dff5e8] text-[#0b5a2e]" };
    if (f.origin === "cms") return cmsStatus.state === "live" ? { label: "Live from CMS", tone: "bg-[#dff5e8] text-[#0b5a2e]" } : cmsStatus.state === "bundle" ? { label: "Synced from CMS", tone: "bg-[#dff5e8] text-[#0b5a2e]" } : cmsStatus.state === "unavailable" ? { label: "Unavailable", tone: "bg-brand-tint text-brand" } : { label: "Checking…", tone: "bg-line text-body" };
    if (f.origin === "cache") return { label: "Earlier copy from this device", tone: "bg-[#fdf1d4] text-[#6b4a00]" };
    if (f.origin === "snapshot") return { label: "Saved copy", tone: "bg-[#fdf1d4] text-[#6b4a00]" };
    return { label: "Unavailable", tone: "bg-brand-tint text-brand" };
  };
  return (
    <div className="wrap max-w-[980px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']"><h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">About 180news</h1></header>
      <div className="mt-6 max-w-[68ch] space-y-4 text-[17px] leading-relaxed text-body">
        <p>180news gathers the latest headlines from South African and international newsrooms onto one front page, so you can see how the day is being reported without opening a dozen sites.</p>
        <p>We show each publisher’s headline, summary and picture as supplied in that publisher’s public RSS feed; long summaries are shortened. The reporting is theirs: every story links straight to the full article on the publisher’s own website.</p>
      </div>
      <section aria-labelledby="how-live" className="mt-10">
        <h2 id="how-live" className="text-2xl font-extrabold tracking-tight">How live is it?</h2>
        <ul className="mt-3 max-w-[68ch] list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-body">
          <li>{settings.refreshMinutes > 0 ? `Feeds are re-checked every ${settings.refreshMinutes} minutes while 180news is open, and whenever you press the refresh control in the top bar.` : "Feeds are checked when 180news opens and whenever you press the refresh control in the top bar."}</li>
          <li>Election results come from the IEC’s results system{settings.refreshMinutes > 0 ? " and are re-checked on the same schedule" : " and are checked when you open them"}. If the IEC cannot be reached, the last figures stay on screen and say so.</li>
          <li>180news’ own stories are loaded from the newsroom CMS at cms.180news.co.za and re-checked every minute, so a story published there appears here on its own — alongside the RSS headlines, in its section, in Latest and in search.</li>
          <li>When new headlines arrive while you are reading, a “new stories” button appears instead of the page moving under you.</li>
          <li>If a publisher’s feed cannot be reached, we keep showing the last copy we have and label it below — nothing is made up to fill a gap.</li>
          <li>Saved stories and your weather city are stored only in this browser.</li>
        </ul>
      </section>
      <section aria-labelledby="feed-status" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="feed-status" className="text-2xl font-extrabold tracking-tight">Feed status</h2>
            <p className="mt-1 text-[15px] text-muted" aria-live="polite">{status.kind === "live" ? `${status.live} of ${status.total} feeds are live.` : status.kind === "loading" ? "Checking feeds…" : status.kind === "saved" ? "Live feeds are unreachable — showing saved copies." : "No feeds could be reached."}</p>
          </div>
          <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex h-11 cursor-pointer items-center gap-2 border-2 border-navy px-5 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-progress disabled:opacity-60"><RefreshCw size={15} strokeWidth={2.5} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />{refreshing ? "Checking…" : "Check feeds now"}</button>
        </div>
        <div className="mt-4 overflow-x-auto border border-line">
          <table className="w-full min-w-[620px] border-collapse text-left text-[15px]">
            <thead><tr className="bg-wash text-[12.5px] uppercase tracking-[0.05em] text-muted"><th scope="col" className="px-4 py-3 font-extrabold">Newsroom</th><th scope="col" className="px-4 py-3 font-extrabold">Section</th><th scope="col" className="px-4 py-3 font-extrabold">Status</th><th scope="col" className="px-4 py-3 text-right font-extrabold">Stories</th><th scope="col" className="px-4 py-3 font-extrabold">Fetched</th></tr></thead>
            <tbody>{(() => { const state = feeds[CMS_FEED_ID]; const badge = badgeFor(CMS_FEED_ID); return (
              <tr className="border-t border-line">
                <th scope="row" className="px-4 py-3 font-bold"><a href={CMS} target="_blank" rel="noopener noreferrer" className="text-navy underline-offset-2 hover:underline">180news (CMS)</a></th>
                <td className="px-4 py-3 text-body">All sections</td>
                <td className="px-4 py-3"><span className={`inline-block rounded-full px-2.5 py-1 text-[12.5px] font-bold ${badge.tone}`}>{badge.label}</span></td>
                <td className="px-4 py-3 text-right tabular-nums text-body">{state?.items.length ?? 0}</td>
                <td className="px-4 py-3 tabular-nums text-body">{state && state.fetchedAt > 0 ? timeOrDate(state.fetchedAt, now) : "–"}</td>
              </tr> ); })()}{FEEDS.map((f) => { const state = feeds[f.id]; const badge = badgeFor(f.id); const source = SOURCES[f.sourceId]; return (
              <tr key={f.id} className="border-t border-line">
                <th scope="row" className="px-4 py-3 font-bold"><a href={source.home} target="_blank" rel="noopener noreferrer" className="text-navy underline-offset-2 hover:underline">{source.name}</a></th>
                <td className="px-4 py-3 text-body">{SECTION_MAP[f.section]?.label}</td>
                <td className="px-4 py-3"><span className={`inline-block rounded-full px-2.5 py-1 text-[12.5px] font-bold ${badge.tone}`}>{badge.label}</span></td>
                <td className="px-4 py-3 text-right tabular-nums text-body">{state?.items.length ?? 0}</td>
                <td className="px-4 py-3 tabular-nums text-body">{state && state.fetchedAt > 0 ? timeOrDate(state.fetchedAt, now) : "–"}</td>
              </tr> ); })}</tbody>
          </table>
        </div>
      </section>
      <section aria-labelledby="credits" className="mt-10">
        <h2 id="credits" className="text-2xl font-extrabold tracking-tight">Data credits</h2>
        <p className="mt-3 max-w-[68ch] text-[16px] leading-relaxed text-body">Weather readings come from <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">Open-Meteo</a>. Rand figures are daily reference rates — <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">Rates by ExchangeRate-API</a> — and are not live trading prices. Election results and the figures in the seat calculator come from the <a href="https://results.elections.org.za/dashboards/lge/" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">Electoral Commission of South Africa’s results system</a>.</p>
        <p className="mt-4 max-w-[68ch] text-[16px] leading-relaxed text-body">For how we handle what we collect, read our <a href="/policy" className="font-semibold text-navy underline">Privacy Policy</a> and the <a href="/terms" className="font-semibold text-navy underline">Terms &amp; Conditions</a>.</p>
        <p className="mt-4 max-w-[68ch] text-[16px] leading-relaxed text-body">The newsroom can be reached at <a href={`mailto:${settings.email}`} className="font-semibold text-navy underline break-all">{settings.email}</a> or on {settings.phone}. Sections currently switched on: {sections.map((s) => s.label).join(", ")}.</p>
      </section>
    </div>
  );
}
type LegalBlock = { type: "p"; text: string } | { type: "list"; items: string[] };
type LegalSection = { id: string; title: string; body: LegalBlock[] };
const PRIVACY: LegalSection[] = [
  { id: "scope", title: "What this policy covers", body: [{ type: "p", text: "This policy explains what information the 180news app collects, what it stores, and what it never does. It applies to the 180news website and installed app. It does not apply to the newsroom websites we link to — each publisher handles your data on its own site under its own policy." }] },
  { id: "collect", title: "What we collect", body: [{ type: "p", text: "180news runs almost entirely without knowing anything about you. There are no accounts for readers, no sign-in, and no advertising trackers." }, { type: "list", items: ["Saved stories — the headlines you bookmark are kept in your browser’s local storage on your device. They are never sent to us.", "Weather city — the city you pick for the weather widget is kept in your browser’s local storage.", "Newsroom tools — if you use the Control panel or admin pages, the articles, adverts and team accounts you create are kept in that browser’s storage, with passwords stored only as salted hashes.", "Weather and currency — your browser asks Open-Meteo for the temperature in the city you choose, and asks ExchangeRate-API for daily rand reference rates. Those requests carry your IP address to those providers, as any web request does."] }] },
  { id: "third-party", title: "Third-party services", body: [{ type: "p", text: "To put one front page together, 180news reads public RSS feeds from each newsroom, either directly or through a relay service. When a feed is read through a relay, the request happens on our server, not in your browser. We do not send your name, email address or any identifier to newsrooms, and we do not run advertising or analytics cookies." }, { type: "list", items: ["Open-Meteo — weather readings for the city you choose.", "ExchangeRate-API — daily reference rates for the rand.", "The Electoral Commission of South Africa — election results shown on the results pages."] }] },
  { id: "cookies", title: "Cookies and storage", body: [{ type: "p", text: "180news does not set advertising or tracking cookies. The app uses your browser’s own local storage and session storage for the things listed above. Clearing your browser data removes all of it, with nothing kept on our side." }] },
  { id: "rights", title: "Your rights under POPIA", body: [{ type: "p", text: "The Protection of Personal Information Act (POPIA) governs how personal information is handled in South Africa. Because 180news does not build profiles of readers and does not knowingly hold personal information about readers, there is normally nothing for us to disclose, correct or delete. If you believe we hold personal information about you — for example through the newsroom tools — write to us and we will confirm what is held, correct it or remove it without charge." }] },
  { id: "children", title: "Children", body: [{ type: "p", text: "180news is a general news service and is not directed at children. We do not knowingly collect any personal information from children." }] },
  { id: "changes", title: "Changes to this policy", body: [{ type: "p", text: "If the app starts collecting anything new, this page will say so before it happens. The policy was last updated in November 2026." }] },
];
const TERMS: LegalSection[] = [
  { id: "acceptance", title: "Using 180news", body: [{ type: "p", text: "By opening 180news you accept these terms. If you do not accept them, please do not use the app. We may update these terms from time to time; the version on this page applies to each visit." }] },
  { id: "content", title: "What 180news is — and is not", body: [{ type: "p", text: "180news is a news front page. It displays headlines, short summaries and pictures exactly as publishers supply them in their public RSS feeds, and every story links to the full report on the publisher’s own website. 180news does not write, edit or verify the reporting it links to." }, { type: "list", items: ["Headlines, summaries, pictures and video remain the property of the publisher that reported them.", "A story staying on the front page depends on what a publisher chooses to publish in its feed. A headline that drops out of a feed is removed here too.", "Nothing on 180news is legal, financial or medical advice."] }] },
  { id: "accuracy", title: "Accuracy and corrections", body: [{ type: "p", text: "We present feeds as they arrive and label copies that are not live. If a headline or summary is wrong, the correction belongs with the publisher that reported it — follow the link to their article and contact them. If you believe a headline is being shown out of context or a publisher is misattributed, tell us and we will fix the feed or remove it." }] },
  { id: "elections", title: "Election results and tools", body: [{ type: "p", text: "Figures on the results pages and in the seat calculator come from the Electoral Commission of South Africa. The seat calculator shows possible coalitions for councils that have not been won outright; it is arithmetic, not a prediction, and it does not take municipal specific circumstances, coalitions agreements or by-elections into account. Always confirm final results with the Commission." }] },
  { id: "reader-tools", title: "Newsroom tools and your browser", body: [{ type: "p", text: "The write-for-180news tools, the Control panel and the admin pages store everything in the browser being used — articles, pictures, adverts and team accounts included. That means:" }, { type: "list", items: ["What you publish shows on that device, in that browser, until it is exported as a backup and loaded elsewhere.", "Clearing your browser data deletes your articles and adverts permanently. Nothing is kept on our servers.", "Anyone with access to that device and browser can see and change that work — keep the device safe, and sign out on shared computers."] }] },
  { id: "acceptable-use", title: "Acceptable use", body: [{ type: "p", text: "You may link to any 180news page freely. You may not:" }, { type: "list", items: ["republish feeds, headlines or pictures from 180news as your own product, or strip the publisher attribution from them;", "scrape or republish the app’s pages at volume, or resell access to them;", "use the newsroom tools to publish unlawful content, hate speech, harassment, or anything that impersonates a real newsroom;", "attempt to break the app’s security, or use it to attack other sites."] }] },
  { id: "advertising", title: "Advertising enquiries", body: [{ type: "p", text: "The “Advertise with us” panels are an invitation to enquire, not a binding offer. Rates, formats and bookings are agreed directly with the newsroom before any advert appears." }] },
  { id: "liability", title: "Availability and liability", body: [{ type: "p", text: "180news is provided “as is”. Feeds, the IEC, weather and currency services can be slow, wrong or unreachable, and the app will say when it is showing saved copies rather than live data. To the extent the law allows, 180news is not liable for decisions you take on the strength of what appears here, for content on publishers’ own websites, or for any loss of the articles, adverts or settings you keep in your own browser." }] },
  { id: "law", title: "Governing law", body: [{ type: "p", text: "These terms are governed by the law of the Republic of South Africa. Any dispute will be heard by a court in South Africa." }] },
];
function LegalPage({ kind, title, intro, sections }: { kind: "policy" | "terms"; title: string; intro: string; sections: LegalSection[] }) {
  const { settings } = useControl();
  return (
    <div className="wrap max-w-[860px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <p className="text-sm font-black uppercase tracking-[0.08em] text-brand">180news · {kind === "policy" ? "Privacy" : "Legal"}</p>
        <h1 className="mt-1 text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-[68ch] text-[17px] leading-relaxed text-body">{intro}</p>
      </header>
      <nav aria-label="On this page" className="mt-8 border border-line bg-wash p-5">
        <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">On this page</h2>
        <ol className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2">{sections.map((s, i) => <li key={s.id} className="text-[15px]"><a href={`#${s.id}`} className="text-navy underline decoration-navy/40 underline-offset-[3px] hover:decoration-navy">{i + 1}. {s.title}</a></li>)}</ol>
      </nav>
      {sections.map((s, i) => (
        <section key={s.id} id={s.id} aria-labelledby={`legal-${s.id}`} className="mt-10">
          <h2 id={`legal-${s.id}`} className="text-2xl font-extrabold tracking-tight">{i + 1}. {s.title}</h2>
          <div className="mt-3 max-w-[68ch] space-y-3 text-[16.5px] leading-relaxed text-body">
            {s.body.map((b, j) => b.type === "p" ? <p key={j}>{b.text}</p> : <ul key={j} className="list-disc space-y-2 pl-5">{b.items.map((item, k) => <li key={k}>{item}</li>)}</ul>)}
          </div>
        </section>
      ))}
      <section aria-labelledby="legal-contact" className="mt-10 border border-line bg-wash p-5">
        <h2 id="legal-contact" className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Questions about this page</h2>
        <p className="mt-2 max-w-[68ch] text-[16px] leading-relaxed text-body">Write to <a href={`mailto:${settings.email}`} className="font-semibold text-navy underline break-all">{settings.email}</a> or call {settings.phone}. 180news is operated from South Africa.</p>
      </section>
    </div>
  );
}
export function PrivacyPage() { usePageTitle("Privacy Policy"); return <LegalPage kind="policy" title="Privacy Policy" intro="180news is a news front page, not a data business. This page sets out exactly what the app stores on your device and what it asks of third parties." sections={PRIVACY} />; }
export function TermsPage() { usePageTitle("Terms & Conditions"); return <LegalPage kind="terms" title="Terms & Conditions" intro="The ground rules for using 180news: what the app shows, what belongs to publishers, and what you may do with it." sections={TERMS} />; }
export function NotFoundPage() {
  usePageTitle("Page not found");
  const { sections } = useControl();
  return (
    <div className="wrap py-20 text-center">
      <p className="text-sm font-black uppercase tracking-[0.08em] text-brand">Error 404</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">We can’t find that page</h1>
      <p className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-body">The address may be mistyped, or the page may have moved. The news is this way:</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-flex h-12 items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong">Top stories</Link>
        <Link to="/latest" className="inline-flex h-12 items-center border-2 border-navy px-6 text-[15px] font-extrabold text-navy hover:bg-navy hover:text-white">Latest</Link>
      </div>
      <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2">{sections.map((s) => <li key={s.id}><Link to={`/section/${s.id}`} className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm font-bold hover:border-navy hover:text-navy">{s.label}</Link></li>)}</ul>
    </div>
  );
}
export const _PageHead = PageHead;
