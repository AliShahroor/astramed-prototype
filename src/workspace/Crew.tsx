import { useEffect, useMemo, useState } from "react";
import { Lock, X } from "lucide-react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { activities, astronauts, metricFor } from "../data/catalog";
import { CABIN_ID, CREW_WINDOW_DAYS } from "../app/useMission";
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

export function Crew() {
  const ws = useWs();
  const { state, mission, astronaut } = ws;
  const [selectedId, setSelected] = useState(astronaut.id);
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
  const checkinToday = (id: string) => state.checkins[`${state.scenario}-${id}-${state.day}`];
  const active = (id: string) => mission.crewFindings[id].filter((f) => (f.status === "Review" || f.status === "Alert") && f.indicator !== "co2");
  const cabinAlert = mission.crewFindings[astronauts[0].id].find((f) => f.indicator === "co2" && f.status === "Alert");

  const review = astronauts.filter((a) => a.share && active(a.id).length > 0).length;
  const pendingCheckins = astronauts.filter((a) => pendingFor(a.id).length > 0 && !checkinToday(a.id)).length;

  return (
    <>
      <section className="ops-summary" aria-label="Crew summary">
        <dl>
          <div><dt>Crew on mission</dt><dd>{astronauts.length}</dd></div>
          <div><dt>Shared review status</dt><dd>{review}</dd></div>
          <div><dt>Check-ins pending</dt><dd>{pendingCheckins}</dd></div>
          <div><dt>Unacknowledged notifications</dt><dd>{unacked.length}</dd></div>
          <div><dt>Cabin CO₂</dt><dd className={cabinAlert ? "warn-text" : ""}>{cabinAlert ? "Above reference" : "Within reference"}</dd></div>
        </dl>
        <p className="muted small"><Lock size={13} aria-hidden="true" /> Crewmates see shared status, check-ins and, where the profile permits, three wellness trends. Demo permission model, not authenticated access.</p>
      </section>

      <div className="crew-layout">
        <div className="crew-main">
          <section aria-labelledby="roster-h">
            <div className="section-head"><h2 id="roster-h" className="h2">Crew roster</h2><span className="muted small">Status window: last {CREW_WINDOW_DAYS} days</span></div>
            <div className="table-wrap" role="region" aria-label="Crew roster" tabIndex={0}>
              <table className="roster">
                <thead><tr><th scope="col">Crew member</th><th scope="col">Shared status</th><th scope="col">Last check-in</th><th scope="col">Attention request</th></tr></thead>
                <tbody>
                  {astronauts.map((a) => {
                    const c = lastCheckin(state, a.id);
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
                        <td>{c.label}<small className="muted block">{c.detail}</small></td>
                        <td>{p.length ? <span className="tone warn">{p.length === 1 ? (p[0].kind === "request" ? "Check-in requested by crew" : "Check-in requested") : `${p.length} open`}</span> : <span className="muted">None</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <AttentionTimeline />
          <Notifications notes={notes} onReview={setSelectedId} />
          <ActivityLog />
        </div>
        {sheet && <button className="sheet-backdrop" aria-label="Close crew member details" onClick={() => setSheet(false)} />}
        <CrewDetail a={selected} active={active(selected.id)} pending={pendingFor(selected.id)} open={sheet} onClose={() => setSheet(false)} />
      </div>
    </>
  );
}

function lastCheckin(state: ReturnType<typeof useWs>["state"], id: string) {
  for (let d = state.day; d >= 1; d--) {
    const v = state.checkins[`${state.scenario}-${id}-${d}`];
    if (v) return { label: `Day ${d}`, detail: CHECKIN[v] ?? "Recorded", recorded: true, status: v };
  }
  return { label: "Not recorded", detail: "No check-in in this scenario", recorded: false, status: "" };
}

function SharedStatus({ a, active, pending }: { a: Astronaut; active: Finding[]; pending: boolean }) {
  if (!a.share) return <span className="tone muted"><Lock size={13} aria-hidden="true" /> Limited sharing</span>;
  const top = active[0]?.status;
  if (top) return <StatusTag status={top} />;
  if (pending) return <span className="tone warn">Awaiting check-in</span>;
  return <StatusTag status="Nominal" />;
}

function CrewDetail({ a, active, pending, open: isOpen, onClose }: { a: Astronaut; active: Finding[]; pending: CrewNotification[]; open: boolean; onClose: () => void }) {
  const { state, setState, astronaut, mission, notify, update, open } = useWs();
  const self = a.id === astronaut.id;
  const c = lastCheckin(state, a.id);
  const record = (status: string) => {
    setState((s) => ({ ...s, checkins: { ...s.checkins, [`${s.scenario}-${a.id}-${s.day}`]: status } }));
    notify(`Check-in recorded: ${CHECKIN[status]}.`);
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
        <div><dt>Latest check-in</dt><dd>{c.label}{c.recorded && ` · ${c.detail}`}</dd></div>
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

      <div className="detail-actions">
        {self ? (
          <>
            <h3 className="h3">Record your check-in</h3>
            <div className="checkin-options" role="group" aria-label="Check-in status">
              {Object.keys(CHECKIN).map((k) => <button key={k} className="choice" aria-pressed={state.checkins[`${state.scenario}-${a.id}-${state.day}`] === k} onClick={() => record(k)}>{CHECKIN[k]}</button>)}
            </div>
            {active.length > 0 && <button className="btn btn-secondary" onClick={() => open({ type: "finding", indicator: active[0].indicator })}>Open my health card</button>}
          </>
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
        <strong>{last ? `${last.value.toFixed(m.decimals)} ${m.unit}` : "—"}</strong>
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

function Notifications({ notes, onReview }: { notes: CrewNotification[]; onReview: (id: string) => void }) {
  const { setState, notify, astronaut, mission, open } = useWs();
  const ack = (n: CrewNotification, verb = "Acknowledged") => {
    setState((s) => ({ ...s, notifications: s.notifications.map((x) => (x.id === n.id ? { ...x, acknowledged: true, acknowledgedAt: dayTimestamp(s.day, 15) } : x)) }));
    notify(`${verb}. The underlying finding remains until the readings change.`);
  };
  const context = (n: CrewNotification) => {
    if (n.kind === "request") return "Manual request from a crewmate";
    if (n.astronautId === CABIN_ID) {
      const f = mission.crewFindings[astronauts[0].id].find((x) => x.indicator === "co2");
      return f?.current ? `Cabin CO₂ ${f.current.value} mmHg one-hour average vs 3 mmHg reference` : "Cabin CO₂ reference";
    }
    return "Slower reaction time for 3+ days together with reduced sleep (policy rule)";
  };
  const who = (id: string) => (id === CABIN_ID ? "Cabin environment" : astronauts.find((a) => a.id === id)?.name ?? id);
  return (
    <section aria-labelledby="notes-h">
      <div className="section-head"><h2 id="notes-h" className="h2">Notifications</h2><span className="muted small">{notes.filter((n) => !n.acknowledged).length} unacknowledged</span></div>
      {notes.length === 0 ? <p className="empty">No notifications in this scenario up to the selected day.</p> : (
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
    </section>
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
  for (const [k, v] of Object.entries(state.checkins)) {
    const [sc, id, d] = k.split("-");
    if (sc === state.scenario && Number(d) <= state.day) events.push({ t: dayTimestamp(Number(d), 10), text: `${name(id)} checked in: ${CHECKIN[v] ?? v}` });
  }
  events.sort((a, b) => b.t.localeCompare(a.t));
  return (
    <section aria-labelledby="log-h">
      <div className="section-head"><h2 id="log-h" className="h2">Crew activity</h2><span className="muted small">Recorded in this demo session</span></div>
      {events.length === 0 ? <p className="empty">No crew activity recorded yet. Check-ins, assessments, exercise sessions and acknowledgements appear here.</p> : (
        <ol className="log">
          {events.slice(0, 12).map((e, i) => <li key={i}><span className="nowrap muted">{time(e.t)}</span><span>{e.text}</span></li>)}
        </ol>
      )}
    </section>
  );
}
