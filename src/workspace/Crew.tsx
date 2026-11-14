import { useEffect, useMemo, useState } from "react";
import { Lock, X } from "lucide-react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { activities, astronauts, metricFor } from "../data/catalog";
import { CABIN_ID, CREW_WINDOW_DAYS } from "../app/useMission";
import { usePersisted } from "../app/usePersisted";
import { dayTimestamp, evaluateAll, selectSeries } from "../engine/monitoring";
import type { Astronaut, CrewNotification, Finding, Indicator, Measurement, Status } from "../types";
import { StatusTag, useWs } from "./context";

export const CHECKIN: Record<string, string> = { ok: "No concerns", talk: "Requests a conversation", support: "Requests medical support" };
const SHARED_TRENDS: Indicator[] = ["sleep", "reaction", "heart"];
const RANK: Record<Status, number> = { Alert: 3, Review: 2, "Insufficient data": 1, Nominal: 0 };
const time = (iso: string) => {
  const d = Math.floor((Date.parse(iso) - Date.parse(dayTimestamp(1, 0))) / 86400000) + 1;
  return `Day ${d}, ${iso.slice(11, 16)}`;
};

export interface Entry { id: string; astronautId: string; day: number; time: string; status: string; note?: string; source: "synthetic" | "recorded" }

