import { Check, Lock, Wind } from "lucide-react";
import { astronauts } from "../data/catalog";
import { CABIN_ID } from "../app/useMission";
import type { Astronaut } from "../types";
import { useWs } from "./context";

const CHECKIN: Record<string, string> = { ok: "Doing okay", talk: "Would like a check-in", support: "Requesting support" };

export function Crew() {
  const { state, setState, astronaut, mission, notify, update, environment } = useWs();
  const notes = state.notifications.filter((n) => n.scenario === state.scenario && n.day <= state.day);
  const pendingFor = (id: string) => notes.filter((n) => n.astronautId === id && !n.acknowledged);
  const cabinAlert = mission.crewFindings[astronauts[0].id].find((f) => f.indicator === "co2" && f.status === "Alert");

  const lastCheckin = (id: string) => {
    for (let d = state.day; d >= 1; d--) {
      const v = state.checkins[`${state.scenario}-${id}-${d}`];
      if (v) return { day: d, status: CHECKIN[v] ?? "Recorded", recorded: true };
    }
    return { day: state.day, status: "Synthetic routine check-in", recorded: false };
  };

  const shared = (a: Astronaut) => {
    if (!a.share) return { text: "Not shared", tone: "muted", icon: true };
    if (pendingFor(a.id).length) return { text: "Check-in requested", tone: "warn", icon: false };
    const reviewing = mission.crewFindings[a.id].some((f) => (f.status === "Review" || f.status === "Alert") && f.indicator !== "co2");
    return reviewing ? { text: "Self-review in progress", tone: "info", icon: false } : { text: "No shared concerns", tone: "ok", icon: false };
  };

  const record = (status: keyof typeof CHECKIN) => {
    setState((s) => ({ ...s, checkins: { ...s.checkins, [`${s.scenario}-${s.astronautId}-${s.day}`]: status } }));
    notify(`Check-in recorded for ${astronaut.name}: ${CHECKIN[status]}.`);
  };
  const mine = state.checkins[`${state.scenario}-${astronaut.id}-${state.day}`];

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Crew</h1>
          <p className="page-sub">Shared safety awareness for the four crew of Ares I. Viewing as {astronaut.name}.</p>
        </div>
      </div>
      <p className="notice-line">
        <Lock size={16} aria-hidden="true" />
        Crewmates see a coarse status and check-ins only, never measurements. Sharing preferences are part of each fictional
        profile; switching profiles is a demo control, not authenticated access.
      </p>

      <section aria-labelledby="roster-h">
        <div className="section-head"><h2 id="roster-h" className="h2">Crew roster</h2><span className="muted small">Status uses a fixed 14-day window for every viewer</span></div>
        <div className="table-wrap" role="region" aria-label="Crew roster" tabIndex={0}>
          <table className="roster">
            <thead>
              <tr><th scope="col">Crew member</th><th scope="col">Shared status</th><th scope="col">Last check-in</th><th scope="col">Requests</th><th scope="col"><span className="sr-only">Profile</span></th></tr>
            </thead>
            <tbody>
              <tr className={cabinAlert ? "cabin-row alert" : "cabin-row"}>
                <th scope="row">
                  <span className="who"><span className="avatar sm cabin" aria-hidden="true"><Wind size={14} /></span><span>Cabin environment<small>Shared habitat · {environment.name}</small></span></span>
                </th>
                <td>{cabinAlert ? <span className="tone warn">CO₂ above NASA reference</span> : <span className="tone ok">No reference exceedance</span>}</td>
                <td className="muted">Sensor record, day {state.day}</td>
                <td>{pendingFor(CABIN_ID).length || <span className="muted">—</span>}</td>
                <td />
              </tr>
              {astronauts.map((a) => {
                const s = shared(a);
                const c = lastCheckin(a.id);
                const p = pendingFor(a.id).length;
                return (
                  <tr key={a.id} aria-current={a.id === astronaut.id ? "true" : undefined}>
                    <th scope="row">
                      <span className="who"><span className="avatar sm" aria-hidden="true">{a.initials}</span><span>{a.name}{a.id === astronaut.id && <em className="you"> · you</em>}<small>{a.role} · <span className="mono">{a.designation}</span></small></span></span>
                    </th>
                    <td><span className={`tone ${s.tone}`}>{s.icon && <Lock size={13} aria-hidden="true" />}{s.text}</span></td>
                    <td><span>Day {c.day}</span><small className="muted block">{c.status}</small></td>
                    <td>{p ? <span className="tone warn">{p} pending</span> : <span className="muted">—</span>}</td>
                    <td className="right">
                      {a.id === astronaut.id ? <span className="muted small">Current profile</span> : (
                        <button className="btn btn-link sm" onClick={() => { update({ astronautId: a.id }); notify(`Now viewing as ${a.name}.`); }}>View as {a.name.split(" ")[0]}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="split">
        <section aria-labelledby="notes-h">
          <div className="section-head"><h2 id="notes-h" className="h2">Notifications</h2><span className="muted small">{notes.filter((n) => !n.acknowledged).length} pending</span></div>
          <p className="muted small policy">
            Policy v1.0: a notification is raised once per person or cabin, rule and scenario when a cabin CO₂ average exceeds
            the NASA reference, the career dose reference is reached, or reaction time is slower than baseline for 3 consecutive
            days together with reduced sleep (only for profiles that share status).
          </p>
          {notes.length === 0 ? (
            <p className="empty">No notifications in this scenario up to day {state.day}.</p>
          ) : (
            <ol className="timeline">
              {notes.map((n) => {
                const who = n.astronautId === CABIN_ID ? "Cabin environment" : astronauts.find((a) => a.id === n.astronautId)?.name;
                return (
                  <li key={n.id} className={n.acknowledged ? "done" : ""}>
                    <div className="timeline-body">
                      <strong>{n.title}</strong>
                      <span className="muted small">{who} · raised day {n.day} · {n.acknowledged ? "acknowledged" : "response pending"}</span>
                    </div>
                    <button
                      className="btn btn-secondary sm"
                      disabled={n.acknowledged}
                      onClick={() => { setState((s) => ({ ...s, notifications: s.notifications.map((x) => (x.id === n.id ? { ...x, acknowledged: true } : x)) })); notify("Acknowledged. The underlying finding stays until the readings change."); }}
                    >
                      {n.acknowledged ? <><Check size={14} aria-hidden="true" /> Acknowledged</> : "Acknowledge"}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        <section aria-labelledby="checkin-h">
          <h2 id="checkin-h" className="h2">Your check-in</h2>
          <p className="muted small">Shared with the crew as a status only. Recorded for {astronaut.name}, day {state.day}.</p>
          <div className="checkin-options" role="group" aria-label="Check-in status">
            {(Object.keys(CHECKIN) as (keyof typeof CHECKIN)[]).map((k) => (
              <button key={k} className="choice" aria-pressed={mine === k} onClick={() => record(k)}>{CHECKIN[k]}</button>
            ))}
          </div>
          <p className="muted small">No message leaves this device. Real crew communication follows mission procedures.</p>
        </section>
      </div>
    </>
  );
}
