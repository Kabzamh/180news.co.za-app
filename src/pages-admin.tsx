import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Lock } from "lucide-react";
import { LIMITS, REFRESH_OPTIONS, useAuth, useControl, useNews, usePageTitle } from "./lib/providers";
import { CMS } from "./lib/data";

const FIELD = "w-full border border-ink/35 bg-paper px-3.5 text-base text-ink placeholder:text-muted";
const LABEL = "block text-[15px] font-extrabold";
const HINT = "mt-1 text-[13px] leading-snug text-muted";
const ERR = "mt-1.5 text-[13.5px] font-bold text-brand";
const PRIMARY = "inline-flex h-12 cursor-pointer items-center gap-2 bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong disabled:cursor-progress disabled:opacity-70";
const CT = "block text-[15px] font-extrabold";
const BT = "w-full border border-ink/35 bg-paper px-3.5 text-base text-ink";
export function SubmitPage() {
  usePageTitle("Newsroom writing");
  return <div className="wrap max-w-[720px] pt-7 md:pt-10"><h1 className="text-4xl font-black uppercase">Writing has moved</h1><p className="mt-4 text-[17px] text-body">Write, edit and schedule stories in the connected newsroom CMS.</p><a href="https://cms.180news.co.za/" className="mt-6 inline-flex h-12 items-center bg-brand px-6 font-extrabold text-white">Open the newsroom CMS</a></div>;
}
function Toggle({ label, checked, onChange, disabled = false, note }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; note?: string }) {
  return (
    <label className={`flex min-h-12 items-center justify-between gap-4 py-1.5 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
      <span className="text-[15.5px] font-bold">{label}{note && <span className="block text-[13px] font-normal text-muted">{note}</span>}</span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className="relative h-7 w-12 shrink-0 rounded-full bg-[#8a919e] transition-colors after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-navy peer-checked:after:translate-x-5 peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy peer-disabled:opacity-50 motion-reduce:transition-none motion-reduce:after:transition-none" />
    </label>
  );
}
function AdminShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="wrap max-w-[620px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="flex items-center gap-3 text-[32px] font-black uppercase leading-none tracking-[-0.02em] md:text-[40px]"><Lock size={30} strokeWidth={2.4} className="shrink-0 text-brand" aria-hidden="true" />{title}</h1>
        <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-body">{intro}</p>
      </header>
      <div className="mt-8">{children}</div>
    </div>
  );
}
export function AdminPage() {
  usePageTitle("Admin");
  const { status, signIn, setUpOwner, signOut, user } = useAuth();
  const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [setupForm, setSetupForm] = useState({ username: "", name: "", password: "", question: "What is the name of the first school you attended?", answer: "" });
  if (status === "signed-in") return (
    <AdminShell title="Admin" intro={`Signed in as ${user?.name ?? user?.username} (${user?.role}). The newsroom tools live in the Control panel.`}>
      <ul className="divide-y divide-line border-y border-line">{([["Control panel", "/control"], ["Team & accounts", "/admin/team"], ["Adverts (controlled in CMS)", "/admin/ads"], ["Scheduled", "/admin/scheduled"], ["Tags", "/admin/tags"]] as [string, string][]).map(([label, to]) => <li key={to} className="py-3"><Link to={to} className="font-bold text-navy underline decoration-navy/40 underline-offset-[3px] hover:decoration-navy">{label}</Link></li>)}</ul>
      <button type="button" onClick={signOut} className="mt-6 inline-flex h-12 cursor-pointer items-center border-2 border-navy px-6 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white">Sign out</button>
    </AdminShell>
  );
  if (status === "setup") return (
    <AdminShell title="Set up admin" intro="Create the owner account for this browser. It stays in this browser only — nobody else can sign in from here until you add team members.">
      <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(""); const r = await setUpOwner(setupForm); setBusy(false); if (!r.ok) setError(r.error ?? "Could not create the account."); }}>
        <div><label htmlFor="su-name" className={CT}>Your name</label><input id="su-name" value={setupForm.name} onChange={(e) => setSetupForm({ ...setupForm, name: e.target.value })} className={BT} /></div>
        <div><label htmlFor="su-user" className={CT}>Username</label><input id="su-user" value={setupForm.username} onChange={(e) => setSetupForm({ ...setupForm, username: e.target.value })} className={BT} autoComplete="username" /></div>
        <div><label htmlFor="su-pass" className={CT}>Password</label><input id="su-pass" type="password" value={setupForm.password} onChange={(e) => setSetupForm({ ...setupForm, password: e.target.value })} className={BT} autoComplete="new-password" /></div>
        <div><label htmlFor="su-q" className={CT}>Recovery question</label><input id="su-q" value={setupForm.question} onChange={(e) => setSetupForm({ ...setupForm, question: e.target.value })} className={BT} /></div>
        <div><label htmlFor="su-a" className={CT}>Recovery answer</label><input id="su-a" value={setupForm.answer} onChange={(e) => setSetupForm({ ...setupForm, answer: e.target.value })} className={BT} /></div>
        <button type="submit" disabled={busy} className="inline-flex h-12 cursor-pointer items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong disabled:opacity-70">{busy ? "Creating…" : "Create account"}</button>
        {error && <p className="text-[14px] font-bold text-brand">{error}</p>}
      </form>
    </AdminShell>
  );
  return (
    <AdminShell title="Admin sign-in" intro="Enter the newsroom account details for this browser.">
      <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(""); const r = await signIn(username, password); setBusy(false); if (!r.ok) setError(r.error ?? "Sign-in failed."); }}>
        <div><label htmlFor="ad-user" className={CT}>Username</label><input id="ad-user" value={username} onChange={(e) => setUsername(e.target.value)} className={BT} autoComplete="username" /></div>
        <div><label htmlFor="ad-pass" className={CT}>Password</label><input id="ad-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={BT} autoComplete="current-password" /></div>
        <button type="submit" disabled={busy} className="inline-flex h-12 cursor-pointer items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong disabled:opacity-70">{busy ? "Checking…" : "Sign in"}</button>
        {error && <p className="text-[14px] font-bold text-brand">{error}</p>}
      </form>
    </AdminShell>
  );
}
export function ControlPage() {
  usePageTitle("Control panel");
  const { settings, update, resetSettings } = useControl();
  const ALL_SECTIONS = ["elections", "south-africa", "politics", "business", "sport", "world", "africa", "tech", "life", "opinion"];
  return (
    <AdminShell title="Control panel" intro="Set how the front page behaves on this device: what appears, how fast it refreshes, and how the newsroom is contacted.">
      <div className="space-y-6">
        <section className="border border-line bg-paper p-5">
          <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Sections on the app</h2>
          <div className="mt-2">{ALL_SECTIONS.map((id) => <Toggle key={id} label={id.replace("-", " ").replace(/^\w/, (c) => c.toUpperCase())} checked={!settings.hiddenSections.includes(id)} onChange={(on) => update({ hiddenSections: on ? settings.hiddenSections.filter((s) => s !== id) : [...settings.hiddenSections, id] })} />)}</div>
        </section>
        <section className="border border-line bg-paper p-5">
          <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Headline crawl</h2>
          <Toggle label="Show the headline crawl" checked={settings.crawlEnabled} onChange={(v) => update({ crawlEnabled: v })} />
          <label className={`${CT} mt-3`}>Crawl speed</label>
          <select value={settings.crawlSpeed} onChange={(e) => update({ crawlSpeed: e.target.value as "slow" | "normal" | "fast" })} className={BT}><option value="slow">Slow</option><option value="normal">Normal</option><option value="fast">Fast</option></select>
          <label className={`${CT} mt-4`} htmlFor="notice">Notice in the crawl</label>
          <input id="notice" value={settings.crawlMessage} maxLength={140} onChange={(e) => update({ crawlMessage: e.target.value })} className={BT} placeholder="Add a newsroom notice" />
        </section>
        <section className="border border-line bg-paper p-5">
          <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Refresh</h2>
          <label className={`${CT} mt-3`} htmlFor="refresh">Re-check feeds every</label>
          <select id="refresh" value={settings.refreshMinutes} onChange={(e) => update({ refreshMinutes: Number(e.target.value) })} className={BT}>{REFRESH_OPTIONS.map((m) => <option key={m} value={m}>{m === 0 ? "Only when I refresh" : `${m} minutes`}</option>)}</select>
        </section>
        <section className="border border-line bg-paper p-5">
          <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Contact details</h2>
          {([["email", "Newsroom email"], ["phone", "Newsroom phone"], ["adPhone", "Advertising phone"]] as [keyof typeof settings, string][]).map(([key, label]) => <div key={key} className="mt-3"><label className={CT} htmlFor={`set-${key}`}>{label}</label><input id={`set-${key}`} value={String(settings[key])} onChange={(e) => update({ [key]: e.target.value } as Partial<typeof settings>)} className={BT} /></div>)}
        </section>
        <section className="border border-line bg-paper p-5">
          <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">Adverts</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-body">Adverts are controlled only in the 180news CMS. Its master switch, slots, creatives, links and sizes are synced to this app automatically.</p>
          <a href={`${CMS}/ads`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-11 items-center gap-2 border-2 border-navy px-4 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white">Open Ads control in CMS<ExternalLink size={15} strokeWidth={2.5} aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span></a>
        </section>
        <button type="button" onClick={resetSettings} className="inline-flex h-12 cursor-pointer items-center border-2 border-navy px-6 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white">Reset to defaults</button>
      </div>
    </AdminShell>
  );
}
export function AdminTeamPage() {
  usePageTitle("Admin — team");
  const { status, addMember, removeMember } = useAuth();
  const [form, setForm] = useState({ username: "", name: "", password: "", role: "reporter" });
  const [error, setError] = useState("");
  if (status !== "signed-in") return <AdminPage />;
  return (
    <AdminShell title="Team & accounts" intro="Add editors or reporters. Accounts work only in the browser where they were created.">
      <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setError(""); const r = await addMember(form); if (r.ok) setForm({ username: "", name: "", password: "", role: "reporter" }); else setError(r.error ?? "Could not add the member."); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={CT} htmlFor="tm-name">Name</label><input id="tm-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={BT} /></div>
          <div><label className={CT} htmlFor="tm-user">Username</label><input id="tm-user" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={BT} /></div>
          <div><label className={CT} htmlFor="tm-pass">Password</label><input id="tm-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={BT} /></div>
          <div><label className={CT} htmlFor="tm-role">Role</label><select id="tm-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={BT}><option value="reporter">Reporter — can write</option><option value="editor">Editor — can write and use tools</option></select></div>
        </div>
        <button type="submit" className="inline-flex h-12 cursor-pointer items-center bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong">Add member</button>
        {error && <p className="text-[14px] font-bold text-brand">{error}</p>}
      </form>
      <p className="mt-6 text-[14.5px] text-muted">Members are managed through the owner account in this browser. Removing the owner is not possible here.</p>
      <button type="button" onClick={() => removeMember(form.username)} className="mt-4 inline-flex h-11 cursor-pointer items-center border-2 border-navy px-4 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white">Remove the username above</button>
    </AdminShell>
  );
}
export function AdminAdsPage() {
  usePageTitle("Admin — adverts");
  const { adsEnabled, cmsAds, cmsAdsStatus, refresh, refreshing } = useNews();
  const adsDisplayLive = adsEnabled && cmsAdsStatus.state === "live";
  const readyAds = adsDisplayLive ? cmsAds.filter((ad) => ad.enabled && ad.image) : [];
  const syncLabel = cmsAdsStatus.state === "live" ? "Live from CMS" : cmsAdsStatus.state === "bundle" ? "Synced from CMS — awaiting live display" : cmsAdsStatus.state === "stale" ? "Last CMS sync — not displayed" : cmsAdsStatus.state === "loading" ? "Syncing with CMS…" : "CMS unavailable";
  return (
    <AdminShell title="Adverts" intro="Adverts on this app are controlled only in the 180news CMS. This page is read-only: it shows what the CMS is currently sending to the app.">
      <div className="space-y-6">
        <section className="border border-line bg-paper p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-[12.5px] font-black uppercase tracking-[0.06em] text-muted">CMS master control</h2>
              <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-body">The CMS master switch, slot switches, creatives, links and sizes decide what appears here. No advert is displayed publicly until the CMS serves it through its live public feed. Nothing on this page can override the CMS.</p>
              <p className="mt-2 text-[13.5px] font-bold text-body" aria-live="polite">{syncLabel} · {readyAds.length} {readyAds.length === 1 ? "slot" : "slots"} ready</p>
            </div>
            <span className={`inline-block rounded-full px-3 py-1.5 text-[12.5px] font-bold ${adsDisplayLive ? "bg-[#dff5e8] text-[#0b5a2e]" : "bg-brand-tint text-brand"}`}>{adsDisplayLive ? "Ads live" : "Ads off"}</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href={`${CMS}/ads`} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong">Manage adverts in CMS<ExternalLink size={16} strokeWidth={2.5} aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span></a>
            <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex h-12 cursor-pointer items-center border-2 border-navy px-6 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-progress disabled:opacity-60">{refreshing ? "Syncing…" : "Sync now"}</button>
          </div>
        </section>
        {cmsAds.length > 0 ? cmsAds.map((ad) => (
          <section key={ad.id} className="border border-line bg-paper p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-ink">{ad.slotName}</h2>
                <p className="mt-1 text-[13.5px] text-muted">Slot <code className="text-ink">{ad.slot}</code>{ad.position && ad.position !== ad.slot ? <> · position <code className="text-ink">{ad.position}</code></> : null}{ad.width && ad.height ? ` · ${ad.width}×${ad.height}` : " · fluid"}</p>
              </div>
              <span className={`inline-block rounded-full px-2.5 py-1 text-[12.5px] font-bold ${adsDisplayLive && ad.enabled && ad.image ? "bg-[#dff5e8] text-[#0b5a2e]" : "bg-wash text-body"}`}>{adsDisplayLive && ad.enabled && ad.image ? "On site" : "Off"}</span>
            </div>
            {ad.image ? <div className="mt-4 bg-wash p-3"><img src={ad.image} alt={ad.advertiser ? `Advertisement — ${ad.advertiser}` : "Advertisement"} className="mx-auto block max-h-[220px] w-auto max-w-full object-contain" /></div> : <p className="mt-4 border border-dashed border-line bg-wash px-4 py-6 text-center text-[14px] text-muted">No creative supplied by the CMS for this slot.</p>}
            <dl className="mt-4 grid gap-3 text-[14px] sm:grid-cols-2">
              <div><dt className="font-extrabold">Advertiser</dt><dd className="mt-0.5 text-body">{ad.advertiser || "—"}</dd></div>
              <div><dt className="font-extrabold">Click link</dt><dd className="mt-0.5 break-all text-body">{ad.linkUrl ? <a href={ad.linkUrl} target="_blank" rel="sponsored noopener noreferrer" className="text-navy underline">{ad.linkUrl}</a> : "—"}</dd></div>
            </dl>
          </section>
        )) : <p className="border border-dashed border-line bg-wash px-6 py-10 text-center text-[16px] text-body">{cmsAdsStatus.state === "loading" ? "Syncing adverts from the CMS…" : "No adverts are currently being sent by the CMS."}</p>}
      </div>
    </AdminShell>
  );
}
export function AdminScheduledPage() { return <SubmitPage />; }
export function AdminTagsPage() { return <SubmitPage />; }