/** Synthetic routine check-ins for the last week (documented as simulated), plus everything recorded in the app. */
export function checkinsFor(state: ReturnType<typeof useWs>["state"]): Entry[] {
  const out: Entry[] = [];
  const base: Record<string, number> = { alex: 7 * 60 + 5, maya: 7 * 60 + 20, leo: 7 * 60 + 40 };
  for (const a of astronauts)
    for (let d = Math.max(1, state.day - 6); d <= state.day; d++) {
      const fatigued = state.scenario === "fatigue" && a.id === "alex";
      if (fatigued && d === state.day) continue; // today's check-in is still due in scenario B
      const m = (base[a.id] ?? 480) + ((d * 7 + a.id.length * 3) % 11);
      out.push({ id: `syn-${a.id}-${d}`, astronautId: a.id, day: d, time: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`, status: fatigued && d >= state.day - 2 ? "talk" : "ok", source: "synthetic" });
    }
  for (const [k, v] of Object.entries(state.checkins)) {
    const [sc, id, d] = k.split("-");
    if (sc === state.scenario && Number(d) <= state.day) out.push({ id: `legacy-${k}`, astronautId: id, day: Number(d), time: "10:00", status: v, source: "recorded" });
  }
  for (const e of state.checkinEntries) if (e.scenario === state.scenario && e.day <= state.day) out.push({ ...e });
  return out.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
}
const when = (e: Entry, today: number) => (e.day === today ? `Today ${e.time}` : e.day === today - 1 ? `Yesterday ${e.time}` : `Day ${e.day}, ${e.time}`);
function checkinState(entries: Entry[], id: string, today: number) {
  const mine = entries.filter((e) => e.astronautId === id);
  const last = mine.at(-1);
  const due = !last ? "overdue" : last.day === today ? "done" : last.day === today - 1 ? "due" : "overdue";
  return { last, mine, due } as const;
}

export function Crew() {
  const ws = useWs();
  const { state, mission, astronaut } = ws;
  const [selectedId, setSelected] = usePersisted<string>("crewSelected", astronaut.id, (v): v is string => astronauts.some((a) => a.id === v));
  // Below 1100 px the detail panel is a slide-over sheet opened by selecting a crew member.
  const [sheet, setSheet] = useState(false);
  const setSelectedId = (id: string) => {
    setSelected(id);
    setSheet(true);
  };
  useEffect(() => {
    if (!sheet) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setSheet(false); };
    document.addEventListener("keydown", key);
    if (window.innerWidth < 1100) requestAnimationFrame(() => (document.querySelector(".crew-detail .sheet-close") as HTMLElement | null)?.focus());
    return () => document.removeEventListener("keydown", key);
  }, [sheet]);
  const selected = astronauts.find((a) => a.id === selectedId) ?? astronaut;
  const notes = state.notifications.filter((n) => n.scenario === state.scenario && n.day <= state.day);
  const unacked = notes.filter((n) => !n.acknowledged);
  const pendingFor = (id: string) => unacked.filter((n) => n.astronautId === id);
  const entries = checkinsFor(state);
  const active = (id: string) => mission.crewFindings[id].filter((f) => (f.status === "Review" || f.status === "Alert") && f.indicator !== "co2");
  const cabinAlert = mission.crewFindings[astronauts[0].id].find((f) => f.indicator === "co2" && f.status === "Alert");

  const dueToday = astronauts.filter((a) => checkinState(entries, a.id, state.day).due !== "done").length;

  return (
    <>
      <section className="ops-summary" aria-label="Crew summary">
        <dl>
          <div><dt>Crew</dt><dd>{astronauts.length}</dd></div>
          <div><dt>Check-ins due today</dt><dd className={dueToday ? "warn-text" : ""}>{dueToday}</dd></div>
          <div><dt>Open notifications</dt><dd className={unacked.length ? "warn-text" : ""}>{unacked.length}</dd></div>
          <div><dt>Cabin CO₂</dt><dd className={cabinAlert ? "warn-text" : ""}>{cabinAlert ? "Above limit" : "Within limit"}</dd></div>
        </dl>
      </section>

      <div className="crew-layout">
        <div className="crew-main">
          <section aria-labelledby="roster-h">
            <div className="section-head"><h2 id="roster-h" className="h2">Crew</h2><span className="muted small"><Lock size={12} aria-hidden="true" /> Shared status only · demo permissions</span></div>
            <div className="table-wrap" role="region" aria-label="Crew roster" tabIndex={0}>
              <table className="roster">
                <thead><tr><th scope="col">Crew member</th><th scope="col">Status</th><th scope="col">Last check-in</th><th scope="col">Requests</th></tr></thead>
                <tbody>
                  {astronauts.map((a) => {
                    const c = checkinState(entries, a.id, state.day);
                    const p = pendingFor(a.id);
                    return (
                      <tr key={a.id} className={a.id === selected.id ? "selected" : ""} onClick={() => setSelectedId(a.id)}>
                        <th scope="row">
                          <button className="who-btn" aria-pressed={a.id === selected.id} onClick={(e) => { e.stopPropagation(); setSelectedId(a.id); }}>
                            <span className="avatar sm" aria-hidden="true">{a.initials}</span>
                            <span>{a.name}{a.id === astronaut.id && <em className="you"> (you)</em>}<small>{a.role}</small></span>
                          </button>
                        </th>
                        <td><SharedStatus a={a} active={active(a.id)} pending={p.length > 0} /></td>
                        <td>
                          {c.last ? when(c.last, state.day) : "None"}
                          {c.due !== "done" && <span className={`due ${c.due}`}>{c.due === "due" ? "Due today" : "Overdue"}</span>}
                          {c.last && <small className="muted block">{CHECKIN[c.last.status]}</small>}
                        </td>
                        <td>{p.length ? <span className="tone warn">{p.length} open</span> : <span className="muted">None</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <AttentionTimeline />
          <Feed notes={notes} onReview={setSelectedId} />
        </div>
        {sheet && <button className="sheet-backdrop" aria-label="Close crew member details" onClick={() => setSheet(false)} />}
        <CrewDetail a={selected} active={active(selected.id)} pending={pendingFor(selected.id)} entries={entries} open={sheet} onClose={() => setSheet(false)} />
      </div>
    </>
  );
}

function SharedStatus({ a, active, pending }: { a: Astronaut; active: Finding[]; pending: boolean }) {
  if (!a.share) return <span className="tone muted"><Lock size={13} aria-hidden="true" /> Limited sharing</span>;
  const top = active[0]?.status;
  if (top) return <StatusTag status={top} />;
  if (pending) return <span className="tone warn">Attention requested</span>;
  return <StatusTag status="Nominal" />;
}

function CrewDetail({ a, active, pending, entries, open: isOpen, onClose }: { a: Astronaut; active: Finding[]; pending: CrewNotification[]; entries: Entry[]; open: boolean; onClose: () => void }) {
  const { state, setState, astronaut, mission, notify, update, open } = useWs();
  const self = a.id === astronaut.id;
  const c = checkinState(entries, a.id, state.day);
  const [status, setStatus] = useState<"ok" | "talk" | "support">("ok");
  const [note, setNote] = useState("");
  const record = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const requests = state.notifications.filter((n) => n.scenario === state.scenario && n.astronautId === a.id && n.kind === "request" && !n.acknowledged && n.requestedBy !== a.id);
    setState((s) => {
      let notifications = s.notifications.map((n) => (requests.some((r) => r.id === n.id) ? { ...n, acknowledged: true, acknowledgedAt: dayTimestamp(s.day, now.getHours()) } : n));
      if (status === "support") {
        const id = `${s.scenario}-support-${a.id}-${s.day}-${t}`;
        notifications = [{ id, astronautId: a.id, scenario: s.scenario, day: s.day, findingId: "", title: `Medical support requested by ${a.name}`, acknowledged: false, timestamp: dayTimestamp(s.day, now.getHours()), kind: "request", requestedBy: a.id }, ...notifications];
      }
      return { ...s, notifications, checkinEntries: [...s.checkinEntries, { id: crypto.randomUUID(), astronautId: a.id, scenario: s.scenario, day: s.day, time: t, status, note: note.trim() || undefined, source: "recorded" }] };
    });
    setNote("");
    notify(`Check-in recorded at ${t}: ${CHECKIN[status]}.${requests.length ? ` ${requests.length} open request${requests.length > 1 ? "s" : ""} answered.` : ""}${status === "support" ? " The crew has been notified." : ""}`);
  };
  const request = () => {
    const id = `${state.scenario}-request-${a.id}-${state.day}`;
    if (state.notifications.some((n) => n.id === id)) return notify(`A check-in request for ${a.name} is already open today.`);
    setState((s) => ({ ...s, notifications: [{ id, astronautId: a.id, scenario: s.scenario, day: s.day, findingId: "", title: `Check-in requested by ${astronaut.name}`, acknowledged: false, timestamp: dayTimestamp(s.day, 12), kind: "request", requestedBy: astronaut.id }, ...s.notifications] }));
    notify(`Check-in request sent to ${a.name} (in-app only).`);
  };
  return (
    <aside className={isOpen ? "crew-detail open" : "crew-detail"} aria-labelledby="detail-h">
      <button className="icon-btn sheet-close" onClick={onClose} aria-label="Close crew member details"><X size={18} aria-hidden="true" /></button>
      <div className="detail-head">
        <span className="avatar lg" aria-hidden="true">{a.initials}</span>
        <div>
          <h2 id="detail-h" className="h2">{a.name}</h2>
          <p className="muted">{a.role} · <span className="mono">{a.designation}</span></p>
        </div>
      </div>
      <dl className="detail-facts">
        <div><dt>Shared status</dt><dd><SharedStatus a={a} active={active} pending={pending.length > 0} /></dd></div>
        <div><dt>Latest check-in</dt><dd>{c.last ? `${when(c.last, state.day)} · ${CHECKIN[c.last.status]}` : "None"}</dd></div>
        <div><dt>Open requests</dt><dd>{pending.length || "None"}</dd></div>
        <div><dt>Data sharing</dt><dd>{a.share ? "Status and wellness trends" : "Status and check-ins only"}</dd></div>
      </dl>

      {a.share || self ? (
        <>
          <h3 className="h3 spaced">Active findings</h3>
          {active.length === 0 ? <p className="muted">No implemented rule triggered in the last {CREW_WINDOW_DAYS} days.</p> : (
            <ul className="finding-list">
              {active.map((f) => <li key={f.id}><StatusTag status={f.status} plain /> <span>{f.title}</span></li>)}
            </ul>
          )}
          <h3 className="h3 spaced">Shared wellness trends</h3>
          <p className="muted small">Last {CREW_WINDOW_DAYS} days against {self ? "your" : "their"} preflight baseline.</p>
          <div className="spark-grid">
            {SHARED_TRENDS.map((id) => (
              <Spark key={id} indicator={id} rows={selectSeries(mission.rows, a.id, state.scenario, id, state.day, CREW_WINDOW_DAYS)} baseline={a.baseline[id].value} />
            ))}
          </div>
        </>
      ) : (
        <p className="privacy-box"><Lock size={15} aria-hidden="true" /> {a.name.split(" ")[0]} has limited sharing. Findings and trends stay in their personal record.</p>
      )}

      <h3 className="h3 spaced">Check-in history</h3>
      <ol className="checkin-history">
        {c.mine.length === 0 ? <li className="muted">No check-ins yet.</li> : [...c.mine].reverse().slice(0, 5).map((e) => (
          <li key={e.id}>
            <span className={`dot-status ${e.status}`} aria-hidden="true" />
            <span className="grow">{CHECKIN[e.status]}{e.note && <small className="block muted">“{e.note}”</small>}</span>
            <span className="muted small nowrap">{when(e, state.day)}{e.source === "synthetic" && " · sim"}</span>
          </li>
        ))}
      </ol>

      <div className="detail-actions">
        {self ? (
          <form className="checkin-form" onSubmit={record}>
            <h3 className="h3">{c.due === "done" ? "Update today’s check-in" : "Check in for today"}</h3>
            <div className="checkin-options" role="radiogroup" aria-label="How are you today?">
              {(Object.keys(CHECKIN) as ("ok" | "talk" | "support")[]).map((k) => (
                <label key={k} className={status === k ? "choice selected" : "choice"}>
                  <input type="radio" name="checkin" value={k} checked={status === k} onChange={() => setStatus(k)} className="sr-only" />
                  {CHECKIN[k]}
                </label>
              ))}
            </div>
            <label className="field-label">Note for the crew (optional)<input className="field" value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="e.g. slept badly, will rest after shift" /></label>
            <div className="actions">
              <button className="btn btn-primary" type="submit">Submit check-in</button>
              {active.length > 0 && <button type="button" className="btn btn-quiet" onClick={() => open({ type: "finding", indicator: active[0].indicator })}>Open my health card</button>}
            </div>
          </form>
        ) : (
          <div className="actions">
            <button className="btn btn-secondary" onClick={request}>Request check-in</button>
            <button className="btn btn-quiet" onClick={() => { update({ astronautId: a.id }); notify(`Viewing as ${a.name}.`); }}>Switch to this profile</button>
          </div>
        )}
      </div>
    </aside>
  );
}

function Spark({ indicator, rows, baseline }: { indicator: Indicator; rows: Measurement[]; baseline: number }) {
  const m = metricFor(indicator);
  const last = rows.at(-1);
  const pct = last ? ((last.value - baseline) / baseline) * 100 : null;
  const vals = rows.map((r) => r.value).concat(baseline);
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = Math.max((hi - lo) * 0.15, Math.abs(baseline) * 0.02);
  return (
    <figure className="spark">
      <figcaption>
        <span>{m.short}</span>
        <strong>{last ? `${last.value.toFixed(m.decimals)} ${m.unit}` : "-"}</strong>
        <small className={pct !== null && Math.abs(pct) >= 15 ? "warn-text" : "muted"}>{pct === null ? "no data" : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs ${baseline} ${m.unit}`}</small>
      </figcaption>
      <div className="spark-chart" role="img" aria-label={`${m.short} trend, ${rows.length} days, latest ${last?.value ?? "none"} ${m.unit}, baseline ${baseline} ${m.unit}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
            <XAxis dataKey="day" hide />
            <YAxis hide domain={[lo - pad, hi + pad]} />
            <Tooltip contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--line-strong)", borderRadius: 6, color: "var(--text)", fontSize: 13 }} labelFormatter={(d) => `Day ${d}`} formatter={(v) => [`${v} ${m.unit}`, m.short]} />
            <ReferenceLine y={baseline} stroke="var(--info)" strokeDasharray="4 4" />
            <Line dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

/** Worst shared status per crew member per day, recomputed with the monitoring engine for each day. */
function AttentionTimeline() {
  const { state, mission } = useWs();
  const days = Array.from({ length: CREW_WINDOW_DAYS }, (_, i) => state.day - CREW_WINDOW_DAYS + 1 + i).filter((d) => d >= 1);
  const grid = useMemo(() => {
    const out: Record<string, Status[]> = {};
    for (const a of astronauts) {
      const own = mission.rows.filter((r) => r.astronautId === a.id || r.indicator === "co2");
      out[a.id] = days.map((d) => {
        const fs = evaluateAll(a, own, state.scenario, d, CREW_WINDOW_DAYS).filter((f) => f.indicator !== "co2");
        return fs.reduce<Status>((w, f) => (RANK[f.status] > RANK[w] && f.status !== "Insufficient data" ? f.status : w), "Nominal");
      });
    }
    out[CABIN_ID] = days.map((d) => {
      const f = evaluateAll(astronauts[0], mission.rows.filter((r) => r.indicator === "co2"), state.scenario, d, CREW_WINDOW_DAYS).find((x) => x.indicator === "co2")!;
      return f.status;
    });
    return out;
  }, [mission.rows, state.scenario, state.day]); // eslint-disable-line react-hooks/exhaustive-deps
  const label: Record<Status, string> = { Nominal: "No flag", Review: "Review", Alert: "Alert", "Insufficient data": "No data" };
  return (
    <section aria-labelledby="tl-h">
      <div className="section-head"><h2 id="tl-h" className="h2">Attention timeline</h2><span className="muted small">Days {days[0]}–{days.at(-1)} · recalculated per day</span></div>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Attention timeline">
        <table className="timeline-grid">
          <thead><tr><th scope="col"><span className="sr-only">Crew member</span></th>{days.map((d) => <th key={d} scope="col">{d}</th>)}</tr></thead>
          <tbody>
            {[...astronauts.map((a) => ({ id: a.id, name: a.name.split(" ")[0], share: a.share })), { id: CABIN_ID, name: "Cabin", share: true }].map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.name}</th>
                {grid[r.id].map((s, i) => {
                  const shown = r.share ? s : null;
                  const text = shown ? label[shown] : "Not shared";
                  return <td key={i}><span className={`cell ${shown ? shown.toLowerCase().replace(" ", "-") : "hidden"}`} title={`${r.name}, day ${days[i]}: ${text}`}><span className="sr-only">Day {days[i]}: {text}</span></span></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="legend">
        <span><i className="cell nominal" />No flag</span><span><i className="cell review" />Review</span><span><i className="cell alert" />Alert</span><span><i className="cell hidden" />Not shared</span>
      </p>
    </section>
  );
}

function Feed({ notes, onReview }: { notes: CrewNotification[]; onReview: (id: string) => void }) {
  const [tab, setTab] = usePersisted<"open" | "all" | "activity">("crewFeed", "open", (v): v is "open" | "all" | "activity" => v === "open" || v === "all" || v === "activity");
  const { setState, notify } = useWs();
  const openNotes = notes.filter((n) => !n.acknowledged);
  return (
    <section aria-labelledby="feed-h">
      <div className="section-head">
        <h2 id="feed-h" className="h2">Notifications and activity</h2>
        <div className="segmented" role="group" aria-label="Show">
          <button aria-pressed={tab === "open"} onClick={() => setTab("open")}>Open ({openNotes.length})</button>
          <button aria-pressed={tab === "all"} onClick={() => setTab("all")}>All notifications</button>
          <button aria-pressed={tab === "activity"} onClick={() => setTab("activity")}>Activity</button>
        </div>
      </div>
      {tab === "activity" ? <ActivityLog /> : (
        <>
          <Notifications notes={tab === "open" ? openNotes : notes} onReview={onReview} empty={tab === "open" ? "Nothing open. All notifications are acknowledged." : "No notifications in this scenario up to the selected day."} />
          {tab === "open" && openNotes.length > 1 && (
            <button className="btn btn-link sm spaced" onClick={() => { setState((s) => ({ ...s, notifications: s.notifications.map((n) => (openNotes.some((o) => o.id === n.id) ? { ...n, acknowledged: true, acknowledgedAt: dayTimestamp(s.day, 15) } : n)) })); notify(`${openNotes.length} notifications acknowledged.`); }}>Acknowledge all</button>
          )}
        </>
      )}
    </section>
  );
}

function Notifications({ notes, onReview, empty }: { notes: CrewNotification[]; onReview: (id: string) => void; empty: string }) {
  const { setState, notify, astronaut, mission, open } = useWs();
  const ack = (n: CrewNotification, verb = "Acknowledged") => {
    setState((s) => ({ ...s, notifications: s.notifications.map((x) => (x.id === n.id ? { ...x, acknowledged: true, acknowledgedAt: dayTimestamp(s.day, 15) } : x)) }));
    notify(`${verb}. The underlying finding remains until the readings change.`);
  };
  const context = (n: CrewNotification) => {
    if (n.kind === "request") return n.requestedBy === n.astronautId ? "Raised from a check-in" : "Manual request from a crewmate";
    if (n.astronautId === CABIN_ID) {
      const f = mission.crewFindings[astronauts[0].id].find((x) => x.indicator === "co2");
      return f?.current ? `Cabin CO₂ ${f.current.value} mmHg one-hour average vs 3 mmHg reference` : "Cabin CO₂ reference";
    }
    return "Slower reaction time for 3+ days together with reduced sleep (policy rule)";
  };
  const who = (id: string) => (id === CABIN_ID ? "Cabin environment" : astronauts.find((a) => a.id === id)?.name ?? id);
  return (
    <>
      {notes.length === 0 ? <p className="empty">{empty}</p> : (
        <div className="table-wrap" role="region" aria-label="Notifications" tabIndex={0}>
          <table className="notes">
            <thead><tr><th scope="col">Crew member</th><th scope="col">Notification</th><th scope="col">Raised</th><th scope="col">State</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {notes.map((n) => (
                <tr key={n.id} className={n.acknowledged ? "done" : ""}>
                  <td>{who(n.astronautId)}</td>
                  <td><strong>{n.title}</strong><small className="muted block">{context(n)}</small></td>
                  <td className="nowrap">{time(n.timestamp)}</td>
                  <td>{n.acknowledged ? <span className="muted">Acknowledged{n.acknowledgedAt ? ` ${time(n.acknowledgedAt)}` : ""}</span> : <span className="tone warn">Open</span>}</td>
                  <td className="right nowrap">
                    <button className="btn btn-link sm" onClick={() => (n.astronautId === CABIN_ID ? open({ type: "finding", indicator: "co2" }) : n.astronautId === astronaut.id && n.kind !== "request" ? open({ type: "finding", indicator: "reaction" }) : onReview(n.astronautId))}>Review</button>
                    {!n.acknowledged && <button className="btn btn-secondary sm" onClick={() => ack(n, n.kind === "request" ? "Request dismissed" : "Acknowledged")}>{n.kind === "request" ? "Dismiss" : "Acknowledge"}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ActivityLog() {
  const { state } = useWs();
  const name = (id: string) => astronauts.find((a) => a.id === id)?.name.split(" ")[0] ?? "Cabin";
  const within = (iso: string, day: number) => day <= state.day && !!iso;
  const events: { t: string; text: string }[] = [];
  for (const r of state.assessments) if (r.scenario === state.scenario && within(r.timestamp, r.day)) events.push({ t: dayTimestamp(r.day, 13), text: `${name(r.astronautId)} completed a reaction-time assessment (${r.median.toFixed(0)} ms median)` });
  for (const c of state.completions) if (c.scenario === state.scenario && c.day <= state.day) events.push({ t: c.timestamp, text: `${name(c.astronautId)} ${c.kind === "session" ? `recorded a ${c.minutes ?? ""}-min session` : "finished the checklist"}: ${activities.find((a) => a.id === c.activityId)?.title ?? c.activityId}` });
  for (const n of state.notifications) if (n.scenario === state.scenario && n.day <= state.day) {
    events.push({ t: n.timestamp, text: n.kind === "request" ? `${name(n.requestedBy ?? "")} requested a check-in from ${name(n.astronautId)}` : `Notification raised: ${n.title}` });
    if (n.acknowledgedAt) events.push({ t: n.acknowledgedAt, text: `Notification acknowledged: ${n.title}` });
  }
  for (const e of checkinsFor(state)) if (e.source === "recorded") events.push({ t: `${dayTimestamp(e.day).slice(0, 11)}${e.time}`, text: `${name(e.astronautId)} checked in: ${CHECKIN[e.status] ?? e.status}${e.note ? ` (“${e.note}”)` : ""}` });
  events.sort((a, b) => b.t.localeCompare(a.t));
  return (
    <>
      {events.length === 0 ? <p className="empty">No crew activity recorded yet. Check-ins, assessments, exercise sessions and acknowledgements appear here.</p> : (
        <ol className="log">
          {events.slice(0, 12).map((e, i) => <li key={i}><span className="nowrap muted">{time(e.t)}</span><span>{e.text}</span></li>)}
        </ol>
      )}
    </>
  );
}
