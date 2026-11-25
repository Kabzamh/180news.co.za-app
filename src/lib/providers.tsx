import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FEEDS, SECTIONS, feedsForSection, isNewsItem, toNewsItem, dedupeCap, byPublished, titleKey, CMS, CMS_FEED_ID, ORIGIN, SITE_NAME, SECTION_MAP, cmsNumericId, cmsStoryId, type FeedDef, type NewsItem } from "./data";

/* ================= Control (local display settings / own articles) =================
   Adverts are intentionally absent here: the CMS at cms.180news.co.za is the
   only master controller for the ads master switch and every ad creative. */
export type Settings = { hiddenSections: string[]; hiddenSources: string[]; crawlEnabled: boolean; crawlSpeed: "slow" | "normal" | "fast"; crawlMessage: string; refreshMinutes: number; showScheduled: boolean; email: string; phone: string; adPhone: string };
export const DEFAULT_SETTINGS: Settings = { hiddenSections: [], hiddenSources: [], crawlEnabled: true, crawlSpeed: "normal", crawlMessage: "", refreshMinutes: 3, showScheduled: true, email: "newsroom@180news.co.za", phone: "+2781 659 6218", adPhone: "+2781 659 6218" };
export const REFRESH_OPTIONS = [3, 5, 10, 15, 0];
export const LIMITS = { titleMin: 8, titleMax: 140, summaryMax: 300, bodyMin: 80, bodyMax: 20000, authorMin: 2, authorMax: 60, messageMax: 140, imageBytes: 700000 };
const MAX_ARTICLES = 50;
const K_CONTROL = "180news:control:v1";
const K_ARTICLES = "180news:articles:v1";
const isSection = (id: string) => SECTIONS.some((s) => s.id === id);
const trimTo = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const validEmail = (i: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(i);
const validPhone = (i: string) => /^[+\d][\d\s()-]*$/.test(i) && i.replace(/\D/g, "").length >= 7;
function sanitiseSettings(raw: unknown): Settings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const uniq = (g: unknown) => Array.isArray(g) ? [...new Set(g.filter((b) => typeof b === "string"))] as string[] : [];
  let hidden = uniq(o.hiddenSections).filter(isSection);
  if (hidden.length >= SECTIONS.length) hidden = [];
  const email = trimTo(o.email, 120), phone = trimTo(o.phone, 30), adPhone = trimTo(o.adPhone, 30);
  const refresh = Number(o.refreshMinutes);
  return {
    hiddenSections: hidden, hiddenSources: uniq(o.hiddenSources),
    crawlEnabled: typeof o.crawlEnabled === "boolean" ? o.crawlEnabled : DEFAULT_SETTINGS.crawlEnabled,
    crawlSpeed: o.crawlSpeed === "slow" || o.crawlSpeed === "fast" ? o.crawlSpeed : "normal",
    crawlMessage: typeof o.crawlMessage === "string" ? o.crawlMessage.replace(/\s+/g, " ").slice(0, LIMITS.messageMax) : "",
    refreshMinutes: REFRESH_OPTIONS.includes(refresh) ? refresh : DEFAULT_SETTINGS.refreshMinutes,
    showScheduled: o.showScheduled !== false,
    email: validEmail(email) ? email : DEFAULT_SETTINGS.email,
    phone: validPhone(phone) ? phone : DEFAULT_SETTINGS.phone,
    adPhone: validPhone(adPhone) ? adPhone : DEFAULT_SETTINGS.adPhone,
  };
}
/* Adverts are read-only in this app and are synchronised from the CMS.
   The type lives here so the public renderer and the read-only status page
   share the same normalised shape. */
