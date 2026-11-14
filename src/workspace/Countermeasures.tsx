import { useState } from "react";
import { ArrowRight, Check, CircleCheck, Eye, Timer } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { activities, astronauts } from "../data/catalog";
import { evidenceFor } from "../data/evidence";
import { Assessment } from "../components/Assessment";
import { VideoPlayer } from "../components/VideoPlayer";
import { dayTimestamp, evaluate, selectSeries } from "../engine/monitoring";
import type { Activity, AssessmentResult, Completion, Measurement } from "../types";
import { useWs } from "./context";

const TABS = [
  { id: "physical", label: "Physical training" },
  { id: "cognitive", label: "Cognitive assessment" },
  { id: "progress", label: "History" },
] as const;

const isSession = (c: Completion) => c.kind === "session";
const isChecklist = (c: Completion) => c.kind !== "session";

export function Countermeasures() {
  const { tab } = useWs();
  return (
    <>
      <nav className="tabs" aria-label="Countermeasure sections">
        {TABS.map((t) => <a key={t.id} href={`#/countermeasures/${t.id}`} aria-current={tab === t.id ? "page" : undefined}>{t.label}</a>)}
      </nav>
      {tab === "physical" && <Physical />}
      {tab === "cognitive" && <Cognitive />}
      {tab === "progress" && <Progress />}
    </>
  );
}

