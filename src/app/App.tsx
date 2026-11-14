import { useEffect, useMemo, useState } from "react";
import {
  Activity as ActivityIcon,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Download,
  Globe2,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  activities,
  astronauts,
  environments,
  hazardContext,
  hazards,
  metricFor,
  metrics,
  scenarios,
} from "../data/catalog";
import { evidence, evidenceFor } from "../data/evidence";
import {
  dayTimestamp,
  evaluate,
  evaluateAll,
  selectSeries,
  validateReading,
} from "../engine/monitoring";
import { useMission } from "./useMission";
import { Dialog } from "../components/Dialog";
import { TrendChart } from "../components/TrendChart";
import { Assessment } from "../components/Assessment";
import type {
  Activity,
  AssessmentResult,
  Finding,
  Hazard,
  Indicator,
  Measurement,
  Scenario,
  Status,
} from "../types";
type Page = "My Health" | "Crew" | "Countermeasures";
type Modal =
  | { type: "finding"; indicator: Indicator }
  | { type: "evidence"; id: string }
  | { type: "log" }
  | { type: "settings" }
  | { type: "activity"; activity: Activity }
  | null;
function Badge({ status }: { status: Status }) {
  return (
    <span className={`badge ${status.toLowerCase().replace(" ", "-")}`}>
      <span />
      {status === "Review" ? "Review / caution" : status}
    </span>
  );
}
export default function App() {
  const { state, setState, rows, crewFindings, storageError, mission } =
    useMission();
  const [page, setPage] = useState<Page>("My Health");
  const [tab, setTab] = useState("Physical");
  const [range, setRange] = useState(14);
  const [indicator, setIndicator] = useState<Indicator>("reaction");
  const [hazard, setHazard] = useState<Hazard>("All hazards");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);
  const astronaut = astronauts.find((a) => a.id === state.astronautId)!;
  const environment = environments.find((e) => e.id === state.environmentId)!;
  const findings = useMemo(
    () => evaluateAll(astronaut, rows, state.scenario, state.day, range),
    [astronaut, rows, state.scenario, state.day, range],
  );
  const active = findings.filter(
    (f) => f.status === "Review" || f.status === "Alert",
  );
  const important =
    active[0] ?? findings.find((f) => f.indicator === "reaction")!;
  const selected = findings.find((f) => f.indicator === indicator)!;
  const trend = selectSeries(
    rows,
    astronaut.id,
    state.scenario,
    indicator,
    state.day,
    range,
  );
  const filteredMetrics = metrics.filter(
    (m) => hazard === "All hazards" || m.hazards.includes(hazard),
  );
  const notifications = state.notifications.filter(
    (n) => n.scenario === state.scenario && n.day <= state.day,
  );
  const pending = notifications.filter((n) => !n.acknowledged);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.ready.then(() => setOfflineReady(true));
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const update = (patch: Partial<typeof state>) =>
    setState((s) => ({ ...s, ...patch }));
  const speak = (finding: Finding) => {
    if (!("speechSynthesis" in window)) {
      setToast("Speech synthesis is unavailable in this browser.");
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(
      `${finding.status}. ${finding.title}. ${finding.summary} ${finding.next}`,
    );
    u.rate = 0.95;
    speechSynthesis.speak(u);
  };
  const assess = () => {
    setModal(null);
    setPage("Countermeasures");
    setTab("Cognitive");
  };
  const selectHazard = (h: Hazard) => {
    setHazard(h);
    const available = metrics.filter(
      (m) => h === "All hazards" || m.hazards.includes(h),
    );
    if (!available.some((m) => m.id === indicator))
      setIndicator(available[0].id);
  };
  const saveAssessment = (result: AssessmentResult) => {
    const reading: Measurement = {
      id: result.id,
      astronautId: astronaut.id,
      scenario: state.scenario,
      indicator: "reaction",
      unit: "ms",
      value: Number(result.median.toFixed(1)),
      day: state.day,
      timestamp: new Date(
        Date.parse(dayTimestamp(state.day, 13)) +
          state.assessments.length * 1000,
      ).toISOString(),
      source: "Browser assessment",
      quality: "browser_timed",
    };
    setState((s) => ({
      ...s,
      readings: [...s.readings, reading],
      assessments: [...s.assessments, result],
    }));
    setToast("Assessment saved. Your health finding has been recalculated.");
    if (state.voice)
      speak(
        evaluate(
          astronaut,
          [...rows, reading],
          state.scenario,
          "reaction",
          state.day,
          range,
        ),
      );
  };
  const navigate = (p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0 });
  };
  const reset = () => {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    setState((s) => ({
      ...s,
      astronautId: "alex",
      scenario: "fatigue",
      day: 94,
      environmentId: "mars",
      readings: [],
      assessments: [],
      completions: [],
      notifications: [],
      checkins: {},
      voice: false,
    }));
    setPage("My Health");
    setHazard("All hazards");
    setIndicator("reaction");
    setModal(null);
    setToast("Demo reset to Alex · mission day 94.");
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("My Health");
          }}
        >
          <span className="brand-mark">
            <HeartPulse size={26} />
          </span>
          <span>
            ASTRAMED<small>Mission health intelligence</small>
          </span>
        </a>
        <div className="nav-label">Workspace</div>
        <nav aria-label="Primary navigation">
          {(
            [
              { name: "My Health", icon: LayoutDashboard },
              { name: "Crew", icon: Users },
              { name: "Countermeasures", icon: ActivityIcon },
            ] as const
          ).map((n) => (
            <button
              key={n.name}
              aria-label={n.name}
              className={page === n.name ? "nav-item active" : "nav-item"}
              onClick={() => navigate(n.name)}
              aria-current={page === n.name ? "page" : undefined}
            >
              <n.icon size={18} />
              {n.name}
              {n.name === "Crew" && pending.length > 0 && (
                <span className="nav-count">{pending.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="mission-block">
          <div className="eyebrow">Mission context</div>
          <div className="mission-name">
            <span className="mission-emblem">
              A<span>Ⅰ</span>
            </span>
            <div>
              {mission.name}
              <small>Long-duration exploration</small>
            </div>
          </div>
          <div
            className="mission-route"
            aria-label="Illustrative Earth to Mars transit"
          >
            <span className="earth-dot" />
            <span className="route-line" />
            <span className="craft-dot">◆</span>
            <span className="route-line dashed" />
            <span className="mars-dot" />
          </div>
          <div className="route-labels">
            <span>Earth</span>
            <span>Mars</span>
          </div>
          <p>
            Mission day <strong>{String(state.day).padStart(3, "0")}</strong>
          </p>
          <div className="small muted">Fictional mission · synthetic crew</div>
        </div>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => setModal({ type: "evidence", id: "hazards" })}
          >
            <BookOpen size={17} />
            Evidence library
          </button>
          <button
            className="nav-item"
            onClick={() => setModal({ type: "settings" })}
          >
            <SlidersHorizontal size={17} />
            Demo & preferences
          </button>
          <div className="connection">
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>
              {offlineReady
                ? "Offline cache ready"
                : online
                  ? "Local application"
                  : "Offline · cache not confirmed"}
            </span>
          </div>
          <div className="team-credit">
            TEAM CODE BLUE <span>Prototype 1.0</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Ares I <ChevronRight size={13} />
            <span>{page}</span>
          </div>
          <div className="top-controls">
            <label className="environment-select">
              <Globe2 size={16} />
              <span className="sr-only">Environment</span>
              <select
                aria-label="Environment"
                value={state.environmentId}
                onChange={(e) => {
                  update({ environmentId: e.target.value });
                  setToast(
                    "Context updated. Physiological rules and historical readings are unchanged.",
                  );
                }}
              >
                {environments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="icon-button notification-button"
              aria-label={`Crew notifications, ${pending.length} pending`}
              onClick={() => navigate("Crew")}
            >
              <Bell size={19} />
              {pending.length > 0 && <i />}
            </button>
            <span className="top-divider" />
            <span className="avatar small">{astronaut.initials}</span>
            <select
              className="astronaut-select"
              aria-label="Current astronaut"
              value={state.astronautId}
              onChange={(e) => {
                update({ astronautId: e.target.value });
                setToast(
                  "Astronaut changed. Any unfinished assessment has been reset.",
                );
              }}
            >
              {astronauts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </header>
        <main id="main">
          <div className="page-title">
            <div>
              <div className="eyebrow">
                Crew health /{" "}
                {page === "My Health"
                  ? "Personal overview"
                  : page === "Crew"
                    ? "Shared awareness"
                    : "Daily practice"}
              </div>
              <h1>
                {page === "My Health"
                  ? "Your health, in context."
                  : page === "Crew"
                    ? "Looking out for each other."
                    : "Small actions. Mission readiness."}
              </h1>
              <p className="muted">
                {page === "My Health"
                  ? `Welcome, ${astronaut.name.split(" ")[0]}. Here’s what your latest measurements show.`
                  : page === "Crew"
                    ? "A shared view of crew check-ins, with personal health details kept separate."
                    : "Review your routine, check your responses, and keep a record of your progress."}
              </p>
            </div>
            {page === "My Health" ? (
              <button
                key="log-reading"
                className="primary"
                onClick={() => setModal({ type: "log" })}
              >
                <Plus size={16} />
                Log reading
              </button>
            ) : (
              <button
                key="scientific-context"
                className="secondary"
                onClick={() =>
                  setModal({
                    type: "evidence",
                    id: page === "Crew" ? "hazards" : "exercise",
                  })
                }
              >
                <BookOpen size={16} />
                Scientific context
              </button>
            )}
          </div>
          <section className="context-strip" aria-label="Simulation controls">
            <span className="simulation-tag">
              <span />
              Simulated mission
            </span>
            <label>
              Demo scenario
              <select
                aria-label="Demo scenario"
                value={state.scenario}
                onChange={(e) => {
                  update({ scenario: e.target.value as Scenario });
                  setToast(
                    "Scenario data loaded. Findings and crew statuses recalculated.",
                  );
                }}
              >
                {Object.entries(scenarios).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mission day
              <select
                aria-label="Mission day"
                value={state.day}
                onChange={(e) => update({ day: Number(e.target.value) })}
              >
                {Array.from({ length: 94 }, (_, i) => i + 1)
                  .reverse()
                  .map((d) => (
                    <option key={d} value={d}>
                      Day {String(d).padStart(3, "0")}
                    </option>
                  ))}
              </select>
            </label>
            <span className="context-meta">
              {environment.gravity}
              <span>·</span>
              {environment.delay}
            </span>
          </section>
          {storageError && (
            <p className="error" role="alert">
              Browser storage is unavailable or full. Changes remain in memory;
              export a record before closing.
            </p>
          )}
          {page === "My Health" && (
            <>
              <div className="section-heading overview-heading">
                <h2>At a glance</h2>
                <span className="small muted">
                  Mission record · {dayTimestamp(state.day).slice(0, 10)} ·
                  08:00 UTC seed
                </span>
              </div>
              <section className="summary-strip" aria-label="Key measurements">
                {(["reaction", "sleep", "heart"] as Indicator[]).map((id) => {
                  const f = findings.find((f) => f.indicator === id)!,
                    m = metricFor(id);
                  return (
                    <button
                      key={id}
                      className={
                        indicator === id
                          ? "summary-metric selected"
                          : "summary-metric"
                      }
                      onClick={() => {
                        setHazard("All hazards");
                        setIndicator(id);
                      }}
                    >
                      <div className="metric-label">
                        {id === "reaction" ? (
                          <Target size={16} />
                        ) : id === "sleep" ? (
                          <CircleHelp size={16} />
                        ) : (
                          <HeartPulse size={16} />
                        )}{" "}
                        {m.short}
                        <span
                          className={
                            f.status === "Review"
                              ? "status-dot amber"
                              : "status-dot"
                          }
                        />
                      </div>
                      <div className="metric-reading">
                        {f.current?.value.toFixed(m.decimals) ?? "—"} {m.unit}
                      </div>
                      <div
                        className={`metric-delta ${f.status === "Review" ? "amber" : ""}`}
                      >
                        {(f.change ?? 0) >= 0 ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDownRight size={14} />
                        )}{" "}
                        {f.change === null
                          ? "No baseline"
                          : `${Math.abs(f.change).toFixed(1)}% ${(f.change ?? 0) >= 0 ? "above" : "below"} baseline`}
                        <span className="muted">
                          {f.baseline} {m.unit}
                        </span>
                      </div>
                    </button>
                  );
                })}
                <div className="summary-status">
                  <ShieldCheck size={20} />
                  <strong>
                    {active.length
                      ? `${active.length} observations to review`
                      : "No prototype flags"}
                  </strong>
                  <span className="small muted">
                    {active.some((f) => f.status === "Alert")
                      ? "A reference exceedance needs verification."
                      : "Personal trends, not a health score."}
                  </span>
                </div>
              </section>
              <div className="health-layout">
                <section className="trend-section">
                  <div className="section-heading">
                    <div>
                      <h2>Health trends</h2>
                      <p className="small muted">
                        The change matters. So does the comparison.
                      </p>
                    </div>
                    <div
                      className="range-control"
                      aria-label="Chart time range"
                    >
                      {[7, 14, 30, 94].map((n) => (
                        <button
                          key={n}
                          aria-pressed={range === n}
                          className={range === n ? "active" : ""}
                          onClick={() => setRange(n)}
                        >
                          {n === 94 ? "Mission" : `${n}d`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="hazard-controls">
                    <label>
                      <span className="small muted">NASA hazard lens</span>
                      <select
                        aria-label="NASA hazard lens"
                        value={hazard}
                        onChange={(e) => selectHazard(e.target.value as Hazard)}
                      >
                        {hazards.map((h) => (
                          <option key={h}>{h}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="icon-button"
                      aria-label="About the five hazards"
                      onClick={() =>
                        setModal({ type: "evidence", id: "hazards" })
                      }
                    >
                      <CircleHelp size={16} />
                    </button>
                  </div>
                  <p className="hazard-context small">
                    {hazardContext[hazard]}
                  </p>
                  <div
                    className="indicator-tabs"
                    role="group"
                    aria-label="Health indicator"
                  >
                    {filteredMetrics.map((m) => (
                      <button
                        key={m.id}
                        className={indicator === m.id ? "active" : ""}
                        aria-pressed={indicator === m.id}
                        onClick={() => setIndicator(m.id)}
                      >
                        {m.short}
                      </button>
                    ))}
                  </div>
                  <div className="trend-title">
                    <h3>{metricFor(indicator).label}</h3>
                    <Badge status={selected.status} />
                  </div>
                  <TrendChart
                    key={indicator}
                    rows={trend}
                    indicator={indicator}
                    baseline={astronaut.baseline[indicator].value}
                  />
                </section>
                <aside
                  className={`finding-panel ${important.status === "Alert" ? "alert-panel" : ""}`}
                >
                  <div className="finding-kicker">
                    <Sparkles size={16} />
                    <span>Explainable health finding</span>
                  </div>
                  <Badge status={important.status} />
                  <h2>{important.title}</h2>
                  <p>{important.summary}</p>
                  <div className="finding-comparison">
                    <div>
                      <span>Current</span>
                      <strong>
                        {important.current?.value}{" "}
                        {metricFor(important.indicator).unit}
                      </strong>
                    </div>
                    <ArrowRight size={16} />
                    <div>
                      <span>
                        {important.indicator === "co2"
                          ? "NASA reference"
                          : "Personal baseline"}
                      </span>
                      <strong>
                        {important.indicator === "co2" ? 3 : important.baseline}{" "}
                        {metricFor(important.indicator).unit}
                      </strong>
                    </div>
                  </div>
                  <p className="muted small">
                    Open the reasoning for persistence, context and uncertainty.
                  </p>
                  <div className="finding-next">
                    <span className="eyebrow">Suggested next check</span>
                    <p>
                      {important.indicator === "reaction"
                        ? "Repeat the assessment and review recent sleep."
                        : important.indicator === "co2"
                          ? "Verify the one-hour average and follow mission cabin procedures."
                          : "Review comparable measurements with your crew medical officer."}
                    </p>
                  </div>
                  <button
                    className="finding-open"
                    onClick={() =>
                      setModal({
                        type: "finding",
                        indicator: important.indicator,
                      })
                    }
                  >
                    Inspect reasoning <ArrowRight size={17} />
                  </button>
                  <button
                    className="text-button evidence-link"
                    onClick={() =>
                      setModal({
                        type: "evidence",
                        id: important.evidenceIds[0],
                      })
                    }
                  >
                    <BookOpen size={14} />
                    NASA evidence & limitations
                  </button>
                  <div className="small muted finding-foot">
                    {important.rule.origin} · Not a diagnosis
                  </div>
                </aside>
              </div>
              <section className="monitoring-section">
                <div className="section-heading">
                  <h2>Monitoring record</h2>
                  <span className="small muted">
                    {astronaut.name} · {filteredMetrics.length} indicators
                  </span>
                </div>
                <p className="horizontal-hint">
                  Scroll horizontally to inspect comparisons and findings.
                </p>
                <div
                  className="table-scroll"
                  tabIndex={0}
                  aria-label="Scrollable monitoring record"
                >
                  <table className="monitoring-table">
                    <thead>
                      <tr>
                        <th>Indicator</th>
                        <th>Latest reading</th>
                        <th>Comparison</th>
                        <th>Status</th>
                        <th>
                          <span className="sr-only">Inspect</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMetrics.map((m) => {
                        const f = findings.find((f) => f.indicator === m.id)!;
                        return (
                          <tr key={m.id}>
                            <td>
                              <strong>{m.label}</strong>
                              <small>{f.current?.source ?? "No data"}</small>
                            </td>
                            <td>
                              {f.current?.value} {m.unit}
                            </td>
                            <td>
                              {m.id === "co2"
                                ? "3 mmHg · one-hour reference"
                                : m.id === "radiation"
                                  ? `${(((f.current?.value ?? 0) / 600) * 100).toFixed(1)}% career reference used`
                                  : `${f.change === null ? "—" : `${f.change >= 0 ? "+" : ""}${f.change.toFixed(1)}%`} vs preflight`}
                            </td>
                            <td>
                              <Badge status={f.status} />
                            </td>
                            <td>
                              <button
                                className="icon-button"
                                aria-label={`Inspect ${m.label}`}
                                onClick={() =>
                                  setModal({ type: "finding", indicator: m.id })
                                }
                              >
                                <ChevronRight size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {page === "Crew" && (
            <>
              <div className="privacy-note">
                <ShieldCheck size={20} />
                <div>
                  <strong>Shared awareness, personal privacy.</strong>
                  <p className="small muted">
                    Only coarse status and check-ins appear here. Detailed
                    measurements stay in the personal workflow. Switching
                    identities is a demo control, not authenticated access.
                  </p>
                </div>
              </div>
              <section className="crew-grid">
                {astronauts.map((a) => {
                  const f = crewFindings[a.id].find(
                    (f) => f.status === "Alert" || f.status === "Review",
                  );
                  const ns = notifications.filter(
                    (n) => n.astronautId === a.id && !n.acknowledged,
                  );
                  const key = `${state.scenario}-${a.id}-${state.day}`;
                  return (
                    <article className="crew-member" key={a.id}>
                      <div className="crew-person">
                        <span className="avatar">{a.initials}</span>
                        <div>
                          <h2>{a.name}</h2>
                          <p className="muted small">{a.role}</p>
                        </div>
                        {a.id === astronaut.id && (
                          <span className="you-tag">You</span>
                        )}
                      </div>
                      {a.share || f?.indicator === "co2" ? (
                        <Badge status={f?.status ?? "Nominal"} />
                      ) : (
                        <span className="badge">Sharing limited</span>
                      )}
                      <p className="crew-status">
                        {ns.length
                          ? "A crew check-in is requested."
                          : state.checkins[key]
                            ? "Check-in recorded for this mission day."
                            : a.share
                              ? "No shared check-in request."
                              : "Personal health status is not shared."}
                      </p>
                      <div className="small muted">
                        Last check-in:{" "}
                        {state.checkins[key]
                          ? "Recorded locally · now"
                          : "Synthetic · day " + state.day + " at 07:30 UTC"}
                      </div>
                      {a.id === astronaut.id && (
                        <button
                          className="secondary"
                          onClick={() => {
                            setState((s) => ({
                              ...s,
                              checkins: {
                                ...s.checkins,
                                [key]: new Date().toISOString(),
                              },
                            }));
                            setToast(
                              "Your crew check-in was recorded locally.",
                            );
                          }}
                        >
                          <Check size={15} />
                          Record my check-in
                        </button>
                      )}
                    </article>
                  );
                })}
              </section>
              <section className="notification-section">
                <div className="section-heading">
                  <h2>Notification history</h2>
                  <span className="small muted">
                    Simulated in-app notifications · {pending.length} pending
                  </span>
                </div>
                <p className="small muted">
                  Policy: notify for a fresh cabin reference exceedance, a
                  career-dose exceedance, or ≥3 consecutive days of slower
                  responses together with reduced sleep. One notification per
                  person / rule / scenario until reset. Crew-level status uses a
                  fixed 14-day window.
                </p>
                {notifications.length === 0 ? (
                  <div className="empty-state">
                    <Check size={20} />
                    <p>No notifications in this scenario and mission period.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="notification-row">
                      <Bell size={18} />
                      <div>
                        <strong>{n.title}</strong>
                        <p className="small muted">
                          {n.findingId.endsWith("co2")
                            ? "Shared habitat"
                            : astronauts.find((a) => a.id === n.astronautId)
                                ?.name}{" "}
                          · First recorded day {n.day} ·{" "}
                          {n.acknowledged ? "Acknowledged" : "Response pending"}
                        </p>
                      </div>
                      <button
                        className="secondary"
                        disabled={n.acknowledged}
                        onClick={() => {
                          setState((s) => ({
                            ...s,
                            notifications: s.notifications.map((x) =>
                              x.id === n.id ? { ...x, acknowledged: true } : x,
                            ),
                          }));
                          setToast(
                            "Notification acknowledged. The underlying finding remains until readings change.",
                          );
                        }}
                      >
                        {n.acknowledged ? <Check size={15} /> : null}
                        {n.acknowledged ? "Acknowledged" : "Acknowledge"}
                      </button>
                    </div>
                  ))
                )}
              </section>
            </>
          )}
          {page === "Countermeasures" && (
            <>
              <div
                className="counter-tabs"
                role="group"
                aria-label="Countermeasure sections"
              >
                {["Physical", "Cognitive", "Progress"].map((t) => (
                  <button
                    key={t}
                    className={tab === t ? "active" : ""}
                    aria-pressed={tab === t}
                    onClick={() => setTab(t)}
                  >
                    {t === "Physical" ? (
                      <ActivityIcon size={16} />
                    ) : t === "Cognitive" ? (
                      <Target size={16} />
                    ) : (
                      <ListChecks size={16} />
                    )}{" "}
                    {t}
                  </button>
                ))}
              </div>
              {tab === "Physical" && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>Your daily practice</h2>
                      <p className="muted">
                        Illustrative activities. Follow the mission-approved
                        exercise plan.
                      </p>
                    </div>
                    <span className="small muted">
                      {environment.name} · {environment.gravity}
                    </span>
                  </div>
                  <div className="activity-list">
                    {activities.map((a, i) => {
                      const done = state.completions.some(
                        (c) =>
                          c.activityId === a.id &&
                          c.astronautId === astronaut.id &&
                          c.day === state.day &&
                          c.scenario === state.scenario,
                      );
                      return (
                        <article className="activity-row" key={a.id}>
                          <div className="activity-number">0{i + 1}</div>
                          <div>
                            <span className="eyebrow">
                              {a.category} · {a.duration}
                            </span>
                            <h3>{a.title}</h3>
                            <p className="muted">{a.description}</p>
                          </div>
                          <button
                            className="secondary"
                            onClick={() =>
                              setModal({ type: "activity", activity: a })
                            }
                          >
                            {done ? (
                              <>
                                <Check size={15} />
                                Completed
                              </>
                            ) : (
                              <>
                                Review activity
                                <ArrowRight size={15} />
                              </>
                            )}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                  <div className="cognitive-callout">
                    <Target size={24} />
                    <div>
                      <h3>Make your next check measurable.</h3>
                      <p className="muted">
                        A short reaction-response assessment records actual
                        browser timing.
                      </p>
                    </div>
                    <button
                      className="primary"
                      onClick={() => setTab("Cognitive")}
                    >
                      Start assessment
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              )}
              {tab === "Cognitive" && (
                <Assessment
                  key={`${astronaut.id}-${state.scenario}-${state.day}`}
                  astronaut={astronaut}
                  scenario={state.scenario}
                  day={state.day}
                  onSave={saveAssessment}
                />
              )}
              {tab === "Progress" && (
                <Progress
                  astronautId={astronaut.id}
                  day={state.day}
                  scenario={state.scenario}
                  completions={state.completions}
                  assessments={state.assessments}
                />
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <Radio size={13} />
              All astronaut records are synthetic or locally entered.
            </span>
            <span>Decision-support prototype · Not a medical device</span>
            <button
              className="text-button"
              onClick={() => setModal({ type: "settings" })}
            >
              About & reset
            </button>
          </footer>
        </main>
      </div>
      {modal?.type === "finding" && (
        <Dialog
          title="Explainable Health Card"
          wide
          onClose={() => setModal(null)}
        >
          <HealthCard
            finding={findings.find((f) => f.indicator === modal.indicator)!}
            environment={`${environment.name} · ${environment.priority}`}
            onEvidence={(id) => setModal({ type: "evidence", id })}
            onAssess={assess}
            onSpeak={state.voice ? speak : undefined}
          />
        </Dialog>
      )}
      {modal?.type === "evidence" && (
        <Dialog
          title="Scientific evidence library"
          wide
          onClose={() => setModal(null)}
        >
          <div className="evidence-tabs">
            {evidence.map((e) => (
              <button
                key={e.id}
                className={modal.id === e.id ? "active" : ""}
                onClick={() => setModal({ type: "evidence", id: e.id })}
              >
                {e.id === "measures"
                  ? "Standard Measures"
                  : e.id === "pvt"
                    ? "Vigilance"
                    : e.id === "co2"
                      ? "Cabin CO₂"
                      : e.id === "radiation"
                        ? "Radiation"
                        : e.id === "hazards"
                          ? "Hazards"
                          : "Exercise"}
              </button>
            ))}
          </div>
          <EvidenceDetail id={modal.id} />
        </Dialog>
      )}
      {modal?.type === "log" && (
        <Dialog title="Log a measurement" onClose={() => setModal(null)}>
          <LogReading
            day={state.day}
            onSave={(r) => {
              const reading: Measurement = {
                ...r,
                id: crypto.randomUUID(),
                astronautId: astronaut.id,
                scenario: state.scenario,
                day: state.day,
                source: "Manual entry",
                quality: "user_reported",
              };
              if (
                state.readings.some(
                  (x) =>
                    x.indicator === reading.indicator &&
                    x.astronautId === reading.astronautId &&
                    x.timestamp === reading.timestamp &&
                    x.scenario === reading.scenario,
                )
              ) {
                setToast(
                  "A reading already exists for that indicator and timestamp.",
                );
                return;
              }
              setState((s) => ({ ...s, readings: [...s.readings, reading] }));
              setIndicator(reading.indicator);
              setHazard("All hazards");
              setModal(null);
              setToast(
                "Reading saved locally. Trend and finding recalculated.",
              );
            }}
          />
        </Dialog>
      )}
      {modal?.type === "activity" && (
        <Dialog title={modal.activity.title} onClose={() => setModal(null)}>
          <p className="muted">{modal.activity.description}</p>
          <p className="notice">
            Demonstration only. This checklist is not an approved exercise
            protocol. Equipment and loading require a mission-specific plan.
          </p>
          <ol className="activity-steps">
            {modal.activity.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <button
            className="primary"
            disabled={state.completions.some(
              (c) =>
                c.activityId === modal.activity.id &&
                c.astronautId === astronaut.id &&
                c.day === state.day &&
                c.scenario === state.scenario,
            )}
            onClick={() => {
              const activityId = modal.activity.id;
              setState((s) => ({
                ...s,
                completions: [
                  ...s.completions,
                  {
                    astronautId: astronaut.id,
                    day: state.day,
                    scenario: state.scenario,
                    activityId,
                    timestamp: new Date().toISOString(),
                  },
                ],
              }));
              setToast("Simulated completion recorded in Progress.");
              setModal(null);
            }}
          >
            <Check size={16} />
            Record simulated completion
          </button>
        </Dialog>
      )}
      {modal?.type === "settings" && (
        <Dialog title="Demo & preferences" onClose={() => setModal(null)}>
          <p>
            ASTRAMED is an unvalidated Team Code Blue prototype for astronaut
            health monitoring. No real astronaut records, device connection,
            diagnosis or remote emergency service is included.
          </p>
          <div className="settings-row">
            <div>
              <strong>Spoken notifications</strong>
              <p className="small muted">
                Optional browser voice. May require connectivity; not tested
                offline.
              </p>
            </div>
            <button
              className="secondary"
              aria-pressed={state.voice}
              onClick={() => {
                if (!("speechSynthesis" in window)) {
                  setToast("Speech synthesis is unavailable.");
                  return;
                }
                update({ voice: !state.voice });
                if (state.voice) speechSynthesis.cancel();
              }}
            >
              {state.voice ? <Volume2 size={17} /> : <VolumeX size={17} />}{" "}
              {state.voice ? "Enabled" : "Disabled"}
            </button>
          </div>
          <div className="button-row">
            <button
              className="secondary"
              disabled={!state.voice}
              onClick={() => speak(important)}
            >
              <Volume2 size={15} />
              Replay current finding
            </button>
            <button
              className="secondary"
              onClick={() => {
                if ("speechSynthesis" in window) speechSynthesis.cancel();
                setToast("Speech stopped.");
              }}
            >
              Stop speaking
            </button>
          </div>
          <p className="small muted">
            Voice uses the same calculated finding as the visual interface.
            Enablement permits playback after saving an assessment; no
            repetitive automatic alerts.
          </p>
          <div className="settings-row">
            <div>
              <strong>Offline application</strong>
              <p className="small muted">
                {offlineReady
                  ? "Production shell and local evidence are cached."
                  : "Offline caching is registered in production builds only."}{" "}
                Original NASA links need internet.
              </p>
            </div>
            {offlineReady ? <WifiOff size={20} /> : <Wifi size={20} />}
          </div>
          <div className="settings-row">
            <div>
              <strong>Export local records</strong>
              <p className="small muted">
                Download entered readings, assessments and progress as JSON.
              </p>
            </div>
            <button
              className="secondary"
              onClick={() => {
                const blob = new Blob([JSON.stringify(state, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "astramed-demo-records.json";
                a.click();
                URL.revokeObjectURL(url);
                setToast("Local records exported.");
              }}
            >
              <Download size={16} />
              Export
            </button>
          </div>
          <div className="settings-row">
            <div>
              <strong>Reset demonstration</strong>
              <p className="small muted">
                Clears all locally recorded readings, results, check-ins and
                progress.
              </p>
            </div>
            <button className="secondary" onClick={reset}>
              <RefreshCw size={15} />
              Reset demo
            </button>
          </div>
          <details>
            <summary>Transparency & provenance</summary>
            <p className="small muted">
              Synthetic history is deterministic. Seeded preflight values are
              not clinical reference intervals. Code and documentation were
              generated with AI assistance and require independent review. No
              NASA endorsement is implied. Environment selection changes
              context, not limits. NASA experimental datasets are not
              incorporated; OSDR was investigated but no matching personal
              monitoring dataset was selected.
            </p>
          </details>
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button
            className="text-button"
            onClick={() => setToast("")}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
function HealthCard({
  finding: f,
  environment,
  onEvidence,
  onAssess,
  onSpeak,
}: {
  finding: Finding;
  environment: string;
  onEvidence: (id: string) => void;
  onAssess: () => void;
  onSpeak?: (f: Finding) => void;
}) {
  const m = metricFor(f.indicator);
  return (
    <div className="health-card-detail">
      <Badge status={f.status} />
      <h3>{f.title}</h3>
      <p>{f.summary}</p>
      <div className="detail-stats">
        <div>
          <span>Observed</span>
          <strong>
            {f.current?.value ?? "—"} {m.unit}
          </strong>
        </div>
        <div>
          <span>
            {f.indicator === "co2"
              ? "NASA habitat reference"
              : f.indicator === "radiation"
                ? "NASA career reference"
                : "Personal baseline"}
          </span>
          <strong>
            {f.indicator === "co2"
              ? 3
              : f.indicator === "radiation"
                ? 600
                : f.baseline}{" "}
            {m.unit}
          </strong>
        </div>
        <div>
          <span>Window</span>
          <strong>{f.window}</strong>
        </div>
      </div>
      <dl className="reasoning">
        <div>
          <dt>What changed?</dt>
          <dd>
            {f.summary}{" "}
            {f.indicator === "co2" && f.current
              ? `${(f.current.value - 3).toFixed(1)} mmHg difference from the one-hour reference.`
              : ""}
          </dd>
        </div>
        <div>
          <dt>Why was this flagged?</dt>
          <dd>
            {f.rule.criterion}
            <br />
            {f.observations} observed days; {f.persistence} consecutive days
            meeting the personal-deviation rule within this window.
          </dd>
        </div>
        <div>
          <dt>Why might it matter?</dt>
          <dd>{f.explanation}</dd>
        </div>
        <div>
          <dt>Mission context</dt>
          <dd>
            {environment}. Environment changes do not change physiological
            limits.
          </dd>
        </div>
        <div>
          <dt>What should happen next?</dt>
          <dd>{f.next}</dd>
        </div>
        <div>
          <dt>Limits & uncertainty</dt>
          <dd>
            {f.uncertainty} {m.note}
          </dd>
        </div>
      </dl>
      <div className="source-links">
        {f.evidenceIds.map((id) => (
          <button className="secondary" key={id} onClick={() => onEvidence(id)}>
            <BookOpen size={15} />
            {evidenceFor(id).title}
            <ArrowRight size={14} />
          </button>
        ))}
      </div>
      <div className="button-row">
        {f.indicator === "reaction" && (
          <button className="primary" onClick={onAssess}>
            <Target size={16} />
            Run reaction-time assessment
          </button>
        )}
        {onSpeak && (
          <button className="secondary" onClick={() => onSpeak(f)}>
            <Volume2 size={16} />
            Read finding aloud
          </button>
        )}
      </div>
      <p className="small muted">
        {f.rule.origin} · {f.rule.id} v{f.rule.version} · Calculated for{" "}
        {f.generatedAt.replace("T", " ").slice(0, 16)} UTC · Not a diagnosis
      </p>
    </div>
  );
}
function EvidenceDetail({ id }: { id: string }) {
  const e = evidenceFor(id);
  return (
    <article className="evidence-detail">
      <div className="eyebrow">
        {e.agency} · {e.type} · Locally stored summary
      </div>
      <h3>{e.title}</h3>
      <p className="muted">{e.version}</p>
      <dl className="reasoning">
        <div>
          <dt>Relevant section</dt>
          <dd>{e.section}</dd>
        </div>
        <div>
          <dt>Use in ASTRAMED</dt>
          <dd>{e.statement}</dd>
        </div>
        <div>
          <dt>Scientific limits</dt>
          <dd>{e.limitations}</dd>
        </div>
        <div>
          <dt>Verification</dt>
          <dd>
            Original NASA source reviewed 14 November 2026. This record pins the
            cited revision; it does not assert current mission certification.
          </dd>
        </div>
      </dl>
      <a
        className="primary external-link"
        href={e.url}
        target="_blank"
        rel="noreferrer"
      >
        Open original NASA source
        <ArrowUpRight size={16} />
      </a>
      <p className="small muted">
        Local summary works offline. Opening the original source requires
        connectivity.
      </p>
    </article>
  );
}
function LogReading({
  day,
  onSave,
}: {
  day: number;
  onSave: (
    r: Pick<
      Measurement,
      "indicator" | "value" | "timestamp" | "unit" | "aggregation"
    >,
  ) => void;
}) {
  const [id, setId] = useState<Indicator>("reaction");
  const [value, setValue] = useState("");
  const [timestamp, setTimestamp] = useState(
    dayTimestamp(day, 14).slice(0, 16),
  );
  const [error, setError] = useState("");
  const [average, setAverage] = useState(false);
  const m = metricFor(id);
  return (
    <form
      className="log-form"
      onSubmit={(e) => {
        e.preventDefault();
        const iso = timestamp ? `${timestamp}:00.000Z` : "";
        const err =
          value.trim() === ""
            ? "Enter a value."
            : validateReading(id, Number(value), iso, m.unit, day);
        if (err) {
          setError(err);
          return;
        }
        if (id === "co2" && !average) {
          setError(
            "Confirm that this is a one-hour average, not an instantaneous reading.",
          );
          return;
        }
        onSave({
          indicator: id,
          value: Number(value),
          timestamp: iso,
          unit: m.unit,
          aggregation: id === "co2" ? "one_hour_average" : undefined,
        });
      }}
    >
      <p className="muted">
        Saved for the selected astronaut and simulated mission day {day}. Enter
        demonstration values only.
      </p>
      <label>
        Indicator
        <select
          aria-label="Indicator"
          value={id}
          onChange={(e) => {
            setId(e.target.value as Indicator);
            setValue("");
            setError("");
          }}
        >
          {metrics.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Value ({m.unit})
        <input
          autoFocus
          type="number"
          step="any"
          value={value}
          required
          onChange={(e) => setValue(e.target.value)}
          placeholder={`${m.min}–${m.max}`}
        />
      </label>
      <p className="small muted">
        Input-quality bounds: {m.min}–{m.max} {m.unit}. These are not medical
        safety limits. {m.note}
      </p>
      <label>
        Mission timestamp · UTC
        <input
          type="datetime-local"
          value={timestamp}
          required
          onChange={(e) => setTimestamp(e.target.value)}
          min={dayTimestamp(day).slice(0, 10) + "T00:00"}
          max={dayTimestamp(day).slice(0, 10) + "T23:59"}
        />
      </label>
      <p className="small muted">
        Chart uses the latest timestamp for each day. A morning entry will not
        replace a later reading.
      </p>
      {id === "co2" && (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={average}
            onChange={(e) => setAverage(e.target.checked)}
          />
          This is a one-hour average partial pressure.
        </label>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" type="submit">
        <Plus size={16} />
        Save reading locally
      </button>
    </form>
  );
}
function Progress({
  astronautId,
  day,
  scenario,
  completions,
  assessments,
}: {
  astronautId: string;
  day: number;
  scenario: Scenario;
  completions: ReturnType<typeof useMission>["state"]["completions"];
  assessments: AssessmentResult[];
}) {
  const cs = completions.filter(
    (c) =>
      c.astronautId === astronautId && c.scenario === scenario && c.day <= day,
  );
  const results = assessments.filter(
    (r) =>
      r.astronautId === astronautId && r.scenario === scenario && r.day <= day,
  );
  const days = new Set(cs.map((c) => c.day));
  let streak = 0;
  for (let d = day; days.has(d); d--) streak++;
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>A record of showing up</h2>
          <p className="muted">
            Recorded activity, without a medical performance score.
          </p>
        </div>
      </div>
      <div className="progress-stats">
        <div>
          <strong>{cs.length}</strong>
          <span>Simulated activities completed</span>
        </div>
        <div>
          <strong>
            {streak} {streak === 1 ? "day" : "days"}
          </strong>
          <span>Consecutive days ending today</span>
        </div>
        <div>
          <strong>{results.length}</strong>
          <span>Saved cognitive assessments</span>
        </div>
      </div>
      <h3>Recent records</h3>
      {cs.length + results.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={22} />
          <p>
            Complete an activity or save an assessment to begin your record.
          </p>
        </div>
      ) : (
        <ul className="progress-list">
          {cs.map((c, i) => (
            <li key={`${c.activityId}-${i}`}>
              <Check size={16} />
              <span>
                {activities.find((a) => a.id === c.activityId)?.title}{" "}
                <small className="muted">· Simulated completion</small>
              </span>
              <span>Day {c.day}</span>
            </li>
          ))}
          {results.map((r) => (
            <li key={r.id}>
              <Target size={16} />
              <span>
                Reaction-time assessment · {r.median.toFixed(0)} ms{" "}
                <small className="muted">· Browser timing</small>
              </span>
              <span>Day {r.day}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