export type CmsAd = {
  id: number;
  slot: string;
  slotName: string;
  advertiser: string;
  linkUrl: string;
  image?: string;
  position: string;
  enabled: boolean;
  width?: number;
  height?: number;
};
const DATA_IMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export type OwnArticle = { id: string; title: string; summary: string; body: string; author: string; section: string; image?: string; links?: string[]; tags?: string[]; publishAt?: number; createdAt: number; updatedAt: number; hidden: boolean; pinned: boolean; headline: boolean };
export function parseTags(input: string | string[]): string[] {
  const joined = Array.isArray(input) ? input.filter((c) => typeof c === "string").join(",") : String(input ?? "");
  const out: string[] = [];
  for (const c of joined.split(/[,\n]/)) {
    const d = c.replace(/[#/\\?%]/g, " ").replace(/\s+/g, " ").trim();
    if (d && !out.some((h) => h.toLowerCase() === d.toLowerCase())) out.push(d);
  }
  return out.filter((c) => c.length <= 24).slice(0, 5);
}
function sanitiseArticles(raw: unknown): OwnArticle[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>(); const out: OwnArticle[] = []; let pinnedSeen = false;
  for (const d of raw) {
    if (!d || typeof d !== "object") continue;
    const h = d as Record<string, unknown>;
    const id = typeof h.id === "string" && /^my-[a-z0-9]{6,24}$/.test(h.id) ? h.id : null;
    const title = trimTo(h.title, LIMITS.titleMax), body = trimTo(h.body, LIMITS.bodyMax), author = trimTo(h.author, LIMITS.authorMax);
    const section = typeof h.section === "string" ? h.section : "";
    if (!id || !title || !body || !author || !isSection(section)) continue;
    const image = typeof h.image === "string" && DATA_IMG.test(h.image) && h.image.length <= LIMITS.imageBytes ? h.image : undefined;
    const links = Array.isArray(h.links) ? [...new Set(h.links.filter((y) => typeof y === "string" && /^https:\/\//.test(y as string)) as string[])].slice(0, 6) : [];
    const tags = parseTags(Array.isArray(h.tags) ? h.tags as string[] : "");
    const publishAt = typeof h.publishAt === "number" && Number.isFinite(h.publishAt) && h.publishAt > 0 ? h.publishAt : undefined;
    const createdAt = typeof h.createdAt === "number" && h.createdAt > 0 ? Math.min(h.createdAt, Date.now()) : Date.now();
    const art: OwnArticle = { id, title, summary: trimTo(h.summary, LIMITS.summaryMax), body, author, section, ...(image ? { image } : {}), ...(links.length ? { links } : {}), ...(tags.length ? { tags } : {}), ...(publishAt ? { publishAt } : {}), createdAt, updatedAt: typeof h.updatedAt === "number" && h.updatedAt > 0 ? h.updatedAt : createdAt, hidden: h.hidden === true, pinned: h.pinned === true, headline: h.headline !== false };
    if (seen.has(art.id)) continue;
    seen.add(art.id);
    if (art.pinned) { if (pinnedSeen) art.pinned = false; pinnedSeen = true; }
    out.push(art);
  }
  return out.slice(0, MAX_ARTICLES);
}
function readJson(key: string): unknown {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function ownToNews(a: OwnArticle): NewsItem {
  const summary = a.summary || `${a.body.replace(/\s+/g, " ").slice(0, 200).trim()}${a.body.length > 200 ? "…" : ""}`;
  return { id: a.id, title: a.title, link: `https://180news.co.za/story/${a.id}`, summary, ...(a.image ? { image: a.image } : {}), ...(a.links?.length ? { links: a.links } : {}), ...(a.tags?.length ? { tags: a.tags } : {}), author: a.author, published: a.publishAt ?? a.createdAt, feedId: "own", sourceId: SITE_NAME, section: a.section, body: a.body };
}
type ControlCtx = {
  settings: Settings; articles: OwnArticle[]; liveAt: number; sections: { id: string; label: string }[];
  update: (patch: Partial<Settings>) => void; resetSettings: () => void;
  patchArticle: (id: string, patch: Partial<OwnArticle>) => void;
  addArticle: (input: Omit<OwnArticle, "id" | "createdAt" | "updatedAt" | "hidden" | "pinned" | "headline"> & { publishAt?: number }, editId?: string) => { ok: boolean; id?: string; error?: string };
  publishNow: (id: string) => void; removeArticle: (id: string) => void;
  renameTag: (fromLower: string, to: string) => void; deleteTag: (fromLower: string) => void;
};
const ControlContext = createContext<ControlCtx | null>(null);
export function ControlProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => sanitiseSettings(readJson(K_CONTROL)));
  const [articles, setArticles] = useState<OwnArticle[]>(() => sanitiseArticles(readJson(K_ARTICLES)));
  const [liveAt, setLiveAt] = useState(() => Date.now());
  useEffect(() => {
    const future = articles.map((a) => a.publishAt ?? 0).filter((t) => t > liveAt);
    if (!future.length) return;
    const delay = Math.min(Math.max(0, Math.min(...future) - Date.now()) + 200, 2e9);
    const t = window.setTimeout(() => setLiveAt(Date.now()), delay);
    return () => window.clearTimeout(t);
  }, [articles, liveAt]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === K_CONTROL || e.key === null) setSettings(sanitiseSettings(readJson(K_CONTROL)));
      if (e.key === K_ARTICLES || e.key === null) setArticles(sanitiseArticles(readJson(K_ARTICLES)));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const storeSettings = useCallback((next: Settings) => { setSettings(next); try { localStorage.setItem(K_CONTROL, JSON.stringify(next)); } catch { /* ignore */ } }, []);
  const storeArticles = useCallback((next: OwnArticle[]): boolean => { try { localStorage.setItem(K_ARTICLES, JSON.stringify(next)); } catch { return false; } setArticles(next); return true; }, []);
  const update = useCallback((patch: Partial<Settings>) => storeSettings(sanitiseSettings({ ...settings, ...patch })), [storeSettings, settings]);
  const resetSettings = useCallback(() => storeSettings(DEFAULT_SETTINGS), [storeSettings]);
  const patchArticle = useCallback((id: string, patch: Partial<OwnArticle>) => { storeArticles(articles.map((a) => a.id === id ? { ...a, ...patch } : patch.pinned ? { ...a, pinned: false } : a)); }, [articles, storeArticles]);
  const addArticle = useCallback<ControlCtx["addArticle"]>((input, editId) => {
    const now = Date.now();
    const existing = editId ? articles.find((a) => a.id === editId) : undefined;
    if (!existing && articles.length >= MAX_ARTICLES) return { ok: false, error: `You can keep up to ${MAX_ARTICLES} articles in this browser. Delete an older one first.` };
    const id = existing ? existing.id : `my-${now.toString(36)}${Math.random().toString(36).slice(2, 6).padEnd(4, "0")}`;
    let publishAt = input.publishAt; let createdAt = existing?.createdAt ?? now;
    if (existing?.publishAt && input.publishAt === undefined) { if (existing.publishAt > now) createdAt = now; else publishAt = existing.publishAt; }
    const candidate: OwnArticle = existing ? { ...existing, ...input, publishAt, createdAt, updatedAt: now } : { hidden: false, pinned: false, headline: true, ...input, id, createdAt: now, updatedAt: now };
    const clean = sanitiseArticles([candidate]);
    if (!clean.length) return { ok: false, error: "The article could not be saved. Check the headline, name and text." };
    const saved = clean[0];
    let next = existing ? articles.map((a) => a.id === id ? saved : a) : [saved, ...articles];
    if (saved.pinned) next = next.map((a) => a.id !== id && a.pinned ? { ...a, pinned: false } : a);
    return storeArticles(next) ? { ok: true, id } : { ok: false, error: "This browser’s storage is full. Remove the picture or delete an older article, then try again." };
  }, [articles, storeArticles]);
  const publishNow = useCallback((id: string) => { const now = Date.now(); storeArticles(articles.map((a) => a.id === id ? { ...a, publishAt: undefined, createdAt: now, updatedAt: now } : a)); }, [articles, storeArticles]);
  const removeArticle = useCallback((id: string) => storeArticles(articles.filter((a) => a.id !== id)), [articles, storeArticles]);
  const renameTag = useCallback((fromLower: string, to: string) => {
    const from = fromLower.toLowerCase();
    storeArticles(articles.map((a) => {
      if (!a.tags?.some((t) => t.toLowerCase() === from)) return a;
      const tags = parseTags(a.tags.flatMap((t) => t.toLowerCase() === from ? (to ? [to] : []) : [t]));
      const copy = { ...a }; if (tags.length) copy.tags = tags; else delete copy.tags; return copy;
    }));
  }, [articles, storeArticles]);
  const deleteTag = useCallback((fromLower: string) => renameTag(fromLower, ""), [renameTag]);
  const sections = useMemo(() => SECTIONS.filter((s) => !settings.hiddenSections.includes(s.id)), [settings.hiddenSections]);
  const value = useMemo<ControlCtx>(() => ({ settings, articles, liveAt, sections, update, resetSettings, patchArticle, addArticle, publishNow, removeArticle, renameTag, deleteTag }), [settings, articles, liveAt, sections, update, resetSettings, patchArticle, addArticle, publishNow, removeArticle, renameTag, deleteTag]);
  return <ControlContext.Provider value={value}>{children}</ControlContext.Provider>;
}
export function useControl(): ControlCtx { const c = useContext(ControlContext); if (!c) throw new Error("useControl must be used inside <ControlProvider>"); return c; }

/* ================= Auth (browser-local newsroom accounts) ================= */
const K_TEAM = "180news:team:v1";
const K_ADMIN = "180news:admin:v1";
const K_SESSION = "180news:admin-session";
const K_TRIES = "180news:admin-tries";
const LOCK_MS = 150000; const MAX_TRIES = 5;
type TeamMember = { username: string; name: string; role: string; hash?: string; salt?: string };
type OwnerAccount = { username: string; name: string; role: string; hash: string; salt: string; question: string; answerHash: string; answerSalt: string };
const enc = new TextEncoder();
async function hashWithSalt(value: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(`${salt}:${value}`));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
const newSalt = () => { const b = new Uint8Array(16); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)); };
function readLocal(key: string): unknown { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } }
function sessionUser(): string | null { try { return sessionStorage.getItem(K_SESSION); } catch { return null; } }
function readTries(): { count: number; at: number } { try { const v = sessionStorage.getItem(K_TRIES); return v ? JSON.parse(v) : { count: 0, at: 0 }; } catch { return { count: 0, at: 0 }; } }
function writeTries(v: { count: number; at: number }) { try { sessionStorage.setItem(K_TRIES, JSON.stringify(v)); } catch { /* ignore */ } }
type AuthCtx = {
  status: "setup" | "signed-out" | "signed-in";
  user: { username: string; name: string; role: string } | null;
  account: OwnerAccount | null; team: TeamMember[];
  setUpOwner: (i: { username: string; name: string; password: string; question: string; answer: string }) => Promise<{ ok: boolean; error?: string }>;
  signIn: (u: string, p: string) => Promise<{ ok: boolean; error?: string; lockedFor?: number }>;
  signOut: () => void;
  addMember: (i: { username: string; name: string; password: string; role: string }) => Promise<{ ok: boolean; error?: string }>;
  removeMember: (username: string) => void;
  resetMemberPassword: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
  resetEverything: () => void;
};
const AuthContext = createContext<AuthCtx | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [owner, setOwner] = useState<OwnerAccount | null>(() => readLocal(K_ADMIN) as OwnerAccount | null);
  const [team, setTeam] = useState<TeamMember[]>(() => (readLocal(K_TEAM) as TeamMember[] | null) ?? []);
  const [session, setSession] = useState<string | null>(() => sessionUser());
  const status: AuthCtx["status"] = session && (session === owner?.username || team.some((m) => m.username === session)) ? "signed-in" : owner ? "signed-out" : "setup";
  const storeTeam = useCallback((next: TeamMember[]): boolean => { try { localStorage.setItem(K_TEAM, JSON.stringify(next)); } catch { return false; } setTeam(next); return true; }, []);
  const setUpOwner = useCallback<AuthCtx["setUpOwner"]>(async (input) => {
    if (!crypto?.subtle) return { ok: false, error: "This browser cannot set up a sign-in. A secure context (HTTPS) is required." };
    const salt = newSalt(); const hash = await hashWithSalt(input.password, salt);
    const aSalt = newSalt(); const aHash = await hashWithSalt(input.answer.trim().toLowerCase(), aSalt);
    const acct: OwnerAccount = { username: input.username.trim().toLowerCase(), name: input.name.trim(), role: "owner", hash, salt, question: input.question.trim(), answerHash: aHash, answerSalt: aSalt };
    try { localStorage.setItem(K_ADMIN, JSON.stringify(acct)); } catch { return { ok: false, error: "This browser would not store the account. Private browsing windows often block this, or its storage is full." }; }
    setOwner(acct);
    storeTeam([{ username: acct.username, name: acct.name, role: "owner" }]);
    try { sessionStorage.setItem(K_SESSION, acct.username); } catch { /* ignore */ }
    setSession(acct.username);
    return { ok: true };
  }, [storeTeam]);
  const signIn = useCallback<AuthCtx["signIn"]>(async (username, password) => {
    const tries = readTries();
    if (tries.count >= MAX_TRIES && Date.now() - tries.at < LOCK_MS) return { ok: false, error: "Too many tries. Wait a couple of minutes and try again.", lockedFor: Math.ceil((LOCK_MS - (Date.now() - tries.at)) / 1000) };
    const name = username.trim().toLowerCase();
    const ownerNow = tries.count >= MAX_TRIES ? null : (readLocal(K_ADMIN) as OwnerAccount | null);
    const member = team.find((m) => m.username === name);
    if (ownerNow && ownerNow.username === name) {
      if (await hashWithSalt(password, ownerNow.salt ?? "") === ownerNow.hash) { writeTries({ count: 0, at: 0 }); try { sessionStorage.setItem(K_SESSION, ownerNow.username); } catch { /* ignore */ } setSession(ownerNow.username); setOwner(ownerNow); return { ok: true }; }
    } else if (member?.hash && member.salt && await hashWithSalt(password, member.salt) === member.hash) {
      writeTries({ count: 0, at: 0 }); try { sessionStorage.setItem(K_SESSION, member.username); } catch { /* ignore */ } setSession(member.username); return { ok: true };
    }
    const next = { count: tries.count + 1, at: Date.now() }; writeTries(next);
    return { ok: false, error: next.count >= MAX_TRIES ? "Too many tries. Wait a couple of minutes and try again." : "That username and password do not match." };
  }, [team]);
  const signOut = useCallback(() => { try { sessionStorage.removeItem(K_SESSION); } catch { /* ignore */ } setSession(null); }, []);
  const addMember = useCallback<AuthCtx["addMember"]>(async (input) => {
    const name = input.username.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(name)) return { ok: false, error: "Usernames use 3–30 letters, numbers, dots, dashes or underscores, starting with a letter or number." };
    if (team.some((m) => m.username === name)) return { ok: false, error: "That username is already on the team." };
    const salt = newSalt(); const hash = await hashWithSalt(input.password, salt);
    return storeTeam([...team, { username: name, name: input.name.trim(), role: input.role, hash, salt }]) ? { ok: true } : { ok: false, error: "This browser would not store the account." };
  }, [team, storeTeam]);
  const removeMember = useCallback((username: string) => { storeTeam(team.filter((m) => m.username !== username || m.role === "owner")); }, [team, storeTeam]);
  const resetMemberPassword = useCallback<AuthCtx["resetMemberPassword"]>(async (username, password) => {
    const salt = newSalt(); const hash = await hashWithSalt(password, salt);
    return storeTeam(team.map((m) => m.username === username ? { ...m, hash, salt } : m)) ? { ok: true } : { ok: false, error: "This browser would not store the account." };
  }, [team, storeTeam]);
  const changePassword = useCallback<AuthCtx["changePassword"]>(async (current, next) => {
    const acct = readLocal(K_ADMIN) as OwnerAccount | null;
    if (!acct) return { ok: false, error: "No account in this browser." };
    if (await hashWithSalt(current, acct.salt ?? "") !== acct.hash) return { ok: false, error: "The current password is not right." };
    const salt = newSalt(); const updated = { ...acct, salt, hash: await hashWithSalt(next, salt) };
    try { localStorage.setItem(K_ADMIN, JSON.stringify(updated)); } catch { return { ok: false, error: "This browser would not store the account." }; }
    setOwner(updated); return { ok: true };
  }, []);
  const resetEverything = useCallback(() => {
    for (const k of [K_TEAM, K_ADMIN, K_SESSION, K_TRIES]) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch { /* ignore */ } }
    setTeam([]); setOwner(null); setSession(null);
  }, []);
  const user = useMemo(() => session ? (owner?.username === session ? { username: owner.username, name: owner.name, role: "owner" } : team.find((m) => m.username === session) ?? null) : null, [session, owner, team]);
  const value = useMemo<AuthCtx>(() => ({ status, user, account: owner, team, setUpOwner, signIn, signOut, addMember, removeMember, resetMemberPassword, changePassword, resetEverything }), [status, user, owner, team, setUpOwner, signIn, signOut, addMember, removeMember, resetMemberPassword, changePassword, resetEverything]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthCtx { const c = useContext(AuthContext); if (!c) throw new Error("useAuth must be used inside <AuthProvider>"); return c; }

/* ================= News ================= */
export type FeedState = { items: NewsItem[]; origin: "live" | "relay" | "cache" | "snapshot" | "cms" | "none"; fetchedAt: number; error?: string };
export type CmsStatus = { state: "live" | "bundle" | "stale" | "unavailable" | "loading"; at: number; count: number };
export type NewsStatus = { kind: "live" | "loading" | "saved" | "offline"; at: number | null; live: number; total: number };
type NewsCtx = {
  ready: boolean; refreshing: boolean; now: number;
  feeds: Record<string, FeedState>;
  bySection: Record<string, NewsItem[]>; byId: Map<string, NewsItem>; all: NewsItem[];
  featured?: NewsItem; headlines: NewsItem[];
  status: NewsStatus; cmsStatus: CmsStatus;
  adsEnabled: boolean; cmsAds: CmsAd[]; cmsAdsStatus: CmsStatus;
  pendingCount: number; applyPending: () => void; refresh: () => void;
};
const NewsContext = createContext<NewsCtx | null>(null);
const K_FEEDS = "180news:feeds:v1";
const CACHE_FRESH_MS = 30 * 60000;
const STALE_MS = 20 * 60000;
const PER_FEED_CAP = 24;
const CACHE_CAP = 16;
const TOP_SECTIONS = ["south-africa", "politics", "business"];
function loadCache(): { feeds: Record<string, FeedState>; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(K_FEEDS); if (!raw) return null;
    const o = JSON.parse(raw) as { savedAt?: unknown; feeds?: unknown };
    if (typeof o.savedAt !== "number" || !o.feeds || typeof o.feeds !== "object") return null;
    const feeds: Record<string, FeedState> = {};
    for (const f of FEEDS) {
      const d = (o.feeds as Record<string, unknown>)[f.id];
      if (!d || typeof d !== "object") continue;
      const items = (d as { items?: unknown }).items; const fetchedAt = (d as { fetchedAt?: unknown }).fetchedAt;
      if (!Array.isArray(items) || typeof fetchedAt !== "number") continue;
      const valid = items.filter(isNewsItem);
      if (valid.length) feeds[f.id] = { items: valid, origin: "cache", fetchedAt };
    }
    return Object.keys(feeds).length ? { feeds, savedAt: o.savedAt } : null;
  } catch { return null; }
}
function saveCache(feeds: Record<string, FeedState>) {
  try {
    const out: Record<string, { items: NewsItem[]; fetchedAt: number }> = {};
    for (const [k, v] of Object.entries(feeds)) if ((v.origin === "live" || v.origin === "relay" || v.origin === "cache") && v.items.length) out[k] = { items: v.items.slice(0, CACHE_CAP), fetchedAt: v.fetchedAt };
    if (Object.keys(out).length) localStorage.setItem(K_FEEDS, JSON.stringify({ savedAt: Date.now(), feeds: out }));
  } catch { /* ignore */ }
}
let snapshotPromise: Promise<{ generatedAt: number; feeds: Record<string, unknown> } | null> | null = null;
function loadSnapshot() {
  if (snapshotPromise) return snapshotPromise;
  snapshotPromise = (async () => {
    for (const url of [`${ORIGIN}/snapshot.json`, "/snapshot.json"]) {
      try {
        const r = await fetch(url, { headers: { Accept: "application/json" } });
        if (!r.ok) continue;
        const j = await r.json();
        if (j && typeof j.generatedAt === "number" && j.feeds && typeof j.feeds === "object") return j;
      } catch { /* try next */ }
    }
    snapshotPromise = null; return null;
  })();
  return snapshotPromise;
}
class HttpError extends Error { status: number; constructor(s: number) { super(`HTTP ${s}`); this.status = s; } }
function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === "function") return AbortSignal.timeout(ms);
  const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal;
}
async function fetchJson(url: string, ms: number): Promise<unknown> {
  const r = await fetch(url, { signal: timeoutSignal(ms), headers: { Accept: "application/json" } });
  if (!r.ok) throw new HttpError(r.status);
  if (!(r.headers.get("content-type") ?? "").includes("json")) throw new Error("Unexpected response");
  return r.json();
}
function errText(e: unknown): string {
  return e instanceof Error ? (e.name === "TimeoutError" || e.name === "AbortError" ? "Timed out" : e.name === "TypeError" ? "Network error" : e.message.slice(0, 100)) : "Request failed";
}
let relayBlockedUntil = 0; let relayActive = 0; const relayQueue: (() => void)[] = [];
async function relayGate<T>(fn: () => Promise<T>): Promise<T> {
  if (relayActive >= 4) await new Promise<void>((res) => relayQueue.push(res));
  relayActive += 1;
  try { return await fn(); } finally { relayActive -= 1; relayQueue.shift()?.(); }
}
async function fetchViaRelay(feed: FeedDef): Promise<NewsItem[]> {
  if (Date.now() < relayBlockedUntil) throw new Error("Relay is rate-limited");
  let payload: unknown;
  try { payload = await fetchJson(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`, 12000); }
  catch (e) { if (e instanceof HttpError && e.status === 429) relayBlockedUntil = Date.now() + 10 * 60000; throw e; }
  const o = payload as { status?: string; items?: unknown };
  if (!o || o.status !== "ok" || !Array.isArray(o.items)) throw new Error("Relay could not read feed");
  const out: NewsItem[] = [];
  for (const raw of o.items as Record<string, unknown>[]) {
    const enc = raw.enclosure as { link?: string; type?: string } | undefined;
    const thumb = enc?.link && (!enc.type || enc.type.startsWith("image/")) ? enc.link : undefined;
    const pubRaw = typeof raw.pubDate === "string" ? raw.pubDate : "";
    const pub = pubRaw ? Date.parse(`${pubRaw.trim().replace(" ", "T")}Z`) : NaN;
    const item = toNewsItem({ title: String(raw.title ?? ""), link: String(raw.link ?? ""), descriptionHtml: String(raw.description ?? ""), contentHtml: String(raw.content ?? ""), image: (typeof raw.thumbnail === "string" && raw.thumbnail ? raw.thumbnail : thumb), author: typeof raw.author === "string" ? raw.author : undefined, categories: Array.isArray(raw.categories) ? raw.categories.filter((g) => typeof g === "string") as string[] : [], published: Number.isNaN(pub) ? null : pub }, feed);
    if (item) out.push(item);
  }
  const cleaned = dedupeCap(out, PER_FEED_CAP);
  if (!cleaned.length) throw new Error("Feed returned no stories");
  return cleaned;
}
async function fetchViaApi(feeds: FeedDef[]): Promise<Record<string, { items: NewsItem[]; fetchedAt: number }>> {
  const ids = feeds.map((f) => f.id).join(",");
  const payload = await fetchJson(`/api/feed?ids=${encodeURIComponent(ids)}`, 14000) as { feeds?: unknown };
  if (!payload || typeof payload.feeds !== "object" || payload.feeds === null) throw new Error("Unexpected response");
  const now = Date.now(); const out: Record<string, { items: NewsItem[]; fetchedAt: number }> = {};
  for (const f of feeds) {
    const entry = (payload.feeds as Record<string, unknown>)[f.id] as { ok?: boolean; items?: unknown; fetchedAt?: unknown } | undefined;
    if (entry?.ok && Array.isArray(entry.items)) {
      const valid = entry.items.filter(isNewsItem);
      const at = typeof entry.fetchedAt === "number" && entry.fetchedAt > 0 ? Math.min(entry.fetchedAt, now) : now;
      if (valid.length) out[f.id] = { items: valid, fetchedAt: at };
    }
  }
  return out;
}
type FetchOutcome = { ok: true; items: NewsItem[]; origin: "live" | "relay"; fetchedAt: number } | { ok: false; error: string };
let apiBlockedUntil = 0;
async function fetchSectionFeeds(feeds: FeedDef[]): Promise<Record<string, FetchOutcome>> {
  const out: Record<string, FetchOutcome> = {};
  // The original gates both its /api/feed call and the rss2json relay behind one
  // cooldown timer, so an /api failure also blocks the relay. On this clone (no
  // same-origin /api unless proxied) keep the two cooldowns separate so the
  // relay fallback can actually run, as the UI promises ("Live via relay").
  if (Date.now() > apiBlockedUntil) {
    try {
      const live = await fetchViaApi(feeds);
      for (const [k, v] of Object.entries(live)) out[k] = { ok: true, items: v.items, origin: "live", fetchedAt: v.fetchedAt };
    } catch { apiBlockedUntil = Date.now() + 10 * 60000; }
  }
  await Promise.all(feeds.filter((f) => !out[f.id]).map((f) => relayGate(async () => {
    try { out[f.id] = { ok: true, items: await fetchViaRelay(f), origin: "relay", fetchedAt: Date.now() }; }
    catch (e) { out[f.id] = { ok: false, error: errText(e) }; }
  })));
  return out;
}
// CMS sync — 180news' own stories are loaded from cms.180news.co.za.
// The CMS public contract (GET /api/public?resource=articles|article|comments) returns
// snake_case records: {id, headline, summary, body, section, tags, image_url,
// image_caption, image_credit, author_name, placement (main|headline|none), status,
// publish_at, media[], …} and story paths /story/my-cmsNNNNNNN. We map both that
// contract and the older camelCase shape the original front page expected.
// NOTE: the CMS currently implements /api/public only inside its own page (there is
// no HTTP endpoint yet — direct requests 404), so after trying the live API we fall
// back to reading the published articles seeded in the CMS app bundle itself. The
// live API is always tried first, so this upgrades automatically the moment the
// CMS ships real endpoints; bundle articles an editor creates are visible once the
// CMS is redeployed, and live-API articles the moment they publish.
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? v as Record<string, unknown> : {});
function parseCmsDate(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim(); if (!s) return null;
  const t = Date.parse(/[zZ]$|[+-]\d\d:\d\d$/.test(s) ? s : `${s.replace(" ", "T")}Z`);
  return Number.isFinite(t) ? t : null;
}
/** CMS image/media URLs may be site-relative (e.g. /images/news/…) — resolve on the CMS origin. */
function resolveCmsUrl(v: unknown): string | undefined {
  if (!nonEmpty(v)) return undefined;
  const s = v.trim();
  if (/^https:\/\//i.test(s)) return s;
  if (/^http:\/\//i.test(s)) return `https://${s.slice(7)}`;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("data:image/")) return s;
  if (s.startsWith("/")) return `${CMS}${s}`;
  return undefined;
}
function cmsMediaAndLinks(list: unknown[], ownerId: string): { media?: NewsItem["media"]; links?: string[] } {
  const media: NonNullable<NewsItem["media"]> = [];
  const links: string[] = [];
  list.forEach((d, idx) => {
    if (!d || typeof d !== "object") return;
    const h = d as Record<string, unknown>;
    const youtubeId = nonEmpty(h.youtube_id) ? h.youtube_id : nonEmpty(h.youtubeId) ? h.youtubeId : undefined;
    if (youtubeId) links.push(`https://www.youtube.com/watch?v=${youtubeId}`);
    const url = resolveCmsUrl(h.url ?? h.file_url ?? h.src ?? h.fileUrl); if (!url) return;
    const ct = nonEmpty(h.contentType) ? h.contentType : nonEmpty(h.content_type) ? h.content_type : "";
    const type = h.type ?? h.kind;
    const kind = (type === "photo" || type === "video" || type === "audio" ? type : undefined) ?? (ct.startsWith("image/") ? "photo" : ct.startsWith("video/") ? "video" : ct.startsWith("audio/") ? "audio" : /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) ? "photo" : /\.(mp4|webm|mov)(\?|$)/i.test(url) ? "video" : /\.(mp3|m4a|wav|ogg)(\?|$)/i.test(url) ? "audio" : undefined);
    if (kind) media.push({ id: `cms-${ownerId}-m${idx}`, kind, url, ...(nonEmpty(h.caption) ? { caption: h.caption } : {}), ...(nonEmpty(h.credit) ? { credit: h.credit } : {}), ...(typeof h.width === "number" ? { width: h.width } : {}), ...(typeof h.height === "number" ? { height: h.height } : {}), ...(ct ? { contentType: ct } : {}), position: h.position === "before" || h.position === "after" ? h.position : h.slot === "bottom" ? "after" : "before" });
  });
  return { ...(media.length ? { media } : {}), ...(links.length ? { links: [...new Set(links)] } : {}) };
}
function cmsMedia(list: unknown[], ownerId: string): NewsItem["media"] { return cmsMediaAndLinks(list, ownerId).media; }
function cmsBoolean(v: unknown, fallback = true): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return !["false", "0", "off", "no"].includes(v.trim().toLowerCase());
  if (v && typeof v === "object") return cmsBoolean((v as Record<string, unknown>).enabled, fallback);
  return fallback;
}
function cmsDimension(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 20000 ? Math.round(n) : undefined;
}
function cmsToAd(rawInput: Record<string, unknown>, index = 0): CmsAd | null {
  const raw = asRecord(rawInput);
  const slot = (nonEmpty(raw.slot) ? raw.slot : nonEmpty(raw.position) ? raw.position : "").trim().toLowerCase();
  if (!slot) return null;
  const numericId = typeof raw.id === "number" ? raw.id : typeof raw.id === "string" && /^\d+$/.test(raw.id) ? Number(raw.id) : index + 1;
  const linkRaw = raw.link_url ?? raw.linkUrl ?? raw.url ?? raw.link;
  const linkUrl = nonEmpty(linkRaw) ? (resolveCmsUrl(linkRaw) ?? (/^[\w.-]+\//.test(linkRaw.trim()) ? `https://${linkRaw.trim()}` : "")) : "";
  const imageObject = raw.image && typeof raw.image === "object" ? asRecord(raw.image) : null;
  return {
    id: numericId,
    slot,
    slotName: nonEmpty(raw.slot_name) ? raw.slot_name : nonEmpty(raw.slotName) ? raw.slotName : nonEmpty(raw.name) ? raw.name : slot,
    advertiser: nonEmpty(raw.advertiser) ? raw.advertiser : nonEmpty(raw.advertiser_name) ? raw.advertiser_name : "",
    linkUrl,
    image: resolveCmsUrl(raw.image_url ?? raw.imageUrl ?? imageObject?.url ?? (typeof raw.image === "string" ? raw.image : undefined)),
    position: (nonEmpty(raw.position) ? raw.position : slot).trim().toLowerCase(),
    enabled: cmsBoolean(raw.enabled, true),
    width: cmsDimension(raw.width ?? raw.w),
    height: cmsDimension(raw.height ?? raw.h),
  };
}
function cmsAdsFromPayload(payload: unknown): CmsAd[] {
  const list = Array.isArray(payload) ? payload : Array.isArray(asRecord(payload).ads) ? asRecord(payload).ads as unknown[] : Array.isArray(asRecord(payload).adverts) ? asRecord(payload).adverts as unknown[] : [];
  return list.map((raw, i) => cmsToAd(asRecord(raw), i)).filter((ad): ad is CmsAd => ad !== null).sort((a, b) => a.id - b.id);
}
function cmsToItem(rawInput: Record<string, unknown>): NewsItem | null {
  const raw = asRecord(rawInput);
  const numericId = typeof raw.id === "number" ? raw.id : typeof raw.id === "string" && /^\d+$/.test(raw.id) ? Number(raw.id) : null;
  const headline = nonEmpty(raw.headline) ? raw.headline : nonEmpty(raw.title) ? raw.title : "";
  const sectionRaw = (nonEmpty(raw.section) ? raw.section : "").trim().toLowerCase();
  if (numericId === null || !headline || !sectionRaw) return null;
  if (nonEmpty(raw.status) && raw.status !== "published") return null;
  const section = SECTION_MAP[sectionRaw] ? sectionRaw : "south-africa";
  const id = cmsStoryId(numericId);
  const slug = nonEmpty(raw.slug) && !/^cms-\d+$/.test(raw.slug) ? raw.slug : id;
  const imgObj = raw.image && typeof raw.image === "object" ? asRecord(raw.image) : null;
  const image = resolveCmsUrl(raw.image_url ?? raw.imageUrl ?? imgObj?.url ?? (typeof raw.image === "string" ? raw.image : undefined));
  const { media, links } = cmsMediaAndLinks(Array.isArray(raw.media) ? raw.media : [], String(numericId));
  const extraLinks = [...(links ?? []), ...(Array.isArray(raw.links) ? raw.links.filter(nonEmpty).filter((l) => /^https:\/\//.test(l)) : [])];
  const author = nonEmpty(raw.author_name) ? raw.author_name : nonEmpty(raw.authorName) ? raw.authorName : nonEmpty(raw.author) ? raw.author : undefined;
  const placement = nonEmpty(raw.placement) ? raw.placement : undefined;
  const link = resolveCmsUrl(raw.url) && /^https:\/\/180news\.co\.za\//.test(String(raw.url)) ? String(raw.url) : `https://180news.co.za/story/${id}`;
  return {
    id, title: headline, link,
    summary: nonEmpty(raw.summary) ? raw.summary : "",
    ...(image ? { image } : {}),
    ...(nonEmpty(raw.image_caption ?? raw.imageCaption) ? { imageCaption: String(raw.image_caption ?? raw.imageCaption) } : {}),
    ...(nonEmpty(raw.image_credit ?? raw.imageCredit) ? { imageCredit: String(raw.image_credit ?? raw.imageCredit) } : {}),
    ...(author ? { author } : {}),
    published: parseCmsDate(raw.publish_at ?? raw.publishedAt ?? raw.published_at ?? raw.created_at ?? raw.createdAt),
    feedId: "cms", sourceId: SITE_NAME, section, slug,
    headline: placement === "headline",
    ...(placement ? { placement } : {}),
    ...(nonEmpty(raw.body) ? { body: raw.body } : {}),
    tags: Array.isArray(raw.tags) ? raw.tags.filter(nonEmpty) : undefined,
    ...(media ? { media } : {}),
    ...(extraLinks.length ? { links: [...new Set(extraLinks)] } : {}),
  };
}
/* --- CMS bundle seed extraction (fallback while the CMS has no HTTP API) ---
   The CMS ships its published stories in its app bundle. We locate the seeded
   `articles:[…]` array and read each record with a string-aware scanner (no eval,
   nothing executed) so 180news stories still load from cms.180news.co.za itself.
   The bundle is only re-downloaded when the CMS asset filename changes. */
function scanString(src: string, start: number): { value: string; end: number } | null {
  const quote = src[start];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") { i += 2; continue; }
    if (ch === quote) {
      const raw = src.slice(start, i + 1);
      if (quote === '"') { try { return { value: JSON.parse(raw) as string, end: i }; } catch { return { value: raw.slice(1, -1), end: i }; } }
      return { value: src.slice(start + 1, i).replace(/\\`/g, "`").replace(/\\'/g, "'").replace(/\\\\/g, "\\"), end: i };
    }
    i += 1;
  }
  return null;
}
function scanBalanced(src: string, start: number, open: string, close: string): number {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === "`") { const s = scanString(src, i); if (!s) return -1; i = s.end; continue; }
    if (ch === open) depth += 1;
    else if (ch === close) { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}
function seedStringField(obj: string, name: string): string | undefined {
  const m = new RegExp(`\\b${name}:\\s*`).exec(obj);
  if (!m) return undefined;
  const at = m.index + m[0].length;
  const ch = obj[at];
  if (ch === '"' || ch === "'" || ch === "`") return scanString(obj, at)?.value;
  return undefined;
}
function extractSeedArticles(js: string): Record<string, unknown>[] {
  const marker = js.indexOf("articles:[{id:");
  if (marker < 0) return [];
  const arrStart = js.indexOf("[", marker);
  const arrEnd = scanBalanced(js, arrStart, "[", "]");
  if (arrStart < 0 || arrEnd < 0) return [];
  const region = js.slice(arrStart, arrEnd + 1);
  const out: Record<string, unknown>[] = [];
  let cursor = 0;
  for (;;) {
    const objStart = region.indexOf("{id:", cursor);
    if (objStart < 0) break;
    const objEnd = scanBalanced(region, objStart, "{", "}");
    if (objEnd < 0) break;
    const obj = region.slice(objStart, objEnd + 1);
    cursor = objEnd + 1;
    const idMatch = /^\{id:(\d+)/.exec(obj);
    if (!idMatch) continue;
    const tagsAt = obj.indexOf("tags:[");
    let tags: string[] = [];
    if (tagsAt >= 0) {
      const tEnd = scanBalanced(obj, tagsAt + 5, "[", "]");
      if (tEnd > 0) tags = [...obj.slice(tagsAt + 5, tEnd + 1).matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((t) => { try { return JSON.parse(`"${t[1]}"`) as string; } catch { return t[1]; } });
    }
    out.push({
      id: Number(idMatch[1]),
      headline: seedStringField(obj, "headline") ?? "",
      summary: seedStringField(obj, "summary") ?? "",
      body: seedStringField(obj, "body") ?? "",
      section: seedStringField(obj, "section") ?? "",
      tags,
      image_url: seedStringField(obj, "image_url"),
      image_caption: seedStringField(obj, "image_caption"),
      image_credit: seedStringField(obj, "image_credit"),
      author_name: seedStringField(obj, "author_name"),
      placement: seedStringField(obj, "placement") ?? "none",
      status: seedStringField(obj, "status") ?? "published",
      publish_at: seedStringField(obj, "publish_at") ?? seedStringField(obj, "created_at"),
      media: [],
    });
  }
  return out;
}
function seedNumberField(obj: string, name: string): number | undefined {
  const m = new RegExp(`\\b${name}:\\s*(-?\\d+(?:\\.\\d+)?)`).exec(obj);
  return m ? Number(m[1]) : undefined;
}
function seedBooleanField(obj: string, name: string): boolean | undefined {
  const m = new RegExp(`\\b${name}:\\s*(!0|!1|true|false|0|1)\\b`).exec(obj);
  if (!m) return undefined;
  return m[1] === "!0" || m[1] === "true" || m[1] === "1";
}
function extractSeedRecords(js: string, key: string): string[] {
  const marker = js.indexOf(`${key}:[{id:`);
  if (marker < 0) return [];
  const arrStart = js.indexOf("[", marker);
  const arrEnd = scanBalanced(js, arrStart, "[", "]");
  if (arrStart < 0 || arrEnd < 0) return [];
  const region = js.slice(arrStart, arrEnd + 1);
  const out: string[] = [];
  let cursor = 0;
  for (;;) {
    const objStart = region.indexOf("{id:", cursor);
    if (objStart < 0) break;
    const objEnd = scanBalanced(region, objStart, "{", "}");
    if (objEnd < 0) break;
    out.push(region.slice(objStart, objEnd + 1));
    cursor = objEnd + 1;
  }
  return out;
}
function extractSeedAds(js: string): CmsAd[] {
  return extractSeedRecords(js, "ads").map((obj, i) => cmsToAd({
    id: seedNumberField(obj, "id") ?? i + 1,
    slot: seedStringField(obj, "slot") ?? seedStringField(obj, "position") ?? "",
    slot_name: seedStringField(obj, "slot_name") ?? "",
    advertiser: seedStringField(obj, "advertiser") ?? "",
    link_url: seedStringField(obj, "link_url") ?? "",
    image_url: seedStringField(obj, "image_url"),
    position: seedStringField(obj, "position") ?? seedStringField(obj, "slot") ?? "",
    enabled: seedBooleanField(obj, "enabled") ?? true,
    width: seedNumberField(obj, "width"),
    height: seedNumberField(obj, "height"),
  }, i)).filter((ad): ad is CmsAd => ad !== null);
}
function extractSeedAdsEnabled(js: string): boolean {
  const m = /\bads_enabled:\s*(\{[^}]*\benabled:\s*)?(!0|!1|true|false|0|1)\b/.exec(js);
  if (!m) return true;
  return m[2] === "!0" || m[2] === "true" || m[2] === "1";
}
type CmsBundleSync = { articles: NewsItem[]; adsEnabled: boolean; cmsAds: CmsAd[] };
let lastBundleAsset = "";
let bundleSync: CmsBundleSync | null = null;
async function fetchCmsFromBundle(): Promise<CmsBundleSync> {
  const home = await fetch(`${CMS}/`, { headers: { Accept: "text/html" } });
  if (!home.ok) throw new Error(`HTTP ${home.status}`);
  const html = await home.text();
  const asset = /\/assets\/index-[^"']+\.js/.exec(html)?.[0];
  if (!asset) throw new Error("CMS bundle not found");
  if (asset === lastBundleAsset && bundleSync) return bundleSync;
  const res = await fetch(`${CMS}${asset}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const js = await res.text();
  const articles = extractSeedArticles(js).map(cmsToItem).filter((x): x is NewsItem => x !== null).sort(byPublished).slice(0, 100);
  if (!articles.length) throw new Error("No published CMS articles in bundle");
  const next: CmsBundleSync = { articles, adsEnabled: extractSeedAdsEnabled(js), cmsAds: extractSeedAds(js) };
  lastBundleAsset = asset; bundleSync = next;
  return next;
}
export type CmsSyncResult = { articles: NewsItem[]; adsEnabled: boolean; cmsAds: CmsAd[]; origin: "live" | "bundle" | "stale"; adsOrigin: "live" | "bundle" | "stale"; at: number };
let cmsCache: (CmsSyncResult & { cachedAt: number }) | null = null; let cmsPromise: Promise<CmsSyncResult> | null = null;
async function fetchCmsJson(url: string): Promise<unknown> { const r = await fetch(url, { headers: { Accept: "application/json" } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
function dedupeCms(list: NewsItem[]): NewsItem[] {
  const byKey = new Map<string, NewsItem>();
  for (const a of list) { const prev = byKey.get(a.id); if (!prev || (a.body && !prev.body) || (a.published ?? 0) > (prev.published ?? 0)) byKey.set(a.id, prev && a.body ? { ...prev, ...a } : a); }
  return [...byKey.values()].sort(byPublished);
}
async function fetchCmsLive(): Promise<NewsItem[]> {
  const payload = await fetchCmsJson(`${CMS}/api/public?resource=articles`);
  let raws: Record<string, unknown>[] = [];
  if (Array.isArray(payload)) raws = payload as Record<string, unknown>[];
  else {
    const o = asRecord(payload);
    if (Array.isArray(o.articles)) raws = o.articles as Record<string, unknown>[];
    else if (Array.isArray(o.latest) || o.lead) {
      const fromSections = Array.isArray(o.sections) ? (o.sections as Record<string, unknown>[]).flatMap((s) => Array.isArray(s.stories) ? s.stories as Record<string, unknown>[] : []) : [];
      raws = [...(o.lead ? [asRecord(o.lead)] : []), ...((o.headlines as Record<string, unknown>[] | undefined) ?? []), ...((o.latest as Record<string, unknown>[] | undefined) ?? []), ...fromSections];
    } else throw new Error("Unexpected CMS response");
  }
  let list = dedupeCms(raws.map(cmsToItem).filter((x): x is NewsItem => x !== null));
  const needBody = list.filter((c) => !c.body && cmsNumericId(c.id) !== null).slice(0, 12);
  if (needBody.length) {
    const settled = await Promise.allSettled(needBody.map(async (c) => ({ id: c.id, data: await fetchCmsJson(`${CMS}/api/public?resource=article&id=${cmsNumericId(c.id)}`) })));
    list = list.map((c) => {
      const hit = settled.find((s) => s.status === "fulfilled" && s.value.id === c.id);
      if (!hit || hit.status !== "fulfilled") return c;
      const full = cmsToItem(asRecord(hit.value.data));
      return full ? { ...c, ...full } : c;
    });
  }
  return list;
}
async function fetchCmsAdsLive(): Promise<{ adsEnabled: boolean; cmsAds: CmsAd[] }> {
  const [configResult, adsResult] = await Promise.allSettled([
    fetchCmsJson(`${CMS}/api/public?resource=config`),
    fetchCmsJson(`${CMS}/api/public?resource=ads`),
  ]);
  const settingsResult = configResult.status === "rejected" ? await Promise.allSettled([fetchCmsJson(`${CMS}/api/public?resource=settings`)]) : null;
  const configPayload = configResult.status === "fulfilled" ? configResult.value : settingsResult?.[0].status === "fulfilled" ? settingsResult[0].value : null;
  if (adsResult.status === "rejected" && configPayload === null) throw new Error("CMS adverts unavailable");
  const adsPayload = adsResult.status === "fulfilled" ? adsResult.value : configPayload;
  const adsRecord = asRecord(adsPayload);
  const configRecord = asRecord(configPayload);
  const adsEnabled = cmsBoolean(configRecord.ads_enabled ?? configRecord.adsEnabled ?? adsRecord.ads_enabled ?? adsRecord.adsEnabled, true);
  return { adsEnabled, cmsAds: cmsAdsFromPayload(adsPayload) };
}
function fetchCmsArticles(force = false): Promise<CmsSyncResult> {
  if (!force && cmsCache && Date.now() - cmsCache.cachedAt < 30000) return Promise.resolve(cmsCache);
  if (cmsPromise) return cmsPromise;
  cmsPromise = (async (): Promise<CmsSyncResult> => {
    try {
      const articles = await fetchCmsLive();
      try {
        const ads = await fetchCmsAdsLive();
        return { articles, ...ads, origin: "live", adsOrigin: "live", at: Date.now() };
      } catch {
        const bundle = await fetchCmsFromBundle();
        return { articles, adsEnabled: bundle.adsEnabled, cmsAds: bundle.cmsAds, origin: "live", adsOrigin: "bundle", at: Date.now() };
      }
    } catch {
      const bundle = await fetchCmsFromBundle();
      return { ...bundle, origin: "bundle", adsOrigin: "bundle", at: Date.now() };
    }
  })().then((result) => { cmsCache = { ...result, cachedAt: Date.now() }; cmsPromise = null; return result; }).catch(() => { cmsPromise = null; return cmsCache ? { articles: cmsCache.articles, adsEnabled: cmsCache.adsEnabled, cmsAds: cmsCache.cmsAds, origin: "stale" as const, adsOrigin: "stale" as const, at: cmsCache.at } : { articles: [] as NewsItem[], adsEnabled: false, cmsAds: [] as CmsAd[], origin: "stale" as const, adsOrigin: "stale" as const, at: 0 }; });
  return cmsPromise;
}

export function NewsProvider({ children }: { children: React.ReactNode }) {
  const { settings, articles: ownArticles, liveAt } = useControl();
  const hiddenSections = settings.hiddenSections; const hiddenSources = settings.hiddenSources;
  const refreshMs = settings.refreshMinutes * 60000;
  const [initialCache] = useState(loadCache);
  const [feeds, setFeeds] = useState<Record<string, FeedState>>(() => initialCache?.feeds ?? {});
  const [ready, setReady] = useState(() => !!initialCache && Date.now() - initialCache.savedAt < CACHE_FRESH_MS);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [cmsArticles, setCmsArticles] = useState<NewsItem[]>([]);
  const [cmsStatus, setCmsStatus] = useState<CmsStatus>({ state: "loading", at: 0, count: 0 });
  const [cmsAds, setCmsAds] = useState<CmsAd[]>([]);
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [cmsAdsStatus, setCmsAdsStatus] = useState<CmsStatus>({ state: "loading", at: 0, count: 0 });
  const feedsRef = useRef<Record<string, FeedState>>(initialCache?.feeds ?? {});
  const pendingRef = useRef<Record<string, FeedState> | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);
  const interactedRef = useRef(false);
  const lastFetchRef = useRef(0);
  const staleRetriedRef = useRef(false);
  const runRef = useRef<((mode: "initial" | "auto" | "manual") => Promise<void>) | null>(null);
  const cmsSignatureRef = useRef("");
  const cmsLastLoadRef = useRef(0);
  const loadCms = useCallback((force = false) => {
    cmsLastLoadRef.current = Date.now();
    fetchCmsArticles(force).then((result) => {
      // Only a live CMS public-API response may put adverts on the public app.
      // Bundle/stale ad records remain available for read-only status, but are never displayed.
      const displayAdsEnabled = result.adsOrigin === "live" && result.adsEnabled;
      const signature = JSON.stringify({ articles: result.articles.map((a) => [a.id, a.title, a.published, a.summary, a.body?.length ?? 0, a.image ?? ""]), adsEnabled: displayAdsEnabled, adsOrigin: result.adsOrigin, cmsAds: result.cmsAds });
      if (signature !== cmsSignatureRef.current) { cmsSignatureRef.current = signature; setCmsArticles(result.articles); setCmsAds(result.cmsAds); }
      setAdsEnabled(displayAdsEnabled);
      setCmsStatus(result.articles.length || result.origin === "live" ? { state: result.origin, at: result.at || Date.now(), count: result.articles.length } : { state: "unavailable", at: result.at, count: 0 });
      setCmsAdsStatus(result.adsOrigin === "stale" && result.at === 0 ? { state: "unavailable", at: 0, count: 0 } : { state: result.adsOrigin, at: result.at || Date.now(), count: displayAdsEnabled ? result.cmsAds.filter((ad) => ad.enabled && ad.image).length : 0 });
    });
  }, []);
  useEffect(() => {
    loadCms();
    // Automatic CMS sync: re-check cms.180news.co.za every minute (and on wake),
    // alongside the RSS auto-refresh, so new 180news stories appear on their own.
    const t = window.setInterval(() => { if (!document.hidden) loadCms(); }, 60000);
    const onWake = () => { if (!document.hidden && Date.now() - cmsLastLoadRef.current > 60000) loadCms(); };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("online", onWake);
    window.addEventListener("focus", onWake);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", onWake); window.removeEventListener("online", onWake); window.removeEventListener("focus", onWake); };
  }, [loadCms]);
  const applyFeeds = useCallback((patch: Record<string, FeedState>) => {
    if (!Object.keys(patch).length) return;
    feedsRef.current = { ...feedsRef.current, ...patch };
    setFeeds(feedsRef.current);
  }, []);
  const fillFromSnapshot = useCallback(async () => {
    const missing = FEEDS.filter((f) => !feedsRef.current[f.id]?.items.length);
    if (!missing.length) return;
    const snap = await loadSnapshot(); if (!snap) return;
    const patch: Record<string, FeedState> = {};
    for (const f of missing) {
      if (feedsRef.current[f.id]?.items.length) continue;
      const items = (Array.isArray(snap.feeds[f.id]) ? snap.feeds[f.id] as unknown[] : []).filter(isNewsItem);
      if (items.length) patch[f.id] = { items, origin: "snapshot", fetchedAt: snap.generatedAt, error: feedsRef.current[f.id]?.error };
    }
    applyFeeds(patch);
  }, [applyFeeds]);
  const runFetch = useCallback(async (mode: "initial" | "auto" | "manual") => {
    if (mode !== "auto") interactedRef.current = true;
    if (inflightRef.current) return inflightRef.current;
    const job = (async () => {
      setRefreshing(true); lastFetchRef.current = Date.now();
      const staged: Record<string, FeedState> = {}; const doneSections = new Set<string>(); let latest = 0;
      await Promise.all(SECTIONS.map(async (sec) => {
        const list = feedsForSection(sec.id);
        const outcomes = await fetchSectionFeeds(list);
        const patch: Record<string, FeedState> = {};
        for (const f of list) {
          const o = outcomes[f.id]; const prev = feedsRef.current[f.id];
          if (o?.ok) { patch[f.id] = { items: o.items, origin: o.origin, fetchedAt: o.fetchedAt }; latest = Math.max(latest, o.fetchedAt); }
          else { const err = o && !o.ok ? o.error : "Request failed"; patch[f.id] = prev ? { ...prev, error: err } : { items: [], origin: "none", fetchedAt: 0, error: err }; }
        }
        if (interactedRef.current) applyFeeds(patch); else Object.assign(staged, patch);
        doneSections.add(sec.id);
        if (mode === "initial" && TOP_SECTIONS.every((s) => doneSections.has(s))) setReady(true);
      }));
      if (Object.keys(staged).length) {
        if (interactedRef.current) applyFeeds(staged);
        else {
          const known = new Set<string>();
          for (const v of Object.values(feedsRef.current)) for (const it of v.items) known.add(it.id);
          const fresh = new Set<string>();
          for (const v of Object.values(staged)) for (const it of v.items) if (!known.has(it.id)) fresh.add(it.id);
          if (fresh.size > 0) { pendingRef.current = staged; setPendingCount(fresh.size); } else applyFeeds(staged);
        }
      }
      await fillFromSnapshot();
      saveCache(pendingRef.current ? { ...feedsRef.current, ...pendingRef.current } : feedsRef.current);
      const stale = latest > 0 && Date.now() - latest > 360000;
      if (stale && !staleRetriedRef.current) { staleRetriedRef.current = true; window.setTimeout(() => runRef.current?.("auto"), 8000); }
      else if (!stale) staleRetriedRef.current = false;
    })();
    inflightRef.current = job;
    try { await job; } finally { inflightRef.current = null; interactedRef.current = false; setReady(true); setRefreshing(false); setNow(Date.now()); }
  }, [applyFeeds, fillFromSnapshot]);
  useEffect(() => { runRef.current = runFetch; }, [runFetch]);
  useEffect(() => {
    runFetch("initial");
    const t = window.setTimeout(() => { fillFromSnapshot().then(() => setReady(true)); }, 3500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const auto = window.setInterval(() => { if (refreshMs > 0 && !document.hidden) runFetch("auto"); }, refreshMs || 60000);
    const tick = window.setInterval(() => {
      setNow(Date.now());
      if (pendingRef.current && !document.hidden && window.scrollY < 120) { applyFeeds(pendingRef.current); pendingRef.current = null; setPendingCount(0); }
    }, 30000);
    const onWake = () => { if (refreshMs > 0 && !document.hidden && Date.now() - lastFetchRef.current > refreshMs) runFetch("auto"); };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("online", onWake);
    return () => { window.clearInterval(auto); window.clearInterval(tick); document.removeEventListener("visibilitychange", onWake); window.removeEventListener("online", onWake); };
  }, [runFetch, refreshMs, applyFeeds]);
  const applyPending = useCallback(() => {
    if (pendingRef.current) applyFeeds(pendingRef.current);
    pendingRef.current = null; setPendingCount(0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, [applyFeeds]);
  const refresh = useCallback(() => {
    if (pendingRef.current) { applyFeeds(pendingRef.current); pendingRef.current = null; setPendingCount(0); }
    loadCms(true);
    runFetch("manual");
  }, [applyFeeds, runFetch, loadCms]);
  const derived = useMemo(() => {
    const bySection: Record<string, NewsItem[]> = {};
    const byId = new Map<string, NewsItem>(); const seenTitles = new Set<string>(); const all: NewsItem[] = [];
    let featured: NewsItem | undefined; const headlines: NewsItem[] = [];
    for (const sec of SECTIONS) {
      const items: NewsItem[] = []; const ids = new Set<string>(); const titles = new Set<string>();
      if (hiddenSections.includes(sec.id)) { bySection[sec.id] = items; continue; }
      for (const own of ownArticles) {
        if (own.section !== sec.id || own.hidden || (own.publishAt ?? 0) > liveAt) continue;
        const item = ownToNews(own); items.push(item); ids.add(item.id); byId.set(item.id, item); all.push(item);
        if (own.pinned) featured = item;
        if (own.headline) headlines.push(item);
      }
      for (const cms of cmsArticles) {
        if (cms.section !== sec.id) continue;
        const key = titleKey(cms);
        if (ids.has(cms.id) || titles.has(key)) continue;
        items.push(cms); ids.add(cms.id); titles.add(key); byId.set(cms.id, cms); all.push(cms);
        const numeric = cmsNumericId(cms.id);
        if (numeric !== null) { if (!byId.has(`cms-${numeric}`)) byId.set(`cms-${numeric}`, cms); if (cms.slug && !byId.has(cms.slug)) byId.set(cms.slug, cms); }
        if (cms.placement === "main" && !featured) featured = cms;
        if (cms.headline) headlines.push(cms);
      }
      for (const feed of feedsForSection(sec.id)) {
        if (hiddenSources.includes(feed.sourceId)) continue;
        for (const item of feeds[feed.id]?.items ?? []) {
          const key = titleKey(item);
          if (ids.has(item.id) || titles.has(key)) continue;
          items.push(item); titles.add(key);
          if (!byId.has(item.id) && !seenTitles.has(key)) { byId.set(item.id, item); seenTitles.add(key); all.push(item); }
        }
      }
      bySection[sec.id] = items.sort(byPublished);
    }
    all.sort(byPublished); headlines.sort(byPublished);
    return { bySection, byId, all, featured, headlines };
  }, [feeds, ownArticles, cmsArticles, liveAt, hiddenSections, hiddenSources]);
  const feedsWithCms = useMemo<Record<string, FeedState>>(() => ({
    ...feeds,
    [CMS_FEED_ID]: { items: cmsArticles, origin: "cms", fetchedAt: cmsStatus.at, ...(cmsStatus.state === "unavailable" ? { error: "CMS unreachable" } : {}) },
  }), [feeds, cmsArticles, cmsStatus]);
  const status = useMemo<NewsStatus>(() => {
    let liveCount = 0, liveAtMax = 0, anyAt = 0;
    for (const f of FEEDS) {
      const s = feeds[f.id];
      if (s?.items.length) { if (s.origin === "live" || s.origin === "relay") { liveCount += 1; liveAtMax = Math.max(liveAtMax, s.fetchedAt); } anyAt = Math.max(anyAt, s.fetchedAt); }
    }
    if (cmsStatus.count > 0 && (cmsStatus.state === "live" || cmsStatus.state === "bundle")) { liveCount += 1; liveAtMax = Math.max(liveAtMax, cmsStatus.at); }
    if (cmsStatus.at > 0) anyAt = Math.max(anyAt, cmsStatus.at);
    const total = FEEDS.length + 1;
    if (liveCount > 0 && now - liveAtMax < STALE_MS) return { kind: "live", at: liveAtMax, live: liveCount, total };
    if (!ready || refreshing) return { kind: "loading", at: null, live: liveCount, total };
    if (anyAt > 0) return { kind: "saved", at: anyAt, live: 0, total };
    return { kind: "offline", at: null, live: 0, total };
  }, [feeds, ready, refreshing, now, cmsStatus]);
  const value = useMemo<NewsCtx>(() => ({ ready, refreshing, now, feeds: feedsWithCms, ...derived, status, cmsStatus, adsEnabled, cmsAds, cmsAdsStatus, pendingCount, applyPending, refresh }), [ready, refreshing, now, feedsWithCms, derived, status, cmsStatus, adsEnabled, cmsAds, cmsAdsStatus, pendingCount, applyPending, refresh]);
  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>;
}
export function useNews(): NewsCtx { const c = useContext(NewsContext); if (!c) throw new Error("useNews must be used inside <NewsProvider>"); return c; }

/* ================= Saved ================= */
const K_SAVED = "180news:saved:v1";
const MAX_SAVED = 200;
function loadSaved(): NewsItem[] { try { const raw = localStorage.getItem(K_SAVED); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr.filter(isNewsItem) : []; } catch { return []; } }
type SavedCtx = { saved: NewsItem[]; isSaved: (id: string) => boolean; toggle: (item: NewsItem) => void; remove: (id: string) => void };
const SavedContext = createContext<SavedCtx | null>(null);
export function SavedProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<NewsItem[]>(loadSaved);
  useEffect(() => { try { localStorage.setItem(K_SAVED, JSON.stringify(saved)); } catch { /* ignore */ } }, [saved]);
  useEffect(() => { const on = (e: StorageEvent) => { if (e.key === K_SAVED) setSaved(loadSaved()); }; window.addEventListener("storage", on); return () => window.removeEventListener("storage", on); }, []);
  const ids = useMemo(() => new Set(saved.map((s) => s.id)), [saved]);
  const isSaved = useCallback((id: string) => ids.has(id), [ids]);
  const toggle = useCallback((item: NewsItem) => {
    const stored: NewsItem = item.image?.startsWith("data:") ? { ...item, image: undefined } : item;
    setSaved((prev) => prev.some((m) => m.id === item.id) ? prev.filter((m) => m.id !== item.id) : [stored, ...prev].slice(0, MAX_SAVED));
  }, []);
  const remove = useCallback((id: string) => setSaved((prev) => prev.filter((m) => m.id !== id)), []);
  const value = useMemo<SavedCtx>(() => ({ saved, isSaved, toggle, remove }), [saved, isSaved, toggle, remove]);
  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}
export function useSaved(): SavedCtx { const c = useContext(SavedContext); if (!c) throw new Error("useSaved must be used inside <SavedProvider>"); return c; }

export function usePageTitle(title?: string) {
  useEffect(() => { document.title = title ? `${title} | 180news` : "180news — Live South African news headlines"; }, [title]);
}