function Physical() {
  const { state, astronaut } = useWs();
  const [selectedId, setSelectedId] = useState(activities[0].id);
  const selected = activities.find((a) => a.id === selectedId)!;
  const mine = (id: string) => ({
    session: state.completions.some((c) => c.activityId === id && c.astronautId === astronaut.id && c.day === state.day && c.scenario === state.scenario && isSession(c)),
    checklist: state.completions.some((c) => c.activityId === id && c.astronautId === astronaut.id && c.day === state.day && c.scenario === state.scenario && isChecklist(c)),
    watched: state.videoViews.some((v) => v.activityId === id && v.astronautId === astronaut.id && v.scenario === state.scenario),
  });
  const groups = [
    { label: "Exercise hardware", ids: ["resistance", "treadmill", "cycle"] },
    { label: "Mobility and recovery", ids: ["mobility", "recovery"] },
  ];
  return (
    <div className="training">
      <nav className="training-list" aria-label="Training library">
        {groups.map((g) => (
          <div key={g.label}>
            <h2 className="list-label">{g.label}</h2>
            <ul>
              {g.ids.map((id) => {
                const a = activities.find((x) => x.id === id)!;
                const s = mine(id);
                return (
                  <li key={id}>
                    <button className="training-item" aria-current={id === selectedId ? "true" : undefined} onClick={() => setSelectedId(id)}>
                      <span className="grow">
                        <span className="training-name">{a.title}</span>
                        <small>{a.category}{a.video ? " · video" : ""}</small>
                      </span>
                      <span className="marks" aria-label={`${s.session ? "Session recorded today. " : ""}${s.checklist ? "Checklist done today. " : ""}${s.watched ? "Video watched." : ""}`}>
                        {s.watched && <Eye size={14} aria-hidden="true" />}
                        {s.checklist && <CircleCheck size={14} aria-hidden="true" />}
                        {s.session && <Timer size={14} aria-hidden="true" className="ok-icon" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <p className="muted small list-key"><Eye size={13} aria-hidden="true" /> watched · <CircleCheck size={13} aria-hidden="true" /> checklist · <Timer size={13} aria-hidden="true" /> session today</p>
      </nav>
      <TrainingDetail key={selected.id} a={selected} />
    </div>
  );
}

function TrainingDetail({ a }: { a: Activity }) {
  const { state, setState, astronaut, notify, open } = useWs();
  const key = `${state.scenario}-${astronaut.id}-${a.id}-${state.day}`;
  const checked = state.checklists[key] ?? [];
  const history = state.completions.filter((c) => c.activityId === a.id && c.astronautId === astronaut.id && c.scenario === state.scenario && c.day <= state.day);
  const views = state.videoViews.filter((v) => v.activityId === a.id && v.astronautId === astronaut.id && v.scenario === state.scenario);
  const checklistDone = history.some((c) => c.day === state.day && isChecklist(c));
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const toggle = (i: number) => {
    const next = checked.includes(i) ? checked.filter((x) => x !== i) : [...checked, i];
    setState((s) => {
      const completions = next.length === a.steps.length && !s.completions.some((c) => c.activityId === a.id && c.astronautId === astronaut.id && c.day === s.day && c.scenario === s.scenario && isChecklist(c))
        ? [...s.completions, { astronautId: astronaut.id, activityId: a.id, day: s.day, scenario: s.scenario, timestamp: dayTimestamp(s.day, 17), kind: "checklist" as const }]
        : s.completions;
      return { ...s, checklists: { ...s.checklists, [key]: next }, completions };
    });
    if (next.length === a.steps.length && !checklistDone) notify(`Demonstration checklist complete for ${a.title}. This is not an exercise session.`);
  };
  const record = (e: React.FormEvent) => {
    e.preventDefault();
    const m = Number(minutes);
    if (!Number.isInteger(m) || m < 1 || m > 240) return setErr("Enter whole minutes between 1 and 240.");
    setErr("");
    setState((s) => ({ ...s, completions: [...s.completions, { astronautId: astronaut.id, activityId: a.id, day: s.day, scenario: s.scenario, timestamp: dayTimestamp(s.day, 18), kind: "session", minutes: m, note: note.trim() || undefined }] }));
    setNote("");
    notify(`${m}-minute ${a.title.toLowerCase()} session recorded for day ${state.day}.`);
  };
  const markWatched = () => {
    if (views.length) return;
    setState((s) => ({ ...s, videoViews: [...s.videoViews, { astronautId: astronaut.id, activityId: a.id, scenario: s.scenario, day: s.day, timestamp: dayTimestamp(s.day, 16) }] }));
    notify("Video marked as watched. Watching a video does not count as a session.");
  };

  return (
    <article className="training-detail" aria-labelledby="training-h">
      <header className="training-head">
        <span className="label">{a.category}</span>
        <h2 id="training-h" className="finding-title">{a.title}</h2>
        <p className="muted">{a.purpose}</p>
      </header>
      {a.video ? <VideoPlayer video={a.video} onWatched={markWatched} /> : <p className="no-video">No NASA demonstration video is linked for this routine.</p>}
      <div className="training-cols">
        <div>
          <dl className="qa compact">
            <div><dt>Equipment</dt><dd>{a.equipment}</dd></div>
            <div><dt>Duration</dt><dd>{a.duration}</dd></div>
            <div><dt>Reference</dt><dd><button className="btn btn-link" onClick={() => open({ type: "evidence", id: a.evidenceId ?? "exercise" })}>{evidenceFor(a.evidenceId ?? "exercise").title}</button></dd></div>
          </dl>
          <h3 className="h3 spaced">Instructions</h3>
          <ol className="steps">{(a.instructions ?? []).map((s) => <li key={s}>{s}</li>)}</ol>
          <p className="muted small">General demonstration, not an individual exercise prescription. Loads, durations and restraints come from the mission exercise plan.</p>
        </div>
        <div>
          <fieldset className="checklist">
            <legend className="h3">Demonstration checklist</legend>
            <p className="muted small">Day {state.day} · {checked.length} of {a.steps.length} steps</p>
            {a.steps.map((s, i) => (
              <label key={s} className="check-row"><input type="checkbox" checked={checked.includes(i)} onChange={() => toggle(i)} /> {s}</label>
            ))}
            {checklistDone && <p className="tone ok small"><Check size={14} aria-hidden="true" /> Checklist complete for today</p>}
          </fieldset>
          <form className="session-form" onSubmit={record} noValidate>
            <h3 className="h3">Record exercise session</h3>
            <p className="muted small">Log a session you actually performed. Separate from watching the video or ticking the checklist.</p>
            <div className="form-row">
              <label className="field-label">Duration (min)<input className="field" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-describedby="sess-err" /></label>
              <label className="field-label">Note (optional)<input className="field" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="e.g. reduced load" /></label>
            </div>
            <p id="sess-err" className="error" role="alert">{err}</p>
            <button className="btn btn-primary" type="submit">Record session</button>
          </form>
        </div>
      </div>
      <section className="training-history" aria-labelledby="hist-h">
        <h3 id="hist-h" className="h3">History for {a.title.toLowerCase()}</h3>
        {history.length + views.length === 0 ? <p className="empty">Nothing recorded for this activity in the current scenario.</p> : (
          <ul className="record-list">
            {[...history].reverse().map((c, i) => (
              <li key={i}><span>{isSession(c) ? `Session · ${c.minutes} min${c.note ? ` · ${c.note}` : ""}` : "Demonstration checklist completed"}</span><span className="muted">Day {c.day}</span></li>
            ))}
            {views.map((v, i) => <li key={`v${i}`}><span>Video watched</span><span className="muted">Day {v.day}</span></li>)}
          </ul>
        )}
      </section>
    </article>
  );
}

function Cognitive() {
  const { state, setState, astronaut, mission, notify, speak, range } = useWs();
  const series = selectSeries(mission.rows, astronaut.id, state.scenario, "reaction", state.day, 30);
  const mine = state.assessments.filter((r) => r.astronautId === astronaut.id && r.scenario === state.scenario);
  const save = (result: AssessmentResult) => {
    const reading: Measurement = {
      id: result.id, astronautId: astronaut.id, scenario: state.scenario, indicator: "reaction", unit: "ms", value: Number(result.median.toFixed(1)), day: state.day,
      timestamp: new Date(Date.parse(dayTimestamp(state.day, 13)) + state.assessments.length * 1000).toISOString(), source: "Browser assessment", quality: "browser_timed",
    };
    setState((s) => ({ ...s, readings: [...s.readings, reading], assessments: [...s.assessments, result] }));
    notify("Result saved. My Health and the crew status now use this assessment.");
    if (state.voice) speak(evaluate(astronaut, [...mission.rows, reading], state.scenario, "reaction", state.day, range));
  };
  return (
    <section aria-labelledby="cog-h" className="cog-grid">
      <div>
        <h2 id="cog-h" className="h2">Reaction-time assessment</h2>
        <p className="muted small">Measures simple visual reaction time: the delay between a signal and your key press. Inspired by psychomotor vigilance testing; not the NASA PVT and not clinically validated.</p>
        <Assessment key={`${astronaut.id}-${state.scenario}-${state.day}`} astronaut={astronaut} scenario={state.scenario} day={state.day} onSave={save} />
      </div>
      <div>
        <h2 className="h2">Reaction-time record</h2>
        <p className="muted small">Median latency, last 30 days to day {state.day}. Amber points are assessments taken in this app.</p>
        <div className="mini-chart" role="img" aria-label={`Reaction-time latency, ${series.length} days, baseline ${astronaut.baseline.reaction.value} ms`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="day" tickFormatter={(d) => `Day ${d}`} tick={{ fill: "var(--text-2)", fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={30} />
              <YAxis width={56} tick={{ fill: "var(--text-2)", fontSize: 12 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} unit=" ms" />
              <Tooltip contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--line-strong)", borderRadius: 6, color: "var(--text)" }} labelFormatter={(d) => `Mission day ${d}`} formatter={(v, _n, item) => [`${v} ms`, (item?.payload as Measurement)?.source ?? "Latency"]} />
              <ReferenceLine y={astronaut.baseline.reaction.value} stroke="var(--info)" strokeDasharray="5 4" />
              <Line dataKey="value" stroke="var(--accent)" strokeWidth={2} isAnimationActive={false}
                dot={(p: { cx?: number; cy?: number; payload?: Measurement; index?: number }) => <circle key={p.index} cx={p.cx} cy={p.cy} r={p.payload?.source === "Browser assessment" ? 5 : 0} fill="var(--warn)" />} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="muted small">Dashed line: baseline of {astronaut.baseline.reaction.value} ms from {astronaut.baseline.reaction.count} simulated preflight sessions.</p>
        <h3 className="h3 spaced">Saved assessments</h3>
        {mine.length === 0 ? <p className="empty">No assessments saved in this scenario yet.</p> : (
          <table className="simple">
            <thead><tr><th scope="col">Day</th><th scope="col">Median</th><th scope="col">Valid</th><th scope="col">Excluded</th></tr></thead>
            <tbody>{[...mine].reverse().map((r) => <tr key={r.id}><td>{r.day}</td><td>{r.median.toFixed(0)} ms</td><td>{r.trials.length}</td><td>{r.falseStarts} early · {r.anticipatory ?? 0} anticipatory · {r.misses} missed</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function Progress() {
  const { state, astronaut } = useWs();
  const cs = state.completions.filter((c) => c.astronautId === astronaut.id && c.scenario === state.scenario && c.day <= state.day);
  const sessions = cs.filter(isSession);
  const results = state.assessments.filter((r) => r.astronautId === astronaut.id && r.scenario === state.scenario && r.day <= state.day);
  const days = new Set(sessions.map((c) => c.day));
  let streak = 0;
  for (let d = days.has(state.day) ? state.day : state.day - 1; days.has(d); d--) streak++;
  const minutes = sessions.reduce((t, c) => t + (c.minutes ?? 0), 0);
  const week = (id: string) => state.completions.filter((c) => c.astronautId === id && c.scenario === state.scenario && isSession(c) && c.day > state.day - 7 && c.day <= state.day).length;
  const rows = [
    ...cs.map((c) => ({ day: c.day, text: isSession(c) ? `${activities.find((a) => a.id === c.activityId)?.title} · ${c.minutes} min session` : `${activities.find((a) => a.id === c.activityId)?.title} · checklist`, kind: isSession(c) ? "Session" : "Checklist" })),
    ...results.map((r) => ({ day: r.day, text: `Reaction-time assessment · ${r.median.toFixed(0)} ms median`, kind: "Assessment" })),
  ].sort((a, b) => b.day - a.day);
  return (
    <section aria-labelledby="prog-h">
      <h2 id="prog-h" className="sr-only">History</h2>
      <dl className="stat-row">
        <div><dt>Sessions recorded</dt><dd>{sessions.length}</dd></div>
        <div><dt>Exercise minutes</dt><dd>{minutes}</dd></div>
        <div><dt>Consecutive session days</dt><dd>{streak}</dd></div>
        <div><dt>Assessments saved</dt><dd>{results.length}</dd></div>
      </dl>
      <p className="muted small">Counts only sessions you recorded. Checklists and watched videos are listed but not counted. Missed days are never penalised.</p>
      <div className="split">
        <div>
          <h3 className="h3 spaced">Recent records</h3>
          {rows.length === 0 ? <p className="empty">No sessions, checklists or assessments recorded in this scenario.</p> : (
            <table className="simple"><thead><tr><th scope="col">Day</th><th scope="col">Type</th><th scope="col">Record</th></tr></thead>
              <tbody>{rows.map((r, i) => <tr key={i}><td>{r.day}</td><td>{r.kind}</td><td>{r.text}</td></tr>)}</tbody></table>
          )}
        </div>
        <div>
          <h3 className="h3 spaced">Crew sessions, last 7 days</h3>
          <p className="muted small">Voluntary participation from records in this demo, listed alphabetically. Not a measure of fitness or health.</p>
          <ul className="record-list">
            {[...astronauts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => <li key={a.id}><span>{a.name}</span><span className="muted">{week(a.id)} {week(a.id) === 1 ? "session" : "sessions"}</span></li>)}
          </ul>
          <a className="btn btn-link sm spaced" href="#/countermeasures/physical">Open training library <ArrowRight size={14} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}
