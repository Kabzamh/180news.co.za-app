// src/lib/iec.ts
var IEC_EVENT = { year: 2026, id: 1887, name: "2026 Local Government Elections" };
var IEC_DASHBOARD = "https://results.elections.org.za/dashboards/lge/";
var FILES = `${IEC_DASHBOARD}MapsJason/${IEC_EVENT.year}/EEID${IEC_EVENT.id}`;
var nationalFileUrl = () => `${FILES}LiteMapsNational.js`;
var councilFileUrl = (id) => `${FILES}Munic${id}.js`;
var partyFileUrl = (id) => `${FILES}Party${id}.js`;
var PROVINCE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
var provinceFileUrl = (id) => `${FILES}Province${id}.js`;
var isCouncilId = (value) => typeof value === "number" && Number.isInteger(value) && value >= 1e3 && value <= 9999;
var isPartyId = (value) => typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 99999;
var obj = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
var list = (value) => Array.isArray(value) ? value : [];
var num = (value) => typeof value === "number" && Number.isFinite(value) ? value : 0;
var str = (value) => typeof value === "string" ? value.trim() : "";
function reportTime(value) {
  const ms = Date.parse(str(value).replace(/(\.\d{3})\d+/, "$1"));
  return Number.isNaN(ms) ? null : ms;
}
var SMALL_WORDS = /* @__PURE__ */ new Set(["of", "the", "for", "and", "in", "to", "a", "on"]);
var titleCase = (text) => text.toLowerCase().split(/\s+/).filter(Boolean).map((word, i) => i > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
var PARTY_NAMES = {
  ACTIONSA: "ActionSA",
  "UMKHONTO WESIZWE PARTY": "uMkhonto weSizwe Party",
  "AL JAMA-AH": "Al Jama-ah"
};
function partyName(id, raw) {
  if (id === 0) return "Independent candidates";
  if (id === -2) return "Other parties";
  const name = raw.includes("|") ? raw.slice(raw.lastIndexOf("|") + 1).trim() : raw.trim();
  return PARTY_NAMES[name.toUpperCase()] ?? titleCase(name);
}
function councilName(raw) {
  const at = raw.indexOf(" - ");
  const code = at > 0 ? raw.slice(0, at).trim() : "";
  const name = (at > 0 ? raw.slice(at + 3) : raw).trim();
  return { code, name: name && name === name.toUpperCase() ? titleCase(name) : name };
}
function party(value, national) {
  const r = obj(value);
  const id = num(r.ID);
  return {
    id,
    name: partyName(id, str(r.Name)),
    votes: num(r.TotalValidVotes),
    prVotes: num(r.PRVotes),
    wardSeats: num(r.WardSeatsWon),
    seats: num(r.TotalSeatsWon),
    ...national ? { councilsLed: num(r.CouncilsWon), majorities: num(r.MajorityWon) } : {}
  };
}
function byVotes(a, b) {
  const rank = (p) => p.id === 0 ? 2 : p.id === -2 ? 1 : 0;
  return rank(a) - rank(b) || b.votes - a.votes;
}
function parseNational(raw) {
  const root = obj(raw);
  const partyRows = list(root.PartyBallotResults);
  const provinces = list(root.ProvinceResults);
  if (partyRows.length === 0 || provinces.length === 0) throw new Error("Unexpected IEC results file");
  const councils = [];
  for (const entry of provinces) {
    const province = obj(entry);
    for (const item of list(province.MunicipalityResults)) {
      const m = obj(item);
      const id = num(m.MunicipalityID);
      if (!isCouncilId(id)) continue;
      const top = obj(list(m.PartyBallotResults)[0]);
      const topId = num(top.ID);
      councils.push({
        id,
        ...councilName(str(m.Municipality)),
        province: str(m.Province) || str(province.Province),
        seats: num(m.SeatsExpected),
        seatsAllocated: num(m.SeatsComplete),
        districtsPct: num(m.Perc_VDsComplete),
        status: num(m.MajorityCouncils) > 0 ? "majority" : num(m.HungCouncils) > 0 ? "hung" : "pending",
        leader: str(top.Name) ? { name: partyName(topId, str(top.Name)), share: num(top.PercOfVotes), seats: num(top.TotalSeatsWon) } : null
      });
    }
  }
  if (councils.length === 0) throw new Error("Unexpected IEC results file");
  councils.sort((a, b) => a.name.localeCompare(b.name));
  const first = obj(partyRows[0]);
  return {
    reportedAt: reportTime(root.ReportDate),
    totals: {
      councils: num(root.MunicExpected),
      councilsComplete: num(root.MuncipalitiesComplete),
      majority: num(root.MajorityCouncils),
      hung: num(root.HungCouncils),
      seats: num(root.SeatsExpected),
      seatsAllocated: num(root.SeatsComplete),
      districts: num(root.VDExpected),
      districtsCounted: num(root.VDsComplete),
      registered: num(root.RegPop),
      validVotes: num(first.ValidVotesCast),
      spoiltVotes: num(first.SpoiltVotes)
    },
    parties: partyRows.map((p) => party(p, true)).sort(byVotes),
    councils
  };
}
function parseCouncil(text, id) {
  const at = text.lastIndexOf('"PartyBallotResults":');
  if (at < 0) throw new Error("Unexpected IEC council file");
  const tail = obj(JSON.parse(`{${text.slice(at)}`));
  const parties = list(tail.PartyBallotResults).map((p) => party(p, false));
  if (parties.length === 0) throw new Error("Unexpected IEC council file");
  const head = text.slice(0, 800);
  const field = (name) => new RegExp(`"${name}":"([^"]*)"`).exec(head)?.[1] ?? "";
  return {
    id,
    ...councilName(field("Municipality")),
    province: field("Province"),
    reportedAt: reportTime(field("ReportDate")),
    seats: num(tail.SeatsExpected),
    wards: num(tail.WardExpected),
    seatsAllocated: num(tail.SeatsComplete),
    districtsPct: num(tail.Perc_VDsComplete),
    parties: parties.sort(byVotes)
  };
}
function parseLargest(files) {
  const out = {};
  for (const file of files) {
    for (const item of list(obj(file).MunicipalityResults)) {
      const m = obj(item);
      const id = num(m.MunicipalityID);
      if (!isCouncilId(id)) continue;
      out[id] = list(m.PartyBallotResults).map(obj).filter((p) => num(p.ID) > 0).map((p) => ({ id: num(p.ID), name: partyName(num(p.ID), str(p.Name)), seats: num(p.TotalSeatsWon) })).sort((a, b) => b.seats - a.seats);
    }
  }
  if (Object.keys(out).length === 0) throw new Error("Unexpected IEC province files");
  return out;
}
function parseParty(raw, id) {
  const root = obj(raw);
  const own = (rows) => list(rows).map(obj).find((p) => num(p.ID) === id);
  const national = own(root.PartyBallotResults);
  if (!national) throw new Error("Unexpected IEC party file");
  const provinces = [];
  const councils = [];
  for (const entry of list(root.ProvinceResults)) {
    const province = obj(entry);
    const line = own(province.PartyBallotResults);
    if (line) {
      provinces.push({
        name: str(province.Province),
        votes: num(line.TotalValidVotes),
        share: num(line.PercOfVotes),
        seats: num(line.TotalSeatsWon),
        councilsLed: num(line.CouncilsWon),
        majorities: num(line.MajorityWon)
      });
    }
    for (const item of list(province.MunicipalityResults)) {
      const m = obj(item);
      const row = own(m.PartyBallotResults);
      const councilId = num(m.MunicipalityID);
      if (!row || !isCouncilId(councilId)) continue;
      councils.push({
        id: councilId,
        ...councilName(str(m.Municipality)),
        province: str(m.Province) || str(province.Province),
        votes: num(row.TotalValidVotes),
        share: num(row.PercOfVotes),
        wardSeats: num(row.WardSeatsWon),
        seats: num(row.TotalSeatsWon),
        councilSeats: num(row.AvailableSeats),
        leads: row.IsCouncilWinner === true
      });
    }
  }
  const valid = num(national.ValidVotesCast);
  const votes = num(national.TotalValidVotes);
  return {
    id,
    name: partyName(id, str(national.Name)),
    reportedAt: reportTime(root.ReportDate),
    votes,
    share: valid > 0 ? votes / valid * 100 : num(national.PercOfVotes),
    wardSeats: num(national.WardSeatsWon),
    seats: num(national.TotalSeatsWon),
    councilsLed: num(national.CouncilsWon),
    majorities: num(national.MajorityWon),
    provinces,
    councils
  };
}

// src/server/iec.ts
var UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 180news/1.0 (+https://180news.co.za)";
var KEEP_ON_ERROR_MS = 6 * 60 * 60 * 1e3;
function targetFor(params) {
  const council = params.get("council");
  if (council !== null) {
    const id = /^\d{4}$/.test(council) ? Number(council) : NaN;
    if (!isCouncilId(id)) return { error: "council must be a four-digit IEC municipality id" };
    return { key: `council-${id}`, ttl: 600, timeoutMs: 25e3, urls: [councilFileUrl(id)], parse: ([text]) => parseCouncil(text, id) };
  }
  const party2 = params.get("party");
  if (party2 !== null) {
    const id = /^\d{1,5}$/.test(party2) ? Number(party2) : NaN;
    if (!isPartyId(id)) return { error: "party must be an IEC party id" };
    return { key: `party-${id}`, ttl: 300, timeoutMs: 15e3, urls: [partyFileUrl(id)], parse: ([text]) => parseParty(JSON.parse(text), id) };
  }
  if (params.get("largest") !== null) {
    return { key: "largest", ttl: 300, timeoutMs: 12e3, urls: PROVINCE_IDS.map(provinceFileUrl), parse: (texts) => parseLargest(texts.map((text) => JSON.parse(text))) };
  }
  return { key: "national", ttl: 120, timeoutMs: 12e3, urls: [nationalFileUrl()], parse: ([text]) => parseNational(JSON.parse(text)) };
}
var HttpError = class extends Error {
  status;
  constructor(status) {
    super(`HTTP ${status}`);
    this.status = status;
  }
};
var memory = /* @__PURE__ */ new Map();
var inFlight = /* @__PURE__ */ new Map();
async function download(url, timeoutMs) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "*/*" }, redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new HttpError(res.status);
  return (await res.text()).replace(/^\uFEFF/, "");
}
function load(target) {
  const running = inFlight.get(target.key);
  if (running) return running;
  const job = Promise.all(target.urls.map((url) => download(url, target.timeoutMs))).then((texts) => {
    const data = target.parse(texts);
    memory.set(target.key, { at: Date.now(), data });
    return data;
  }).finally(() => inFlight.delete(target.key));
  inFlight.set(target.key, job);
  return job;
}
async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  let params = new URLSearchParams();
  try {
    params = new URL(req.url ?? "/", "http://localhost").searchParams;
  } catch {
  }
  const target = targetFor(params);
  if ("error" in target) {
    res.statusCode = 400;
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ error: target.error }));
    return;
  }
  const { key, ttl } = target;
  const kept = memory.get(key);
  if (kept && Date.now() - kept.at < ttl * 1e3) {
    res.statusCode = 200;
    res.setHeader("Cache-Control", `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 5}`);
    res.end(JSON.stringify({ fetchedAt: kept.at, data: kept.data }));
    return;
  }
  try {
    const data = await load(target);
    res.statusCode = 200;
    res.setHeader("Cache-Control", `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 5}`);
    res.end(JSON.stringify({ fetchedAt: Date.now(), data }));
  } catch (err) {
    if (kept && Date.now() - kept.at < KEEP_ON_ERROR_MS) {
      res.statusCode = 200;
      res.setHeader("Cache-Control", "public, s-maxage=30");
      res.end(JSON.stringify({ fetchedAt: kept.at, data: kept.data }));
      return;
    }
    if (err instanceof HttpError && err.status === 404) {
      res.statusCode = 404;
      res.setHeader("Cache-Control", "public, s-maxage=300");
      res.end(JSON.stringify({ error: "The IEC has no results for that id" }));
      return;
    }
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    res.statusCode = 502;
    res.setHeader("Cache-Control", "public, s-maxage=15");
    res.end(JSON.stringify({ error: timedOut ? "The IEC results system timed out" : "The IEC results system could not be read" }));
  }
}
export {
  handler as default
};
