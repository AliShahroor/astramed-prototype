import { useState } from "react";
import { astronauts } from "../data/catalog";
import { CABIN_ID } from "../app/useMission";
import { Dialog } from "../components/Dialog";
import { useWs } from "./context";
import {
  checkinKey,
  crewEvents,
  crewSummary,
  lastCheckin,
  recordedTime,
  sharedStatus,
  visibleNotifications,
} from "./crewOperations";

export function Crew() {
  const { state, setState, astronaut, mission, notify, environment, open } =
    useWs();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [archive, setArchive] = useState(false);
  const [request, setRequest] = useState<"routine" | "check-in" | "support">(
    "routine",
  );
  const summary = crewSummary(state, mission.crewFindings);
  const notes = visibleNotifications(state);
  const displayed = notes.filter((n) => archive || !n.dismissedAt);
  const selected = astronauts.find((a) => a.id === selectedId);
  const current = state.checkins[checkinKey(state, astronaut.id)];
  const cabin = mission.crewFindings[astronauts[0].id].find(
    (f) => f.indicator === "co2",
  )!;
  const events = crewEvents(state).slice(0, 8);
  const days = Array.from(
    { length: Math.min(7, state.day) },
    (_, i) => state.day - Math.min(7, state.day) + i + 1,
  );
  const status = (id: string) =>
    sharedStatus(
      astronauts.find((a) => a.id === id)!,
      mission.crewFindings[id],
    );
  const tone = (text: string) =>
    text === "Alert"
      ? "danger"
      : text === "Review"
        ? "warn"
        : text === "No flag"
          ? "ok"
          : "muted";
  const pending = (id: string) =>
    notes.filter((n) => n.astronautId === id && !n.acknowledged);
  const attention = (id: string) => {
    const checkin = lastCheckin(state, id);
    if (checkin?.day === state.day && checkin.request !== "routine")
      return checkin.request === "support"
        ? "Support requested"
        : "Follow-up requested";
    return pending(id).length ? "Check-in requested" : "None recorded";
  };
  const record = () => {
    setState((s) => ({
      ...s,
      checkins: {
        ...s.checkins,
        [checkinKey(s, s.astronautId)]: new Date().toISOString(),
      },
      checkinRequests: {
        ...s.checkinRequests,
        [checkinKey(s, s.astronautId)]: request,
      },
    }));
    notify(
      `Check-in recorded for ${astronaut.name}, mission day ${state.day}.`,
    );
  };
  const focusCheckin = () => {
    setSelectedId(null);
    setTimeout(() => document.getElementById("checkin-request")?.focus(), 0);
  };
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Ares I · Mission day {state.day}</p>
          <h1 className="h1">Crew Health &amp; Operations</h1>
          <p className="page-sub">
            Shared findings, check-ins and coordination across the crew.
          </p>
        </div>
        <button className="btn btn-primary" onClick={focusCheckin}>
          Record my check-in
        </button>
      </div>
      <dl className="stat-row crew-summary" aria-label="Crew overview">
        <div>
          <dt>Crew members</dt>
          <dd>
            {summary.total}
            <small>Fictional profiles</small>
          </dd>
        </div>
        <div>
          <dt>Requiring review</dt>
          <dd className={summary.review ? "warn" : ""}>
            {summary.review}
            <small>Shared personal status</small>
          </dd>
        </div>
        <div>
          <dt>Pending check-ins</dt>
          <dd>
            {summary.pending}
            <small>For mission day {state.day}</small>
          </dd>
        </div>
        <div>
          <dt>Unacknowledged</dt>
          <dd className={summary.unread ? "warn" : ""}>
            {summary.unread}
            <small>Monitoring notifications</small>
          </dd>
        </div>
      </dl>
      <section aria-labelledby="roster-h">
        <div className="section-head">
          <h2 id="roster-h" className="h2">
            Crew roster
          </h2>
          <span className="muted small">
            Shared status · 14-day observation window
          </span>
        </div>
        <div className="table-wrap" role="region" aria-label="Crew roster">
          <table className="roster">
            <thead>
              <tr>
                <th scope="col">Crew member / role</th>
                <th scope="col">Shared status</th>
                <th scope="col">Last check-in</th>
                <th scope="col">Attention request</th>
                <th scope="col">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {astronauts.map((a) => {
                const last = lastCheckin(state, a.id);
                const shared = status(a.id);
                return (
                  <tr key={a.id}>
                    <th scope="row">
                      <span className="who">
                        <span className="avatar" aria-hidden="true">
                          {a.initials}
                        </span>
                        <span>
                          {a.name}
                          {a.id === astronaut.id && (
                            <em className="you"> · you</em>
                          )}
                          <small>{a.role}</small>
                        </span>
                      </span>
                    </th>
                    <td data-label="Shared status">
                      <span className={`tone ${tone(shared)}`}>
                        <span className="dot" aria-hidden="true" />
                        {shared}
                      </span>
                    </td>
                    <td data-label="Last check-in">
                      {last ? `Day ${last.day}` : "Not recorded"}
                      <small className="muted block">
                        {last?.day === state.day
                          ? "Complete for today"
                          : "Pending today"}
                      </small>
                    </td>
                    <td data-label="Attention request">{attention(a.id)}</td>
                    <td className="right">
                      <button
                        className="btn btn-quiet sm"
                        aria-label={`Review ${a.name}`}
                        onClick={() => setSelectedId(a.id)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="section-note">
          Limited sharing hides personal findings and activity details. This
          public demo uses fictional profiles with no authenticated access.
        </p>
      </section>
      <div
        className={`cabin-strip ${cabin.status === "Alert" ? "has-alert" : ""}`}
      >
        <span>
          <strong>Cabin environment</strong>
          <span className="muted">
            {environment.name} · day {state.day} · shared one-hour CO₂ average
          </span>
        </span>
        <span className={`tone ${cabin.status === "Alert" ? "warn" : "ok"}`}>
          {cabin.status === "Alert"
            ? "Reference exceeded"
            : cabin.status === "Insufficient data"
              ? "Insufficient data"
              : "No reference exceedance"}
        </span>
        <button
          className="btn btn-link"
          onClick={() => open({ type: "finding", indicator: "co2" })}
        >
          Review cabin finding
        </button>
      </div>
      <div className="operations-grid">
        <section aria-labelledby="notifications-h">
          <div className="section-head">
            <h2 id="notifications-h" tabIndex={-1} className="h2">
              Attention &amp; notifications{" "}
              <span className="count">{summary.unread}</span>
            </h2>
            <label className="check small">
              <input
                type="checkbox"
                checked={archive}
                onChange={(e) => setArchive(e.target.checked)}
              />
              Include dismissed
            </label>
          </div>
          {displayed.length === 0 ? (
            <p className="empty">
              No notifications to review for this scenario and mission day.
            </p>
          ) : (
            <ol className="notifications">
              {displayed.map((n) => {
                const who =
                  n.astronautId === CABIN_ID
                    ? "Cabin environment"
                    : astronauts.find((a) => a.id === n.astronautId)?.name;
                return (
                  <li
                    key={n.id}
                    className={`notification ${n.acknowledged ? "acknowledged" : ""}`}
                  >
                    <div className="notification-meta">
                      <strong>{who}</strong>
                      <span
                        className={`tone ${n.acknowledged ? "muted" : "warn"}`}
                      >
                        {n.dismissedAt
                          ? "Dismissed"
                          : n.acknowledged
                            ? "Acknowledged"
                            : "Awaiting acknowledgement"}
                      </span>
                    </div>
                    <h3 className="h3">{n.title}</h3>
                    <p className="muted small">
                      {n.astronautId === CABIN_ID
                        ? "Shared habitat reference comparison."
                        : "Shared monitoring policy requested a crew follow-up; private readings are omitted."}{" "}
                      First recorded for mission day {n.day}.
                    </p>
                    <time className="small muted" dateTime={n.timestamp}>
                      Recorded {recordedTime(n.timestamp)}
                    </time>
                    <div className="actions">
                      <button
                        className="btn btn-secondary sm"
                        disabled={n.acknowledged}
                        onClick={() => {
                          setState((s) => ({
                            ...s,
                            notifications: s.notifications.map((x) =>
                              x.id === n.id
                                ? {
                                    ...x,
                                    acknowledged: true,
                                    acknowledgedAt: new Date().toISOString(),
                                    acknowledgedDay: s.day,
                                  }
                                : x,
                            ),
                          }));
                          notify(
                            "Notification acknowledged. The measurement finding is unchanged.",
                          );
                        }}
                      >
                        {n.acknowledged ? "Acknowledged" : "Acknowledge"}
                      </button>
                      <button
                        className="btn btn-quiet sm"
                        onClick={() =>
                          n.astronautId === CABIN_ID
                            ? open({ type: "finding", indicator: "co2" })
                            : setSelectedId(n.astronautId)
                        }
                      >
                        Review context
                      </button>
                      {n.astronautId === astronaut.id && (
                        <button
                          className="btn btn-link sm"
                          onClick={focusCheckin}
                        >
                          Record check-in
                        </button>
                      )}
                      {n.acknowledged && !n.dismissedAt && (
                        <button
                          className="btn btn-link sm"
                          onClick={() =>
                            setState((s) => ({
                              ...s,
                              notifications: s.notifications.map((x) =>
                                x.id === n.id
                                  ? {
                                      ...x,
                                      dismissedAt: new Date().toISOString(),
                                    }
                                  : x,
                              ),
                            }))
                          }
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <details className="policy">
            <summary>Notification policy</summary>
            <p>
              One notification per person or cabin, rule and scenario until
              reset. Personal notification: three consecutive days of slower
              responses with reduced sleep, or a career dose reference
              exceedance, for profiles sharing status. Cabin notification: fresh
              one-hour CO₂ average above the pinned NASA reference.
              Acknowledgement records review; it does not clear a finding.
            </p>
          </details>
        </section>
        <aside className="checkin-panel" aria-labelledby="checkin-h">
          <p className="eyebrow">Selected profile · Day {state.day}</p>
          <h2 id="checkin-h" className="h2">
            Your check-in
          </h2>
          <p>
            {astronaut.name}
            <span className="muted block small">
              {current
                ? "Recorded today. You can update your request."
                : "No check-in recorded today."}
            </span>
          </p>
          <label className="field-label" htmlFor="checkin-request">
            Coordination request
          </label>
          <select
            className="field"
            id="checkin-request"
            value={request}
            onChange={(e) => setRequest(e.target.value as typeof request)}
          >
            <option value="routine">Routine check-in</option>
            <option value="check-in">Request a follow-up</option>
            <option value="support">Request support</option>
          </select>
          <button className="btn btn-primary" onClick={record}>
            {current ? "Update my check-in" : "Save my check-in"}
          </button>
          <p className="small muted">
            Recorded locally and visible in this demo’s roster. No message is
            sent to another person.
          </p>
        </aside>
      </div>
      <div className="operations-grid bottom-grid">
        <section aria-labelledby="coverage-h">
          <div className="section-head">
            <h2 className="h2" id="coverage-h">
              Check-in coverage
            </h2>
            <span className="muted small">Last {days.length} mission days</span>
          </div>
          <table className="coverage">
            <caption className="sr-only">
              Recorded check-ins by crew member and mission day; a check mark
              indicates a saved check-in.
            </caption>
            <thead>
              <tr>
                <th scope="col">Crew</th>
                {days.map((d) => (
                  <th scope="col" key={d}>
                    D{d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {astronauts.map((a) => (
                <tr key={a.id}>
                  <th scope="row">{a.name.split(" ")[0]}</th>
                  {days.map((d) => {
                    const recorded =
                      !!state.checkins[checkinKey({ ...state, day: d }, a.id)];
                    return (
                      <td key={d}>
                        <span
                          className={`coverage-mark ${recorded ? "recorded" : ""}`}
                          aria-label={recorded ? "Recorded" : "Not recorded"}
                        >
                          {recorded ? "✓" : "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="section-note">
            Only saved check-ins are shown. Empty cells are unrecorded, not a
            health assessment.
          </p>
        </section>
        <section aria-labelledby="activity-h">
          <div className="section-head">
            <h2 className="h2" id="activity-h">
              Recent crew activity
            </h2>
          </div>
          {events.length ? (
            <ol className="event-list">
              {events.map((e) => (
                <li key={e.id}>
                  <span className="event-dot" aria-hidden="true" />
                  <div>
                    <strong>{e.title}</strong>
                    <span className="muted small block">
                      {e.astronautId === CABIN_ID
                        ? "Cabin environment"
                        : astronauts.find((a) => a.id === e.astronautId)
                            ?.name}{" "}
                      · Mission day {e.day}
                    </span>
                    <span className="muted small">
                      {recordedTime(e.timestamp)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty">No saved activity for this scenario yet.</p>
          )}
        </section>
      </div>
      {selected && (
        <Dialog
          title={`${selected.name} · Crew detail`}
          onClose={() => setSelectedId(null)}
        >
          <div className="detail-person">
            <span className="avatar lg">{selected.initials}</span>
            <div>
              <h3 className="h2">{selected.name}</h3>
              <p className="muted">{selected.role}</p>
            </div>
          </div>
          <dl className="qa">
            <div>
              <dt>Shared status</dt>
              <dd>{status(selected.id)}</dd>
            </div>
            <div>
              <dt>Last check-in</dt>
              <dd>
                {lastCheckin(state, selected.id)
                  ? `Day ${lastCheckin(state, selected.id)!.day} · ${recordedTime(lastCheckin(state, selected.id)!.timestamp)}`
                  : "No recorded check-in"}
              </dd>
            </div>
            <div>
              <dt>Attention request</dt>
              <dd>{attention(selected.id)}</dd>
            </div>
            <div>
              <dt>Relevant notifications</dt>
              <dd>
                {selected.share
                  ? notes
                      .filter((n) => n.astronautId === selected.id)
                      .map(
                        (n) =>
                          `${n.title} (${n.acknowledged ? "acknowledged" : "pending"})`,
                      )
                      .join("; ") || "None recorded"
                  : "Personal monitoring status is not shared."}
              </dd>
            </div>
          </dl>
          <p className="section-note">
            Personal readings are available only through the selected profile’s
            My Health view in this demonstration.
          </p>
          {selected.id === astronaut.id && (
            <button className="btn btn-primary" onClick={focusCheckin}>
              Record my check-in
            </button>
          )}
        </Dialog>
      )}
    </>
  );
}
