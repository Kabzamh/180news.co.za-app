import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useControl, usePageTitle } from "./lib/providers";
import { fetchPartyList, fetchPartyResult, findCoalitions, majorityNeeded, useCouncilDetails, useIec, type PartyFetchState } from "./lib/extras";
import { fmtNum } from "./lib/data";
import { IecSummary, PageHead, SectionHead } from "./components";

const COUNCIL_PAGE = 20;
function TotalsGrid({ totals }: { totals: { councils: number; majority: number; hung: number; seatsAllocated: number; seats: number; validVotes: number; registered: number } }) {
  const rows: [string, string][] = [["Councils on the ballot", fmtNum(totals.councils)], ["Won outright", fmtNum(totals.majority)], ["Hung councils", fmtNum(totals.hung)], ["Seats allocated", `${fmtNum(totals.seatsAllocated)} of ${fmtNum(totals.seats)}`], ["Valid votes", fmtNum(totals.validVotes)], ["Registered voters", fmtNum(totals.registered)]];
  return <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map(([k, v]) => <div key={k} className="border border-line bg-paper p-4"><dt className="text-[12.5px] font-black uppercase tracking-[0.05em] text-muted">{k}</dt><dd className="mt-1 text-2xl font-black tabular-nums text-ink">{v}</dd></div>)}</dl>;
}
export function ResultsPage() {
  usePageTitle("IEC results");
  const { settings } = useControl();
  const { results, refreshing, refresh } = useIec(settings.refreshMinutes);
  const details = useCouncilDetails();
  const [params] = useSearchParams();
  const filterHung = params.get("result") === "hung";
  const [count, setCount] = useState(COUNCIL_PAGE);
  const [openId, setOpenId] = useState<number | null>(null);
  const data = results.state === "ready" ? results.data : undefined;
  // NOTE (clone fix): the live /api/iec payload lists councils without a per-party
  // breakdown, so the original page (which expects council.parties) renders blank.
  // This clone feeds the same table from /iec-councils.json (the original's own
  // detailed file, also used for its saved fallback) so the page works as designed.
  const rows = useMemo(() => {
    if (details && details.length) {
      return details.map((c) => {
        const leader = c.parties.filter((p) => p.id > 0).sort((a, b) => b.seats - a.seats)[0];
        const majority = !!leader && leader.seats >= majorityNeeded(c.seats);
        const valid = c.parties.reduce((s, p) => s + p.votes, 0);
        return { id: c.id, name: c.name, province: c.province, leaderName: leader?.name, leaderSeats: leader?.seats, totalSeats: c.seats, majority, valid, parties: c.parties };
      }).sort((a, b) => (b.leaderSeats ?? 0) - (a.leaderSeats ?? 0) || a.name.localeCompare(b.name));
    }
    if (data) return data.councils.map((c) => ({ id: c.id, name: c.name, province: c.province, leaderName: c.leader?.name, leaderSeats: c.leader?.seats, totalSeats: c.seats, majority: c.status === "majority", valid: 0, parties: [] as { id: number; name: string; votes: number; seats: number }[] })).sort((a, b) => (b.leaderSeats ?? 0) - (a.leaderSeats ?? 0) || a.name.localeCompare(b.name));
    return [];
  }, [details, data]);
  const shown = filterHung ? rows.filter((r) => !r.majority) : rows;
  const openRow = openId !== null ? rows.find((r) => r.id === openId) : undefined;
  // Hung-council coalitions anchor (linked from the IEC summary as "/results#results-coalitions")
  const hungExamples = useMemo(() => {
    if (!details) return [];
    return details.filter((c) => { const top = Math.max(0, ...c.parties.filter((p) => p.id > 0).map((p) => p.seats)); return top < majorityNeeded(c.seats); }).slice(0, 3).map((c) => {
      const needed = majorityNeeded(c.seats);
      const parties = c.parties.filter((p) => p.id > 0 && p.seats > 0).map((p) => ({ id: p.id, name: p.name, seats: p.seats }));
      const { coalitions } = findCoalitions(parties, needed, 4, 8000);
      return { council: c, needed, coalitions: coalitions.slice(0, 4), total: coalitions.length };
    });
  }, [details]);
  return (
    <div className="wrap max-w-[1080px] pt-7 md:pt-10">
      <PageHead title="IEC results"><p className="mt-2 max-w-[70ch] text-[15px] text-muted">The 2026 local government elections, council by council — votes, seats and who leads. Figures come from the Electoral Commission’s results system.</p></PageHead>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex h-11 cursor-pointer items-center gap-2 border-2 border-navy px-4 text-sm font-extrabold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-progress disabled:opacity-60"><RefreshCw size={15} strokeWidth={2.5} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />{refreshing ? "Checking the IEC…" : "Check the IEC now"}</button>
        <p role="status" className="text-[14px] font-bold text-body">
          {results.state === "loading" && "Fetching results from the IEC…"}
          {results.state === "error" && "The results could not be loaded just now. The saved copies below are the last figures we hold."}
          {results.state === "ready" && results.origin === "live" && "Live from the IEC."}
          {results.state === "ready" && results.origin === "saved" && "Saved copy — the IEC could not be reached just now."}
        </p>
      </div>
      {data && <IecSummary className="mt-6" />}
      {data && <TotalsGrid totals={data.totals} />}
      <section aria-labelledby="results-councils" className="mt-10">
        <SectionHead id="results-councils" title="Councils" />
        {filterHung && <p className="-mt-2 mb-4 text-[14.5px] font-bold text-body">Showing hung councils only. <a href="/results#results-councils" className="text-navy underline underline-offset-[3px]">Show all councils</a></p>}
        {rows.length > 0 ? (
          <>
            <div className="overflow-x-auto border border-line">
              <table className="w-full min-w-[720px] border-collapse text-left text-[15px]">
                <thead><tr className="bg-wash text-[12.5px] uppercase tracking-[0.05em] text-muted"><th scope="col" className="px-4 py-3 font-extrabold">Council</th><th scope="col" className="px-4 py-3 font-extrabold">Province</th><th scope="col" className="px-4 py-3 font-extrabold">Leader</th><th scope="col" className="px-4 py-3 text-right font-extrabold">Seats</th><th scope="col" className="px-4 py-3 font-extrabold">Result</th></tr></thead>
                <tbody>
                  {shown.slice(0, count).map((r) => (
                    <tr key={r.id} className="border-t border-line align-top">
                      <th scope="row" className="px-4 py-3 font-bold"><button type="button" onClick={() => setOpenId(openId === r.id ? null : r.id)} className="cursor-pointer text-left text-navy underline-offset-2 hover:underline">{r.name}</button></th>
                      <td className="px-4 py-3 text-body">{r.province}</td>
                      <td className="px-4 py-3 text-body">{r.leaderName ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-body">{r.leaderName ? `${r.leaderSeats}/${r.totalSeats}` : "—"}</td>
                      <td className="px-4 py-3"><span className={`inline-block rounded-full px-2.5 py-1 text-[12.5px] font-bold ${r.majority ? "bg-[#dff5e8] text-[#0b5a2e]" : "bg-[#fdf1d4] text-[#6b4a00]"}`}>{r.majority ? "Won outright" : "Hung council"}</span></td>
                    </tr>
                  ))}
                  {openRow && (
                    <tr className="border-t border-line bg-wash"><td colSpan={5} className="px-4 py-4">
                      <p className="text-[12.5px] font-black uppercase tracking-[0.05em] text-muted">Seat breakdown — {openRow.name}</p>
                      {openRow.parties.length > 0 ? <ul className="mt-2 grid gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">{openRow.parties.filter((p) => p.id > 0).sort((a, b) => b.seats - a.seats).map((p) => <li key={p.id} className="flex items-baseline justify-between gap-3 text-[14.5px]"><span className="font-bold text-ink">{p.name}</span><span className="tabular-nums text-body">{fmtNum(p.seats)} seats · {openRow.valid > 0 ? (p.votes / openRow.valid * 100).toFixed(1) : "0.0"}%</span></li>)}</ul> : <p className="mt-2 text-[14.5px] text-body">The seat-by-seat breakdown is in the saved council file — open the seat calculator for this council’s parties.</p>}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {count < shown.length && <div className="mt-8 text-center"><button type="button" onClick={() => setCount((c) => c + COUNCIL_PAGE)} className="inline-flex h-12 cursor-pointer items-center border-2 border-navy px-7 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white">Show more councils ({shown.length - count} left)</button></div>}
          </>
        ) : <p className="py-10 text-[16px] text-body">Waiting for results…</p>}
      </section>
      <section aria-labelledby="results-coalitions" className="mt-12">
        <SectionHead id="results-coalitions" title="Possible coalitions" />
        <p className="-mt-2 mb-4 max-w-[70ch] text-[14.5px] text-muted">For hung councils, the combinations of up to four parties that reach a majority — arithmetic, not agreements. Try any council in the <a href="/results/seats" className="font-bold text-navy underline underline-offset-[3px]">seat calculator</a>.</p>
        {hungExamples.length > 0 ? <div className="space-y-6">{hungExamples.map(({ council, needed, coalitions, total }) => (
          <div key={council.id} className="border border-line bg-paper p-4 sm:p-5">
            <h3 className="text-[17px] font-extrabold tracking-tight">{council.name} <span className="text-[13.5px] font-bold text-muted">({council.province}) — {fmtNum(needed)} of {fmtNum(council.seats)} seats needed{total > coalitions.length ? ` · ${fmtNum(total)} possible combinations` : ""}</span></h3>
            {coalitions.length ? <ul className="mt-3 space-y-2">{coalitions.map((c, i) => <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-2 text-[15px]"><span className="font-bold text-ink">{c.members.map((m) => m.name).join(" + ")}</span><span className="tabular-nums text-body">{fmtNum(c.seats)} seats</span></li>)}</ul> : <p className="mt-2 text-[14.5px] text-body">No combination of up to four parties reaches a majority on the saved tally.</p>}
          </div>
        ))}</div> : <p className="text-[15px] text-muted">{details ? "No hung councils in the saved tally." : "Loading council breakdowns…"}</p>}
      </section>
    </div>
  );
}
export function PartyResultsPage() {
  usePageTitle("Results by party");
  const { settings } = useControl();
  const [parties, setParties] = useState<{ id: number; name: string }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [state, setState] = useState<{ id: number; result: PartyFetchState } | null>(null);
  const [onlyLed, setOnlyLed] = useState(false);
  useEffect(() => { let dead = false; fetchPartyList().then((list) => { if (!dead) { setParties(list); setSelected((cur) => cur ?? list[0]?.id ?? null); } }); return () => { dead = true; }; }, []);
  useEffect(() => {
    if (selected === null) return;
    let dead = false;
    setState({ id: selected, result: { state: "loading" } });
    fetchPartyResult(selected).then((r) => { if (!dead) setState({ id: selected, result: r }); });
    return () => { dead = true; };
  }, [selected, settings.refreshMinutes]);
  const data = state && state.result.state === "ready" ? state.result.data : undefined;
  const councils = useMemo(() => data ? (onlyLed ? data.councils.filter((c) => c.leads) : data.councils) : [], [data, onlyLed]);
  return (
    <div className="wrap max-w-[980px] pt-7 md:pt-10">
      <PageHead title="Results by party"><p className="mt-2 max-w-[70ch] text-[15px] text-muted">How one party did across the country: votes, seats, councils led and outright majorities won.</p></PageHead>
      <div className="mt-6">
        <label htmlFor="party-select" className="block text-[15px] font-extrabold">Choose a party</label>
        <select id="party-select" value={selected ?? ""} onChange={(e) => setSelected(Number(e.target.value))} className="mt-1 h-12 w-full max-w-md border border-ink/35 bg-paper px-3.5 text-base text-ink">{parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </div>
      {state?.result.state === "loading" && <p className="mt-6 text-[15px] text-muted">Adding up the councils…</p>}
      {state?.result.state === "error" && <p className="mt-6 text-[15px] text-muted">The results could not be loaded just now. Try another party or check again shortly.</p>}
      {data && (
        <>
          <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{([["Total votes", fmtNum(data.votes)], ["National share", `${data.share.toFixed(2)}%`], ["Council seats", fmtNum(data.seats)], ["Ward seats", fmtNum(data.wardSeats)], ["Councils led", fmtNum(data.councilsLed)], ["Outright majorities", fmtNum(data.majorities)]] as [string, string][]).map(([k, v]) => <div key={k} className="border border-line bg-paper p-4"><dt className="text-[12.5px] font-black uppercase tracking-[0.05em] text-muted">{k}</dt><dd className="mt-1 text-2xl font-black tabular-nums text-ink">{v}</dd></div>)}</dl>
          <section aria-labelledby="party-provinces" className="mt-10">
            <h2 id="party-provinces" className="text-2xl font-extrabold tracking-tight">By province</h2>
            <div className="mt-3 overflow-x-auto border border-line"><table className="w-full min-w-[620px] border-collapse text-left text-[15px]">
              <thead><tr className="bg-wash text-[12.5px] uppercase tracking-[0.05em] text-muted"><th scope="col" className="px-4 py-3 font-extrabold">Province</th><th scope="col" className="px-4 py-3 text-right font-extrabold">Votes</th><th scope="col" className="px-4 py-3 text-right font-extrabold">Share</th><th scope="col" className="px-4 py-3 text-right font-extrabold">Seats</th><th scope="col" className="px-4 py-3 text-right font-extrabold">Led</th><th scope="col" className="px-4 py-3 text-right font-extrabold">Majorities</th></tr></thead>
              <tbody>{data.provinces.map((p) => <tr key={p.name} className="border-t border-line"><th scope="row" className="px-4 py-3 font-bold">{p.name}</th><td className="px-4 py-3 text-right tabular-nums text-body">{fmtNum(p.votes)}</td><td className="px-4 py-3 text-right tabular-nums text-body">{p.share.toFixed(1)}%</td><td className="px-4 py-3 text-right tabular-nums text-body">{fmtNum(p.seats)}</td><td className="px-4 py-3 text-right tabular-nums text-body">{fmtNum(p.councilsLed)}</td><td className="px-4 py-3 text-right tabular-nums text-body">{fmtNum(p.majorities)}</td></tr>)}</tbody>
            </table></div>
          </section>
          <section aria-labelledby="party-councils" className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="party-councils" className="text-2xl font-extrabold tracking-tight">Council by council</h2>
              <label className="flex min-h-11 items-center gap-2 text-sm font-bold"><input type="checkbox" checked={onlyLed} onChange={(e) => setOnlyLed(e.target.checked)} className="size-4 accent-[#890303]" />Only councils it leads</label>
            </div>
            <div className="mt-3 overflow-x-auto border border-line"><table className="w-full min-w-[620px] border-collapse text-left text-[15px]">
              <thead><tr className="bg-wash text-[12.5px] uppercase tracking-[0.05em] text-muted"><th scope="col" className="px-4 py-3 font-extrabold">Council</th><th scope="col" className="px-4 py-3 font-extrabold">Province</th><th scope="col" className="px-4 py-3 text-right font-extrabold">Votes</th><th scope="col" className="px-4 py-3 text-right font-extrabold">Share</th><th scope="col" className="px-4 py-3 text-right font-extrabold">Seats</th><th scope="col" className="px-4 py-3 font-extrabold">Position</th></tr></thead>
              <tbody>{councils.slice(0, 60).map((c) => <tr key={c.id} className="border-t border-line"><th scope="row" className="px-4 py-3 font-bold">{c.name}</th><td className="px-4 py-3 text-body">{c.province}</td><td className="px-4 py-3 text-right tabular-nums text-body">{fmtNum(c.votes)}</td><td className="px-4 py-3 text-right tabular-nums text-body">{c.share.toFixed(1)}%</td><td className="px-4 py-3 text-right tabular-nums text-body">{fmtNum(c.seats)}/{fmtNum(c.councilSeats)}</td><td className="px-4 py-3"><span className={`inline-block rounded-full px-2.5 py-1 text-[12.5px] font-bold ${c.leads ? "bg-[#dff5e8] text-[#0b5a2e]" : "bg-wash text-body"}`}>{c.leads ? "In front" : "Behind"}</span></td></tr>)}</tbody>
            </table></div>
          </section>
        </>
      )}
    </div>
  );
}
export function SeatsPage() {
  usePageTitle("Seat calculator");
  const { settings } = useControl();
  const { results } = useIec(settings.refreshMinutes);
  const details = useCouncilDetails();
  const national = results.state === "ready" ? results.data : undefined;
  // Council list: detailed file (has parties, so the calculator works); falls back to the national list.
  const councils = useMemo(() => details ?? [], [details]);
  const options = useMemo(() => (councils.length ? councils.map((c) => ({ id: c.id, name: c.name, province: c.province, seats: c.seats })) : (national?.councils ?? []).map((c) => ({ id: c.id, name: c.name, province: c.province, seats: c.seats }))).sort((a, b) => a.name.localeCompare(b.name)), [councils, national]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  const [shown, setShown] = useState(12);
  const activeId = chosen ?? options[0]?.id ?? null;
  const council = councils.find((c) => c.id === activeId);
  const fallbackOption = options.find((o) => o.id === activeId);
  const parties = useMemo(() => (council?.parties ?? []).filter((p) => p.id > 0 && p.seats > 0).map((p) => ({ id: p.id, name: p.name, seats: overrides[p.id] ?? p.seats })).sort((a, b) => b.seats - a.seats || a.name.localeCompare(b.name)), [council, overrides]);
  const totalSeats = council?.seats ?? fallbackOption?.seats ?? 0;
  const needed = majorityNeeded(totalSeats);
  const { coalitions, truncated } = useMemo(() => findCoalitions(parties, needed, 4, 8000), [parties, needed]);
  const tally = parties.reduce((s, p) => s + p.seats, 0);
  const loaded = !!national || councils.length > 0;
  return (
    <div className="wrap max-w-[980px] pt-7 md:pt-10">
      <PageHead title="Seat calculator"><p className="mt-2 max-w-[70ch] text-[15px] text-muted">Pick a council, adjust the seats, and see which combinations of parties could reach a majority. It is arithmetic, not a prediction.</p></PageHead>
      {loaded ? (
        <>
          <div className="mt-6">
            <label htmlFor="council-select" className="block text-[15px] font-extrabold">Council</label>
            <select id="council-select" value={activeId ?? ""} onChange={(e) => { setChosen(Number(e.target.value)); setOverrides({}); setShown(12); }} className="mt-1 h-12 w-full max-w-md border border-ink/35 bg-paper px-3.5 text-base text-ink">{options.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.province})</option>)}</select>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {([["Council seats", totalSeats], ["Seats for a majority", needed], ["Seats in this tally", tally]] as [string, number][]).map(([k, v]) => <div key={k} className="border border-line bg-paper p-4"><p className="text-[12.5px] font-black uppercase tracking-[0.05em] text-muted">{k}</p><p className="mt-1 text-2xl font-black tabular-nums text-ink">{fmtNum(v)}</p></div>)}
          </div>
          {council && (
            <section aria-labelledby="adjust" className="mt-8">
              <h2 id="adjust" className="text-2xl font-extrabold tracking-tight">Adjust the seats</h2>
              <p className="mt-1 text-[14.5px] text-muted">By-elections and floor-crossings change a tally. Type any number between 0 and the council size.</p>
              <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">{parties.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <label htmlFor={`seats-${p.id}`} className="min-w-0 flex-1 truncate text-[15px] font-bold">{p.name}</label>
                  <input id={`seats-${p.id}`} type="number" min={0} max={totalSeats} value={p.seats} onChange={(e) => setOverrides((prev) => ({ ...prev, [p.id]: Math.max(0, Math.min(totalSeats, Number(e.target.value) || 0)) }))} className="h-11 w-24 border border-ink/35 bg-paper px-3 text-base tabular-nums text-ink" />
                </li>
              ))}</ul>
            </section>
          )}
          <section aria-labelledby="coalitions" className="mt-10">
            <h2 id="coalitions" className="text-2xl font-extrabold tracking-tight">Possible coalitions</h2>
            <p className="mt-1 text-[14.5px] text-muted">Every combination of up to four parties that reaches {fmtNum(needed)} seats, starting with the fewest members first. These are possible majorities, not agreements.</p>
            {coalitions.length === 0 ? <p className="mt-4 border border-line bg-wash p-5 text-[15.5px] text-body">No combination of up to four parties reaches a majority with this tally. Either a single party already has {fmtNum(needed)} seats, or the council is gridlocked under these numbers.</p> : (
              <ul className="mt-4 space-y-3">{coalitions.slice(0, shown).map((c, i) => <li key={i} className="border border-line bg-paper p-4"><p className="text-[16px] font-extrabold text-ink">{c.members.map((m) => m.name).join(" + ")}</p><p className="mt-1 text-[14px] tabular-nums text-body">{fmtNum(c.seats)} seats — {c.seats - needed >= 0 ? `+${c.seats - needed}` : ""} over the {fmtNum(needed)} needed · {c.members.length} {c.members.length === 1 ? "party" : "parties"}</p></li>)}</ul>
            )}
            {shown < coalitions.length && <div className="mt-6 text-center"><button type="button" onClick={() => setShown((s) => s + 12)} className="inline-flex h-12 cursor-pointer items-center border-2 border-navy px-7 text-[15px] font-extrabold text-navy transition-colors hover:bg-navy hover:text-white">Show more combinations ({coalitions.length - shown} left)</button></div>}
            {truncated && <p className="mt-3 text-[13.5px] text-muted">The full list is longer than 8 000 combinations, so it has been cut off.</p>}
          </section>
        </>
      ) : <p className="mt-8 text-[15px] text-muted">Loading council results…</p>}
    </div>
  );
}
