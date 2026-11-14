import { ArrowRight, Check } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { activities, astronauts } from "../data/catalog";
import { evidenceFor } from "../data/evidence";
import { Assessment } from "../components/Assessment";
import { dayTimestamp, evaluate, selectSeries } from "../engine/monitoring";
import type { AssessmentResult, Measurement } from "../types";
import { useWs } from "./context";

const TABS = [
  { id: "physical", label: "Physical" },
  { id: "cognitive", label: "Cognitive" },
  { id: "progress", label: "Progress" },
] as const;

export function Countermeasures() {
  const { tab, astronaut, environment, state } = useWs();
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Countermeasures · Mission day {state.day}</p>
          <h1 className="h1">Exercise &amp; Cognitive Assessments</h1>
          <p className="page-sub">
            Activities and assessments for {astronaut.name}. Review routines,
            complete assessments and inspect saved records.
          </p>
        </div>
        <span className="muted small">
          {environment.name} · {environment.gravity}
        </span>
      </div>
      <nav className="tabs" aria-label="Countermeasure sections">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`#/countermeasures/${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
          >
            {t.label}
          </a>
        ))}
      </nav>
      {tab === "physical" && <Physical />}
      {tab === "cognitive" && <Cognitive />}
      {tab === "progress" && <Progress />}
    </>
  );
}

function Physical() {
  const { state, astronaut, open } = useWs();
  return (
    <section aria-labelledby="phys-h">
      <div className="section-head">
        <h2 id="phys-h" className="h2">
          Activity library
        </h2>
      </div>
      <p className="muted measure">
        These are illustrative routines, not NASA exercise prescriptions. On the
        ISS, NASA uses dedicated hardware such as a resistive exercise device, a
        treadmill and a cycle ergometer, with mission-specific plans.{" "}
        <button
          className="btn btn-link inline"
          onClick={() => open({ type: "evidence", id: "exercise" })}
        >
          {evidenceFor("exercise").title}
        </button>
      </p>
      <ul className="activity-list">
        {activities.map((a) => {
          const done = state.completions.some(
            (c) =>
              c.activityId === a.id &&
              c.astronautId === astronaut.id &&
              c.day === state.day &&
              c.scenario === state.scenario,
          );
          return (
            <li key={a.id} className="activity">
              <div className="activity-main">
                <span className="label">
                  {a.category} · {a.duration}
                </span>
                <h3 className="h3">{a.title}</h3>
                <p className="muted">{a.description}</p>
                <p className="small muted">
                  Equipment:{" "}
                  {a.id === "resistance"
                    ? "Mission-approved resistance device"
                    : a.id === "mobility"
                      ? "Approved restraints and stable support"
                      : "Work-rest schedule and sleep record"}
                </p>
              </div>
              <div className="activity-side">
                {done ? (
                  <span className="tone ok">
                    <Check size={14} aria-hidden="true" /> Completed day{" "}
                    {state.day}
                  </span>
                ) : (
                  <span className="muted small">Not recorded today</span>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={() => open({ type: "activity", activity: a })}
                  aria-label={`Review ${a.title}`}
                >
                  Review <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="callout">
        <div>
          <h3 className="h3">Reaction-time assessment</h3>
          <p className="muted">
            A short reaction-time task measures real browser response timing and
            updates your record.
          </p>
        </div>
        <a className="btn btn-primary" href="#/countermeasures/cognitive">
          Start assessment <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function Cognitive() {
  const { state, setState, astronaut, mission, notify, speak, range } = useWs();
  const series = selectSeries(
    mission.rows,
    astronaut.id,
    state.scenario,
    "reaction",
    state.day,
    30,
  );
  const mine = state.assessments.filter(
    (r) =>
      r.astronautId === astronaut.id &&
      r.scenario === state.scenario &&
      r.day <= state.day,
  );
  const save = (result: AssessmentResult) => {
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
    notify("Assessment saved. My Health and Crew now use this result.");
    // Voice uses the same recalculated finding as the screen.
    if (state.voice)
      speak(
        evaluate(
          astronaut,
          [...mission.rows, reading],
          state.scenario,
          "reaction",
          state.day,
          range,
        ),
      );
  };
  return (
    <section aria-labelledby="cog-h" className="cog-grid">
      <div>
        <h2 id="cog-h" className="h2">
          Reaction-time assessment
        </h2>
        <Assessment
          key={`${astronaut.id}-${state.scenario}-${state.day}`}
          astronaut={astronaut}
          scenario={state.scenario}
          day={state.day}
          onSave={save}
        />
      </div>
      <div>
        <h2 className="h2">Your reaction-time record</h2>
        <p className="muted small">
          Latency in milliseconds (ms), last 30 days up to day {state.day}.
          Highlighted points come from assessments run in this app.
        </p>
        <div
          className="mini-chart"
          role="img"
          aria-label={`Reaction-time latency, ${series.length} days, baseline ${astronaut.baseline.reaction.value} ms`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={series}
              margin={{ top: 12, right: 12, bottom: 4, left: 0 }}
            >
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis
                dataKey="day"
                tickFormatter={(d) => `Day ${d}`}
                tick={{ fill: "var(--text-2)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                width={48}
                tick={{ fill: "var(--text-2)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line-strong)",
                  borderRadius: 6,
                  color: "var(--text)",
                }}
                labelFormatter={(d) => `Mission day ${d}`}
                formatter={(v, _n, item) => [
                  `${v} ms`,
                  (item?.payload as Measurement)?.source ?? "Latency",
                ]}
              />
              <ReferenceLine
                y={astronaut.baseline.reaction.value}
                stroke="var(--info)"
                strokeDasharray="5 4"
              />
              <Line
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={2}
                isAnimationActive={false}
                dot={(p: {
                  cx?: number;
                  cy?: number;
                  payload?: Measurement;
                  index?: number;
                }) => (
                  <circle
                    key={p.index}
                    cx={p.cx}
                    cy={p.cy}
                    r={p.payload?.source === "Browser assessment" ? 5 : 0}
                    fill="var(--warn)"
                  />
                )}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="muted small">
          Dashed line: personal baseline of {astronaut.baseline.reaction.value}{" "}
          ms from {astronaut.baseline.reaction.count} simulated preflight
          sessions.
        </p>
        <h3 className="h3 spaced">Assessments saved in this scenario</h3>
        {mine.length === 0 ? (
          <p className="empty">
            None yet. Completed assessments appear here and in your trends.
          </p>
        ) : (
          <table className="simple">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Median</th>
                <th scope="col">Valid trials</th>
                <th scope="col">Excluded</th>
              </tr>
            </thead>
            <tbody>
              {[...mine].reverse().map((r) => (
                <tr key={r.id}>
                  <td>{r.day}</td>
                  <td>{r.median.toFixed(0)} ms</td>
                  <td>{r.trials.length}</td>
                  <td>
                    {r.falseStarts} early · {r.misses} missed
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function Progress() {
  const { state, astronaut } = useWs();
  const cs = state.completions.filter(
    (c) =>
      c.astronautId === astronaut.id &&
      c.scenario === state.scenario &&
      c.day <= state.day,
  );
  const results = state.assessments.filter(
    (r) =>
      r.astronautId === astronaut.id &&
      r.scenario === state.scenario &&
      r.day <= state.day,
  );
  const days = new Set(cs.map((c) => c.day));
  const recentDays = Array.from(
    { length: Math.min(state.day, 7) },
    (_, i) => state.day - Math.min(state.day, 7) + i + 1,
  );
  const history = [
    ...cs.map((c) => ({
      id: `${c.activityId}-${c.timestamp}`,
      title: activities.find((a) => a.id === c.activityId)?.title,
      day: c.day,
      timestamp: c.timestamp,
      source: "simulated completion",
    })),
    ...results.map((r) => ({
      id: r.id,
      title: `Reaction-time assessment · ${r.median.toFixed(0)} ms`,
      day: r.day,
      timestamp: r.timestamp,
      source: "browser timing",
    })),
  ].sort((a, b) => b.day - a.day || b.timestamp.localeCompare(a.timestamp));
  let streak = 0;
  for (let d = state.day; days.has(d); d--) streak++;
  const week = (id: string) =>
    state.completions.filter(
      (c) =>
        c.astronautId === id &&
        c.scenario === state.scenario &&
        c.day > state.day - 7 &&
        c.day <= state.day,
    ).length;
  return (
    <section aria-labelledby="prog-h">
      <h2 id="prog-h" className="h2">
        Your record
      </h2>
      <dl className="stat-row">
        <div>
          <dt>Activity streak</dt>
          <dd>
            {streak} {streak === 1 ? "day" : "days"}
          </dd>
        </div>
        <div>
          <dt>Activities recorded</dt>
          <dd>{cs.length}</dd>
        </div>
        <div>
          <dt>Assessments saved</dt>
          <dd>{results.length}</dd>
        </div>
      </dl>
      <p className="muted small">
        The streak counts consecutive days with a recorded activity, ending on
        the selected mission day. This is a record of activity, not a health
        measure.
      </p>
      <section className="activity-trend" aria-labelledby="frequency-h">
        <h3 id="frequency-h" className="h3">
          Activity frequency · last seven mission days
        </h3>
        <ol className="activity-week">
          {recentDays.map((d) => {
            const count = cs.filter((c) => c.day === d).length;
            return (
              <li key={d}>
                <span
                  className="activity-bar"
                  style={{ height: `${count * 20}px` }}
                  aria-hidden="true"
                />
                <strong>{count}</strong>
                <span>Day {d}</span>
              </li>
            );
          })}
        </ol>
        <p className="section-note">
          Count of saved activity completions. Empty days mean no activity was
          recorded in this demo.
        </p>
      </section>
      <div className="split">
        <div>
          <h3 className="h3 spaced">Recent records</h3>
          {cs.length + results.length === 0 ? (
            <p className="empty">
              Review an activity or save an assessment to start your record.
            </p>
          ) : (
            <ul className="record-list">
              {history.map((record) => (
                <li key={record.id}>
                  <span>{record.title}</span>
                  <span className="muted">
                    Day {record.day} · {record.source}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="h3 spaced">Crew activity records</h3>
          <p className="muted small">
            Activities recorded in the last seven mission days, for profiles
            sharing activity status.
          </p>
          <ul className="record-list">
            {[...astronauts]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((a) => (
                <li key={a.id}>
                  <span>{a.name}</span>
                  <span className="muted">
                    {a.share
                      ? `${week(a.id)} ${week(a.id) === 1 ? "activity" : "activities"}`
                      : "Limited sharing"}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
