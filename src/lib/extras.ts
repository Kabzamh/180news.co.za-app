import { useEffect, useRef, useState } from "react";
import { CITIES, ORIGIN, type City } from "./data";

/* Weather (Open-Meteo) */
export type Weather = { temp: number; code: number; isDay: boolean; high: number | null; low: number | null };
const K_CITY = "180news:city";
const weatherCache = new Map<string, { at: number; data: Weather }>();
async function fetchWeather(city: City): Promise<Weather> {
  const hit = weatherCache.get(city.id);
  if (hit && Date.now() - hit.at < 15 * 60000) return hit.data;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=Africa%2FJohannesburg&forecast_days=1`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  const temp = d.current?.temperature_2m; const code = d.current?.weather_code;
  if (typeof temp !== "number" || typeof code !== "number") throw new Error("Unexpected weather response");
  const data: Weather = { temp, code, isDay: d.current?.is_day !== 0, high: typeof d.daily?.temperature_2m_max?.[0] === "number" ? d.daily.temperature_2m_max[0] : null, low: typeof d.daily?.temperature_2m_min?.[0] === "number" ? d.daily.temperature_2m_min[0] : null };
  weatherCache.set(city.id, { at: Date.now(), data });
  return data;
}
export function useWeatherCity() {
  const [cityId, setCityId] = useState<string>(() => { try { const v = localStorage.getItem(K_CITY); return CITIES.some((c) => c.id === v) ? v! : CITIES[0].id; } catch { return CITIES[0].id; } });
  const [state, setState] = useState<{ cityId: string; weather: Weather } | null>(null);
  const city = CITIES.find((c) => c.id === cityId) ?? CITIES[0];
  useEffect(() => {
    let dead = false;
    const load = () => { fetchWeather(city).then((w) => { if (!dead) setState({ cityId: city.id, weather: w }); }).catch(() => { /* keep last */ }); };
    load();
    const t = window.setInterval(load, 15 * 60000);
    return () => { dead = true; window.clearInterval(t); };
  }, [city]);
  const chooseCity = (id: string) => { setCityId(id); try { localStorage.setItem(K_CITY, id); } catch { /* ignore */ } };
  return { city, weather: state && state.cityId === city.id ? state.weather : null, chooseCity };
}

/* Rand (ExchangeRate-API) */
export type RandRates = { usd: number; eur: number; gbp: number; updatedAt: number };
let randPromise: Promise<RandRates | null> | null = null;
function fetchRand(): Promise<RandRates | null> {
  randPromise ??= fetch("https://open.er-api.com/v6/latest/USD").then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))).then((j) => {
    const zar = j.rates?.ZAR, eur = j.rates?.EUR, gbp = j.rates?.GBP;
    return j.result !== "success" || !zar || !eur || !gbp ? null : { usd: zar, eur: zar / eur, gbp: zar / gbp, updatedAt: (j.time_last_update_unix ?? 0) * 1000 };
  }).catch(() => { randPromise = null; return null; });
  return randPromise;
}
export function useRand(): RandRates | null {
  const [rates, setRates] = useState<RandRates | null>(null);
  useEffect(() => { let dead = false; fetchRand().then((r) => { if (!dead) setRates(r); }); return () => { dead = true; }; }, []);
  return rates;
}
export const randText = (v: number) => `R${v.toFixed(2)}`;

/* Lotto (/api/lotto via proxy, else saved copy) */
export type LottoGame = { key: string; label: string; drawDate?: string; numbers: number[]; special?: number };
export type LottoData = { fetchedAt?: number; games: LottoGame[] };
let lottoPromise: Promise<LottoData | null> | null = null;
function fetchLotto(): Promise<LottoData | null> {
  lottoPromise ??= (async () => {
    for (const url of ["/api/lotto", "/lotto.json"]) {
      try {
        const r = await fetch(url, { headers: { Accept: "application/json" } });
        if (!r.ok) continue;
        const j = await r.json();
        if (j && Array.isArray(j.games) && j.games.length) return j as LottoData;
      } catch { /* next */ }
    }
    lottoPromise = null; return null;
  })();
  return lottoPromise;
}
export function useLotto(): LottoData | null {
  const [data, setData] = useState<LottoData | null>(null);
  useEffect(() => { let dead = false; fetchLotto().then((d) => { if (!dead) setData(d); }); return () => { dead = true; }; }, []);
  return data;
}

/* ================= IEC results ================= */
export type IecPartyTotal = { id: number; name: string; votes: number; prVotes: number; wardSeats: number; seats: number; councilsLed?: number; majorities?: number };
export type IecCouncilLight = { id: number; code: string; name: string; province: string; seats: number; seatsAllocated: number; districtsPct: number; status: string; leader?: { name: string; share: number; seats: number } };
export type IecNational = { reportedAt?: number; totals: { councils: number; councilsComplete?: number; majority: number; hung: number; seats: number; seatsAllocated: number; districts?: number; districtsCounted?: number; registered: number; validVotes: number; spoiltVotes?: number }; parties: IecPartyTotal[]; councils: IecCouncilLight[] };
export type IecCouncilDetail = { id: number; code: string; name: string; province: string; reportedAt?: number; seats: number; wards?: number; seatsAllocated: number; districtsPct: number; parties: { id: number; name: string; votes: number; prVotes: number; wardSeats: number; seats: number }[] };
export type IecState = { state: "loading" } | { state: "error" } | { state: "ready"; data: IecNational; origin: "live" | "saved"; at: number; missed?: boolean };
const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? v as Record<string, unknown> : {});
const tsOrNow = (v: unknown) => typeof v === "number" && v > 0 ? v : Date.now();
const isPartyNum = (v: unknown) => { const o = asObj(v); return typeof o.id === "number" && typeof o.name === "string" && ["votes", "prVotes", "wardSeats", "seats"].every((k) => typeof o[k] === "number"); };
const isCouncilDetail = (v: unknown) => { const o = asObj(v); return typeof o.id === "number" && typeof o.name === "string" && typeof o.seats === "number" && Array.isArray(o.parties) && o.parties.length > 0 && o.parties.every(isPartyNum); };
function isNational(v: unknown): v is IecNational { const o = asObj(v); const t = asObj(o.totals); return Array.isArray(o.parties) && o.parties.length > 0 && o.parties.every(isPartyNum) && Array.isArray(o.councils) && typeof t.seats === "number" && typeof t.validVotes === "number"; }
export type PartyResult = { id: number; name: string; votes: number; share: number; wardSeats: number; seats: number; councilsLed: number; majorities: number; provinces: { name: string; votes: number; share: number; seats: number; councilsLed: number; majorities: number }[]; councils: { id: number; code: string; name: string; province: string; votes: number; share: number; wardSeats: number; seats: number; councilSeats: number; leads: boolean }[] };
function isPartyResult(v: unknown): v is PartyResult { const o = asObj(v); const nums = (keys: string[]) => keys.every((k) => typeof o[k] === "number"); return typeof o.id === "number" && typeof o.name === "string" && nums(["votes", "share", "wardSeats", "seats", "councilsLed", "majorities"]) && Array.isArray(o.provinces) && Array.isArray(o.councils) && o.councils.length > 0; }
async function fetchJsonTO(url: string, ms: number): Promise<unknown> {
  const c = new AbortController(); const t = window.setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    if (!(r.headers.get("content-type") ?? "").includes("json")) throw new Error("Unexpected response");
    return await r.json();
  } finally { window.clearTimeout(t); }
}
async function fetchNational(): Promise<IecState> {
  try {
    const j = asObj(await fetchJsonTO("/api/iec", 15000)); const data = asObj(j.data);
    if (isNational(data)) return { state: "ready", data: data as unknown as IecNational, origin: "live", at: tsOrNow(j.fetchedAt) };
  } catch { /* fall through */ }
  for (const url of [`${ORIGIN}/iec-national.json`, "/iec-national.json"]) {
    try {
      const j = asObj(await fetchJsonTO(url, 15000)); const data = asObj(j.data);
      if (isNational(data)) return { state: "ready", data: data as unknown as IecNational, origin: "saved", at: tsOrNow(j.savedAt) };
    } catch { /* next */ }
  }
  return { state: "error" };
}
let detailsPromise: Promise<Record<string, unknown>> | null = null;
export function fetchCouncilDetails(): Promise<Record<string, unknown>> {
  detailsPromise ??= (async () => {
    for (const url of [`${ORIGIN}/iec-councils.json`, "/iec-councils.json"]) {
      try { const j = await fetchJsonTO(url, 30000); const councils = asObj(asObj(j).councils); if (Object.keys(councils).length) return councils; } catch { /* next */ }
    }
    detailsPromise = null; return {};
  })();
  return detailsPromise;
}
export function useCouncilDetails(): IecCouncilDetail[] | null {
  const [list, setList] = useState<IecCouncilDetail[] | null>(null);
  useEffect(() => { let dead = false; fetchCouncilDetails().then((map) => { if (!dead) setList(Object.values(map).filter(isCouncilDetail) as unknown as IecCouncilDetail[]); }); return () => { dead = true; }; }, []);
  return list;
}
function mergeStates(prev: IecState, next: IecState): IecState {
  if (next.state === "ready" && next.origin === "live") return next;
  if (prev.state === "ready" && prev.origin === "live") return { ...prev, missed: true };
  if (next.state === "ready") return next;
  return prev;
}
let iecCurrent: IecState = { state: "loading" }; let iecFetchedAt = 0;
const iecListeners = new Set<() => void>(); let iecInflight: Promise<void> | null = null;
function notifyIec() { iecListeners.forEach((f) => f()); }
function refreshIecOnce(): Promise<void> {
  iecInflight ??= fetchNational().then((next) => { iecCurrent = mergeStates(iecCurrent, next); iecFetchedAt = Date.now(); notifyIec(); }).finally(() => { iecInflight = null; });
  return iecInflight;
}
export function useIec(refreshMinutes = 0): { results: IecState; refreshing: boolean; refresh: () => void } {
  const [results, setResults] = useState<IecState>(iecCurrent);
  const [refreshing, setRefreshing] = useState(false);
  const minsRef = useRef(refreshMinutes); minsRef.current = refreshMinutes;
  useEffect(() => { const f = () => setResults(iecCurrent); iecListeners.add(f); return () => { iecListeners.delete(f); }; }, []);
  useEffect(() => { if (Date.now() - iecFetchedAt > 60000) refreshIecOnce(); }, []);
  useEffect(() => {
    if (refreshMinutes <= 0) return;
    const every = refreshMinutes * 60000;
    const check = () => { if (!document.hidden && Date.now() - iecFetchedAt >= every - 5000) refreshIecOnce(); };
    const t = window.setInterval(check, every);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", check); window.removeEventListener("online", check); };
  }, [refreshMinutes]);
  const refresh = () => { setRefreshing(true); refreshIecOnce().finally(() => setRefreshing(false)); };
  return { results, refreshing, refresh };
}
export type PartyFetchState = { state: "loading" } | { state: "error" } | { state: "ready"; data: PartyResult; origin: "live" | "saved"; at: number };
function computePartyFromDetails(details: Record<string, unknown>, partyId: number, pendingIds: Set<number>): PartyResult | null {
  const councils: PartyResult["councils"] = [];
  const provMap = new Map<string, { valid: number; votes: number; seats: number; led: number; majorities: number; stood: boolean }>();
  let name = ""; let totalValid = 0;
  for (const raw of Object.values(details)) {
    if (!isCouncilDetail(raw)) continue;
    const c = raw as unknown as IecCouncilDetail;
    const valid = c.parties.reduce((s, p) => s + p.votes, 0);
    totalValid += valid;
    const prov = provMap.get(c.province) ?? { valid: 0, votes: 0, seats: 0, led: 0, majorities: 0, stood: false };
    prov.valid += valid; provMap.set(c.province, prov);
    const mine = c.parties.find((p) => p.id === partyId);
    if (!mine) continue;
    if (!name) name = mine.name;
    const others = c.parties.filter((p) => p.id !== 0 && p.id !== partyId).map((p) => p.seats);
    const leads = mine.seats > 0 && mine.seats > Math.max(0, ...others) && !pendingIds.has(c.id);
    const majority = mine.seats * 2 > c.seats;
    prov.stood = true; prov.votes += mine.votes; prov.seats += mine.seats;
    if (leads) prov.led += 1;
    if (majority) prov.majorities += 1;
    councils.push({ id: c.id, code: c.code, name: c.name, province: c.province, votes: mine.votes, share: valid > 0 ? mine.votes / valid * 100 : 0, wardSeats: mine.wardSeats, seats: mine.seats, councilSeats: c.seats, leads });
  }
  if (!councils.length) return null;
  const votes = councils.reduce((s, c) => s + c.votes, 0);
  const stood = [...provMap.entries()].filter(([, v]) => v.stood);
  return {
    id: partyId, name, votes, share: totalValid > 0 ? votes / totalValid * 100 : 0,
    wardSeats: councils.reduce((s, c) => s + c.wardSeats, 0), seats: councils.reduce((s, c) => s + c.seats, 0),
    councilsLed: stood.reduce((s, [, v]) => s + v.led, 0), majorities: stood.reduce((s, [, v]) => s + v.majorities, 0),
    provinces: stood.map(([n, v]) => ({ name: n, votes: v.votes, share: v.valid > 0 ? v.votes / v.valid * 100 : 0, seats: v.seats, councilsLed: v.led, majorities: v.majorities })),
    councils,
  };
}
export async function fetchPartyResult(partyId: number): Promise<PartyFetchState> {
  try {
    const j = asObj(await fetchJsonTO(`/api/iec?party=${partyId}`, 20000)); const data = asObj(j.data);
    if (isPartyResult(data)) return { state: "ready", data: data as unknown as PartyResult, origin: "live", at: tsOrNow(j.fetchedAt) };
  } catch { /* fallback */ }
  try {
    const [details, nationalRaw] = await Promise.all([fetchCouncilDetails(), fetchJsonTO("/iec-national.json", 15000).then(asObj).catch(() => asObj(null))]);
    const natData = asObj(nationalRaw.data);
    const pending = new Set<number>(isNational(natData) ? (natData as unknown as IecNational).councils.filter((c) => c.status === "pending").map((c) => c.id) : []);
    const computed = computePartyFromDetails(details, partyId, pending);
    if (computed) return { state: "ready", data: computed, origin: "saved", at: tsOrNow(asObj(details).savedAt) };
  } catch { detailsPromise = null; }
  return { state: "error" };
}
let partiesPromise: Promise<{ id: number; name: string; abbrev?: string }[]> | null = null;
export function fetchPartyList(): Promise<{ id: number; name: string; abbrev?: string }[]> {
  partiesPromise ??= (async () => {
    for (const url of [`${ORIGIN}/iec-parties.json`, "/iec-parties.json"]) {
      try {
        const j = await fetchJsonTO(url, 15000);
        const list = asObj(j).parties;
        if (Array.isArray(list)) return list.filter((u) => typeof asObj(u).id === "number" && typeof asObj(u).name === "string").map((u) => ({ id: asObj(u).id as number, name: asObj(u).name as string, abbrev: typeof asObj(u).abbrev === "string" ? asObj(u).abbrev as string : undefined }));
      } catch { /* next */ }
    }
    partiesPromise = null; return [];
  })();
  return partiesPromise;
}
export const majorityNeeded = (seats: number) => Math.floor(seats / 2) + 1;
export type CoalitionParty = { id: number; name: string; seats: number };
export function findCoalitions(parties: CoalitionParty[], needed: number, maxMembers = 4, cap = 20000): { coalitions: { members: CoalitionParty[]; seats: number }[]; truncated: boolean } {
  const sorted = parties.filter((p) => p.seats > 0).sort((a, b) => b.seats - a.seats || a.name.localeCompare(b.name));
  const prefix = [0]; for (const p of sorted) prefix.push(prefix[prefix.length - 1] + p.seats);
  const bestFrom = (start: number, count: number) => prefix[Math.min(sorted.length, start + count)] - prefix[Math.min(sorted.length, start)];
  const out: { members: CoalitionParty[]; seats: number }[] = []; let truncated = false;
  const walk = (start: number, members: CoalitionParty[], total: number) => {
    for (let i = start; i < sorted.length; i++) {
      if (out.length >= cap) { truncated = true; return; }
      const party = sorted[i]; const nextTotal = total + party.seats;
      if (nextTotal >= needed) { out.push({ members: [...members, party], seats: nextTotal }); continue; }
      const remaining = maxMembers - members.length - 1;
      if (remaining <= 0 || nextTotal + bestFrom(i + 1, remaining) < needed) break;
      walk(i + 1, [...members, party], nextTotal);
    }
  };
  if (needed > 0 && maxMembers > 0) walk(0, [], 0);
  out.sort((a, b) => a.members.length - b.members.length || b.seats - a.seats || a.members.map((m) => m.name).join().localeCompare(b.members.map((m) => m.name).join()));
  return { coalitions: out, truncated };
}
