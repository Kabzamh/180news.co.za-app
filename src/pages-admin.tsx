import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, ExternalLink, Lock, Save, Send } from "lucide-react";
import { LIMITS, REFRESH_OPTIONS, parseTags, useAuth, useControl, useNews, usePageTitle } from "./lib/providers";
import { CMS } from "./lib/data";

const FIELD = "w-full border border-ink/35 bg-paper px-3.5 text-base text-ink placeholder:text-muted";
const LABEL = "block text-[15px] font-extrabold";
const HINT = "mt-1 text-[13px] leading-snug text-muted";
const ERR = "mt-1.5 text-[13.5px] font-bold text-brand";
const PRIMARY = "inline-flex h-12 cursor-pointer items-center gap-2 bg-brand px-6 text-[15px] font-extrabold text-white hover:bg-brand-strong disabled:cursor-progress disabled:opacity-70";
const CT = "block text-[15px] font-extrabold";
const BT = "w-full border border-ink/35 bg-paper px-3.5 text-base text-ink";
function toLocalInput(ts: number): string {
  const d = new Date(ts); const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
async function fileToDataUrl(file: File, maxWidth = 1000): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error("That picture could not be read. Try a JPG or PNG.")); im.src = url; });
    const scale = Math.min(1, maxWidth / (img.naturalWidth || maxWidth));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((img.naturalWidth || 1000) * scale));
    canvas.height = Math.max(1, Math.round((img.naturalHeight || 562) * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("That picture could not be read. Try a JPG or PNG.");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.72);
    if (data.length > LIMITS.imageBytes) throw new Error("That picture is still too large after resizing. Choose a smaller one.");
    return data;
  } finally { URL.revokeObjectURL(url); }
}
export function SubmitPage() {
  usePageTitle("Write for 180news");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { articles, addArticle, sections } = useControl();
  const { status, user } = useAuth();
  const editId = params.get("edit") ?? undefined;
  const existing = editId ? articles.find((a) => a.id === editId) : undefined;
  const [form, setForm] = useState(() => ({ title: existing?.title ?? "", summary: existing?.summary ?? "", body: existing?.body ?? "", author: existing?.author ?? "", section: existing?.section ?? sections[0]?.id ?? "south-africa", tags: existing?.tags?.join(", ") ?? "", links: existing?.links?.join("\n") ?? "", image: existing?.image ?? "", publishAt: existing?.publishAt ? toLocalInput(existing.publishAt) : "" }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [imgError, setImgError] = useState("");
  useEffect(() => { document.title = (existing ? `Edit: ${existing.title}` : "Write for 180news") + " | 180news"; }, [existing]);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const onImage = async (file?: File | null) => { setImgError(""); if (!file) return; try { set("image", await fileToDataUrl(file)); } catch (e) { setImgError(e instanceof Error ? e.message : "That picture could not be read."); } };
  const save = (schedule: boolean) => {
    const errs: Record<string, string> = {};
    if (form.title.trim().length < LIMITS.titleMin) errs.title = `The headline needs at least ${LIMITS.titleMin} characters.`;
    if (form.title.trim().length > LIMITS.titleMax) errs.title = `Keep the headline under ${LIMITS.titleMax} characters.`;
    if (form.author.trim().length < LIMITS.authorMin) errs.author = "Add the name readers will see.";
    if (form.body.trim().length < LIMITS.bodyMin) errs.body = `The story needs at least ${LIMITS.bodyMin} characters.`;
    setErrors(errs); setState("saving"); setMessage("");
    if (Object.keys(errs).length) { setState("error"); return; }
    const publishAt = schedule && form.publishAt ? new Date(form.publishAt).getTime() : undefined;
    const result = addArticle({ title: form.title.trim(), summary: form.summary.trim().slice(0, LIMITS.summaryMax), body: form.body.trim(), author: form.author.trim(), section: form.section, tags: parseTags(form.tags), links: form.links.split(/\n+/).map((s) => s.trim()).filter((s) => /^https:\/\//.test(s)).slice(0, 6), image: form.image ? form.image : undefined, publishAt }, existing?.id);
    if (result.ok) { setState("done"); setMessage(schedule && publishAt ? "Saved and scheduled. It goes live at the time you set." : "Saved. It is live on this device now."); window.setTimeout(() => navigate(`/story/${result.id}`), 900); }
    else { setState("error"); setMessage(result.error ?? "The article could not be saved."); }
  };
  if (status !== "signed-in" || !user) return (
    <div className="wrap max-w-[620px] pt-7 md:pt-10">
      <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em]">Write for 180news</h1>
      <p className="mt-4 text-[17px] leading-relaxed text-body">The writing desk is for the 180news team. <Link to="/admin" className="font-bold text-navy underline">Sign in</Link> to continue, or <Link to="/" className="font-bold text-navy underline">go back to the news</Link>.</p>
    </div>
  );
  return (
    <div className="wrap max-w-[720px] pt-7 md:pt-10">
      <header className="relative border-t border-line pt-4 before:absolute before:-top-px before:left-0 before:h-1.5 before:w-24 before:bg-brand before:content-['']">
        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.02em] md:text-5xl">{existing ? "Edit article" : "Write for 180news"}</h1>
        <p className="mt-2 max-w-[60ch] text-[15px] text-muted">Everything is stored in this browser only. Sign in as the owner on another device and use the backup in the Control panel to move work between them.</p>
      </header>
      <form className="mt-8 space-y-5" onSubmit={(e) => { e.preventDefault(); save(false); }}>
        <div><label htmlFor="title" className={LABEL}>Headline</label><input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={LIMITS.titleMax} className={FIELD} />{errors.title && <p className={ERR}>{errors.title}</p>}</div>
        <div><label htmlFor="summary" className={LABEL}>Standfirst (optional)</label><textarea id="summary" rows={2} value={form.summary} onChange={(e) => set("summary", e.target.value)} maxLength={LIMITS.summaryMax} className={FIELD} /><p className={HINT}>One or two sentences shown under the headline, up to {LIMITS.summaryMax} characters.</p></div>
        <div><label htmlFor="body" className={LABEL}>Story</label><textarea id="body" rows={12} value={form.body} onChange={(e) => set("body", e.target.value)} maxLength={LIMITS.bodyMax} className={FIELD} />{errors.body && <p className={ERR}>{errors.body}</p>}<p className={HINT}>Leave a blank line between paragraphs.</p></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label htmlFor="author" className={LABEL}>Your name</label><input id="author" value={form.author} onChange={(e) => set("author", e.target.value)} maxLength={LIMITS.authorMax} className={FIELD} />{errors.author && <p className={ERR}>{errors.author}</p>}</div>
          <div><label htmlFor="section" className={LABEL}>Section</label><select id="section" value={form.section} onChange={(e) => set("section", e.target.value)} className={FIELD}>{sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
        </div>
        <div><label htmlFor="tags" className={LABEL}>Tags (optional)</label><input id="tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} className={FIELD} placeholder="water, Rand Water, Johannesburg" /><p className={HINT}>Up to five, separated by commas. Readers reach them at /tag/… addresses.</p></div>
        <div><label htmlFor="links" className={LABEL}>Links in the story (optional)</label><textarea id="links" rows={2} value={form.links} onChange={(e) => set("links", e.target.value)} className={FIELD} placeholder={"https://…\nhttps://…"} /><p className={HINT}>One web address per line, up to six.</p></div>
        <div><label htmlFor="picture" className={LABEL}>Picture (optional)</label><input id="picture" type="file" accept="image/*" onChange={(e) => onImage(e.target.files?.[0])} className="mt-1 block w-full text-[15px]" />{imgError && <p className={ERR}>{imgError}</p>}{form.image && <div className="mt-2 flex items-center gap-3"><img src={form.image} alt="" className="h-20 w-auto border border-line" /><button type="button" onClick={() => set("image", "")} className="cursor-pointer text-sm font-bold text-brand hover:underline">Remove picture</button></div>}</div>
        <div><label htmlFor="publishAt" className={LABEL}>Schedule for later (optional)</label><input id="publishAt" type="datetime-local" value={form.publishAt} onChange={(e) => set("publishAt", e.target.value)} className={FIELD} /><p className={HINT}>Set a time and use “Schedule” below. The article appears on the front page when the time arrives.</p></div>
        <div className="flex flex-wrap gap-3 pt-2">
          <button type="submit" className={PRIMARY} disabled={state === "saving"}>{existing ? <Save size={17} strokeWidth={2.5} aria-hidden="true" /> : <Send size={17} strokeWidth={2.5} aria-hidden="true" />}{existing ? "Save changes" : "Publish now"}</button>
          <button type="button" onClick={() => save(true)} disabled={state === "saving" || !form.publishAt} className="inline-flex h-12 cursor-pointer items-center gap-2 border-2 border-navy px-6 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-60">Schedule</button>
          {existing && <Link to={`/story/${existing.id}`} className="inline-flex h-12 items-center px-3 text-[15px] font-bold text-navy hover:underline">View the article</Link>}
        </div>
        {state === "done" && <p role="status" className="flex items-center gap-2 text-[15px] font-bold text-[#0b5a2e]"><Check size={17} strokeWidth={2.8} aria-hidden="true" /> {message}</p>}
        {state === "error" && <p role="alert" className={ERR}>{message}</p>}
      </form>
    </div>
  );
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
          <input id="notice" value={settings.crawlMessage} maxLength={140} onChange={(e) => update({ crawlMessage: e.target.value })} className={BT} placeholder="e.g. 180news is in beta — tell us what you think" />
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
export function AdminScheduledPage() {
  usePageTitle("Admin — scheduled");
  const { articles, publishNow, removeArticle } = useControl();
  const scheduled = articles.filter((a) => (a.publishAt ?? 0) > Date.now()).sort((a, b) => (a.publishAt ?? 0) - (b.publishAt ?? 0));
  return (
    <AdminShell title="Scheduled" intro="Articles waiting for their moment. They appear on the front page when the clock catches up.">
      {scheduled.length === 0 ? <p className="border border-dashed border-line bg-wash px-6 py-10 text-center text-[16px] text-body">Nothing is scheduled. To schedule an article, choose “Schedule for later” at the end of the article form.</p> : (
        <ul className="divide-y divide-line border-y border-line">{scheduled.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0"><p className="text-[17px] font-extrabold leading-[1.25]">{a.title}</p><p className="mt-1 text-[13px] text-muted">Goes live {new Date(a.publishAt ?? 0).toLocaleString("en-ZA")}</p></div>
            <div className="flex shrink-0 flex-col gap-2">
              <button type="button" onClick={() => publishNow(a.id)} className="inline-flex h-11 cursor-pointer items-center rounded-full border-2 border-navy px-4 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white">Publish now</button>
              <button type="button" onClick={() => removeArticle(a.id)} className="inline-flex h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-bold text-brand hover:border-brand">Delete</button>
            </div>
          </li>
        ))}</ul>
      )}
    </AdminShell>
  );
}
export function AdminTagsPage() {
  usePageTitle("Admin — tags");
  const { articles, renameTag, deleteTag } = useControl();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const counts = new Map<string, { name: string; count: number; mixed: boolean }>();
  for (const a of articles) for (const t of a.tags ?? []) { const key = t.toLowerCase(); const cur = counts.get(key); if (cur) { cur.count += 1; if (cur.name !== t) cur.mixed = true; } else counts.set(key, { name: t, count: 1, mixed: false }); }
  return (
    <AdminShell title="Tags" intro="Tags link stories together. Fix a spelling once and every story carries the correction.">
      {counts.size === 0 ? <p className="border border-dashed border-line bg-wash px-6 py-10 text-center text-[16px] text-body">No tags yet. Add tags to an article in the writing desk.</p> : (
        <ul className="divide-y divide-line border-y border-line">{[...counts.entries()].map(([key, v]) => (
          <li key={key} className="py-4"><div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[16px] font-extrabold">{v.name} <span className="text-[13.5px] font-bold text-muted">· {v.count} {v.count === 1 ? "story" : "stories"}</span>{v.mixed && <span className="ml-2 rounded-full bg-[#fdf1d4] px-2.5 py-0.5 text-[12px] font-bold text-[#6b4a00]">Mixed capitalisation</span>}</p>
            <div className="flex items-center gap-2">
              <input value={drafts[key] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))} placeholder="New spelling" className="h-11 w-40 border border-ink/35 bg-paper px-3 text-[15px]" aria-label={`Rename ${v.name}`} />
              <button type="button" onClick={() => { renameTag(key, (drafts[key] ?? "").trim()); setDrafts((d) => ({ ...d, [key]: "" })); }} className="inline-flex h-11 cursor-pointer items-center rounded-full border-2 border-navy px-4 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white">Rename</button>
              <button type="button" onClick={() => deleteTag(key)} className="inline-flex h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-bold text-brand hover:border-brand">Delete tag</button>
            </div>
          </div></li>
        ))}</ul>
      )}
    </AdminShell>
  );
}
