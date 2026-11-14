import { ArrowRight, Check } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  const { tab, astronaut, environment } = useWs();
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Countermeasures</h1>
          <p className="page-sub">Activities and assessments for {astronaut.name}. Participation is voluntary and never scored against health.</p>
        </div>
        <span className="muted small">{environment.name} · {environment.gravity}</span>
      </div>
      <nav className="tabs" aria-label="Countermeasure sections">
        {TABS.map((t) => (
          <a key={t.id} href={`#/countermeasures/${t.id}`} aria-current={tab === t.id ? "page" : undefined}>{t.label}</a>
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
      <div className="section-head"><h2 id="phys-h" className="h2">Activity library</h2></div>
      <p className="muted measure">
        These are illustrative routines, not NASA exercise prescriptions. On the ISS, NASA uses dedicated hardware such as a
        resistive exercise device, a treadmill and a cycle ergometer, with mission-specific plans.{" "}
        <button className="btn btn-link inline" onClick={() => open({ type: "evidence", id: "exercise" })}>{evidenceFor("exercise").title}</button>
      </p>
      <ul className="activity-list">
        {activities.map((a) => {
          const done = state.completions.some((c) => c.activityId === a.id && c.astronautId === astronaut.id && c.day === state.day && c.scenario === state.scenario);
          return (
            <li key={a.id} className="activity">
              <div className="activity-main">
                <span className="label">{a.category} · {a.duration}</span>
                <h3 className="h3">{a.title}</h3>
                <p className="muted">{a.description}</p>
              </div>
              <div className="activity-side">
                {done ? <span className="tone ok"><Check size={14} aria-hidden="true" /> Completed day {state.day}</span> : <span className="muted small">Not recorded today</span>}
                <button className="btn btn-secondary" onClick={() => open({ type: "activity", activity: a })} aria-label={`Review ${a.title}`}>
                  Review <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="callout">
        <div>
          <h3 className="h3">Make your next check measurable</h3>
          <p className="muted">A short reaction-time task measures real browser response timing and updates your record.</p>
        </div>
        <a className="btn btn-primary" href="#/countermeasures/cognitive">Start assessment <ArrowRight size={16} aria-hidden="true" /></a>
      </div>
    </section>
  );
}

function Cognitive() {
  const { state, setState, astronaut, mission, notify, speak, range } = useWs();
  const series = selectSeries(mission.rows, astronaut.id, state.scenario, "reaction", state.day, 30);
  const mine = state.assessments.filter((r) => r.astronautId === astronaut.id && r.scenario === state.scenario);
  const save = (result: AssessmentResult) => {
    const reading: Measurement = {
      id: result.id,
      astronautId: astronaut.id,
      scenario: state.scenario,
      indicator: "reaction",
      unit: "ms",
      value: Number(result.median.toFixed(1)),
      day: state.day,
      timestamp: new Date(Date.parse(dayTimestamp(state.day, 13)) + state.assessments.length * 1000).toISOString(),
      source: "Browser assessment",
      quality: "browser_timed",
    };
    setState((s) => ({ ...s, readings: [...s.readings, reading], assessments: [...s.assessments, result] }));
    notify("Assessment saved. My Health and Crew now use this result.");
    // Voice uses the same recalculated finding as the screen.
    if (state.voice) speak(evaluate(astronaut, [...mission.rows, reading], state.scenario, "reaction", state.day, range));
  };
  return (
    <section aria-labelledby="cog-h" className="cog-grid">
      <div>
        <h2 id="cog-h" className="h2">Reaction-time assessment</h2>
        <Assessment key={`${astronaut.id}-${state.scenario}-${state.day}`} astronaut={astronaut} scenario={state.scenario} day={state.day} onSave={save} />
      </div>
      <div>
        <h2 className="h2">Your reaction-time record</h2>
        <p className="muted small">Last 30 days up to day {state.day}. Highlighted points come from assessments run in this app.</p>
        <div className="mini-chart" role="img" aria-label={`Reaction-time latency, ${series.length} days, baseline ${astronaut.baseline.reaction.value} ms`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="day" tickFormatter={(d) => `Day ${d}`} tick={{ fill: "var(--text-2)", fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={30} />
              <YAxis width={48} tick={{ fill: "var(--text-2)", fontSize: 12 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} unit=" ms" />
              <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--line-strong)", borderRadius: 6, color: "var(--text)" }} labelFormatter={(d) => `Mission day ${d}`} formatter={(v, _n, item) => [`${v} ms`, (item?.payload as Measurement)?.source ?? "Latency"]} />
              <ReferenceLine y={astronaut.baseline.reaction.value} stroke="var(--info)" strokeDasharray="5 4" />
              <Line dataKey="value" stroke="var(--accent)" strokeWidth={2} isAnimationActive={false}
                dot={(p: { cx?: number; cy?: number; payload?: Measurement; index?: number }) => (
                  <circle key={p.index} cx={p.cx} cy={p.cy} r={p.payload?.source === "Browser assessment" ? 5 : 0} fill="var(--warn)" />
                )} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="muted small">Dashed line: personal baseline of {astronaut.baseline.reaction.value} ms from {astronaut.baseline.reaction.count} simulated preflight sessions.</p>
        <h3 className="h3 spaced">Assessments saved in this scenario</h3>
        {mine.length === 0 ? (
          <p className="empty">None yet. Completed assessments appear here and in your trends.</p>
        ) : (
          <table className="simple">
            <thead><tr><th scope="col">Day</th><th scope="col">Median</th><th scope="col">Valid trials</th><th scope="col">Excluded</th></tr></thead>
            <tbody>
              {[...mine].reverse().map((r) => (
                <tr key={r.id}><td>{r.day}</td><td>{r.median.toFixed(0)} ms</td><td>{r.trials.length}</td><td>{r.falseStarts} early · {r.anticipatory ?? 0} anticipatory · {r.misses} missed</td></tr>
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
  const cs = state.completions.filter((c) => c.astronautId === astronaut.id && c.scenario === state.scenario && c.day <= state.day);
  const results = state.assessments.filter((r) => r.astronautId === astronaut.id && r.scenario === state.scenario && r.day <= state.day);
  const days = new Set(cs.map((c) => c.day));
  let streak = 0;
  for (let d = days.has(state.day) ? state.day : state.day - 1; days.has(d); d--) streak++;
  const week = (id: string) => state.completions.filter((c) => c.astronautId === id && c.scenario === state.scenario && c.day > state.day - 7 && c.day <= state.day).length;
  return (
    <section aria-labelledby="prog-h">
      <h2 id="prog-h" className="h2">Your record</h2>
      <dl className="stat-row">
        <div><dt>Activity streak</dt><dd>{streak} {streak === 1 ? "day" : "days"}</dd></div>
        <div><dt>Activities recorded</dt><dd>{cs.length}</dd></div>
        <div><dt>Assessments saved</dt><dd>{results.length}</dd></div>
      </dl>
      <p className="muted small">The streak counts consecutive days with a recorded activity, ending today or yesterday. Missing a day for illness or rest is never penalised and nothing here is a health measure.</p>
      <div className="split">
        <div>
          <h3 className="h3 spaced">Recent records</h3>
          {cs.length + results.length === 0 ? (
            <p className="empty">Review an activity or save an assessment to start your record.</p>
          ) : (
            <ul className="record-list">
              {cs.map((c, i) => (
                <li key={`${c.activityId}-${i}`}><span>{activities.find((a) => a.id === c.activityId)?.title}</span><span className="muted">Day {c.day} · simulated completion</span></li>
              ))}
              {results.map((r) => (
                <li key={r.id}><span>Reaction-time assessment · {r.median.toFixed(0)} ms</span><span className="muted">Day {r.day} · browser timing</span></li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="h3 spaced">Crew challenge: show up this week</h3>
          <p className="muted small">Voluntary participation over the last 7 mission days, from records made in this demo. Listed alphabetically; not a ranking of fitness or health.</p>
          <ul className="record-list">
            {[...astronauts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
              <li key={a.id}><span>{a.name}</span><span className="muted">{week(a.id)} {week(a.id) === 1 ? "activity" : "activities"}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
