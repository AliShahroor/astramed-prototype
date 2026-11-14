import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Download,
  Plus,
  RefreshCw,
  Square,
  Target,
  Volume2,
} from "lucide-react";
import { Dialog } from "../components/Dialog";
import {
  astronauts,
  environments,
  metricFor,
  metrics,
  mission,
  scenarios,
} from "../data/catalog";
import { evidence, evidenceFor } from "../data/evidence";
import { dayTimestamp, validateReading } from "../engine/monitoring";
import { initialState } from "../app/useMission";
import type { Finding, Indicator, Measurement, Scenario } from "../types";
import { StatusTag, useWs, type Modal } from "./context";
import { changeText, formatValue, referenceText } from "./MyHealth";

export function Modals({ modal, close }: { modal: Modal; close: () => void }) {
  const ws = useWs();
  if (!modal) return null;
  if (modal.type === "finding") {
    const f = ws.findings.find((x) => x.indicator === modal.indicator)!;
    return (
      <Dialog title="Explainable health card" wide onClose={close}>
        <HealthCard f={f} />
      </Dialog>
    );
  }
  if (modal.type === "evidence")
    return (
      <Dialog title="NASA evidence" wide onClose={close}>
        <EvidenceView id={modal.id} />
      </Dialog>
    );
  if (modal.type === "log")
    return (
      <Dialog title="Log a reading" onClose={close}>
        <LogReading initial={modal.indicator ?? ws.indicator} onDone={close} />
      </Dialog>
    );
  if (modal.type === "mission") return <MissionDialog close={close} />;
  if (modal.type === "settings") return <SettingsDialog close={close} />;
  const a = modal.activity;
  const done = ws.state.completions.some(
    (c) =>
      c.activityId === a.id &&
      c.astronautId === ws.astronaut.id &&
      c.day === ws.state.day &&
      c.scenario === ws.state.scenario,
  );
  return (
    <Dialog title={a.title} onClose={close}>
      <p>{a.description}</p>
      <p className="muted small">
        {a.duration} · Equipment:{" "}
        {a.id === "resistance"
          ? "Mission-approved resistance device and restraints"
          : a.id === "mobility"
            ? "Approved restraints and stable support"
            : "Work-rest schedule and sleep record"}
      </p>
      <p className="notice-block">
        Demonstration checklist, not an approved exercise protocol. Equipment,
        restraints and loading follow the mission-specific plan.
      </p>
      <ol className="steps">
        {a.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className="actions">
        <button
          className="btn btn-primary"
          disabled={done}
          onClick={() => {
            ws.setState((s) => ({
              ...s,
              completions: [
                ...s.completions,
                {
                  astronautId: ws.astronaut.id,
                  activityId: a.id,
                  day: s.day,
                  scenario: s.scenario,
                  timestamp: new Date().toISOString(),
                },
              ],
            }));
            ws.notify(
              `${a.title} recorded for day ${ws.state.day}. See Progress.`,
            );
            close();
          }}
        >
          <Check size={16} aria-hidden="true" />{" "}
          {done ? "Already recorded today" : "Record simulated completion"}
        </button>
      </div>
    </Dialog>
  );
}

function HealthCard({ f }: { f: Finding }) {
  const { open, environment, state, speak, go, astronaut } = useWs();
  const m = metricFor(f.indicator);
  const [speaking, setSpeaking] = useState(false);
  const isRef = f.indicator === "co2" || f.indicator === "radiation";
  const rows: [string, React.ReactNode][] = [
    ["What changed?", <>{f.summary}</>],
    [
      "Compared with what?",
      <>
        {referenceText(f)}
        {!isRef && f.baseline !== null && (
          <>
            , a configured synthetic baseline with{" "}
            {astronaut.baseline[f.indicator].count} illustrative preflight
            observations
          </>
        )}
      </>,
    ],
    [
      "Over what period?",
      <>
        {f.window} · {f.observations} recorded{" "}
        {f.observations === 1 ? "day" : "days"} · {f.persistence} consecutive{" "}
        {f.persistence === 1 ? "day" : "days"} meeting the rule
      </>,
    ],
    ["Why was this flagged?", <>{f.rule.criterion}</>],
    ["Why might it matter?", <>{f.explanation}</>],
    [
      "Mission context",
      <>
        {environment.name}: {environment.priority}. Environment selection
        changes context, never the reference limits.
      </>,
    ],
    ["What should happen next?", <>{f.next}</>],
    [
      "Limits of this reading",
      <>
        {f.uncertainty} {m.note}
      </>,
    ],
  ];
  return (
    <article className="card-detail" aria-label={f.title}>
      <div className="finding-meta">
        <StatusTag status={f.status} />
        <span
          className={`origin ${f.rule.origin.startsWith("NASA") ? "nasa" : "proto"}`}
        >
          {f.rule.origin}
        </span>
      </div>
      <h3 className="finding-title">{f.title}</h3>
      <dl className="facts">
        <div>
          <dt>Observed</dt>
          <dd>{formatValue(f)}</dd>
        </div>
        <div>
          <dt>{isRef ? "NASA reference" : "Personal baseline"}</dt>
          <dd>
            {referenceText(f).replace(
              / (personal baseline|NASA reference.*|NASA career reference)$/,
              "",
            )}
          </dd>
        </div>
        <div>
          <dt>Change</dt>
          <dd>{changeText(f)}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{f.current?.source ?? "No reading"}</dd>
        </div>
      </dl>
      <p className="finding-summary">{f.explanation}</p>
      <details className="reasoning" open>
        <summary>Inspect calculation and interpretation</summary>
        {f.current && f.baseline !== null && (
          <div className="calculation">
            <span className="label">Calculation</span>
            <p>
              {f.indicator === "co2"
                ? `${f.current.value} − 3 = ${(f.current.value - 3).toFixed(1)} mmHg above/below the one-hour reference`
                : f.indicator === "radiation"
                  ? `${f.current.value} / 600 × 100 = ${((f.current.value / 600) * 100).toFixed(1)}% of the career reference`
                  : `100 × (${f.current.value} − ${f.baseline}) / ${f.baseline} = ${f.change?.toFixed(1)}%`}
            </p>
          </div>
        )}
        <dl className="qa">
          {rows.map(([q, a]) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
          <div>
            <dt>Evidence</dt>
            <dd>
              <ul className="evidence-links">
                {f.evidenceIds.map((id) => (
                  <li key={id}>
                    <button
                      className="btn btn-link"
                      onClick={() => open({ type: "evidence", id })}
                    >
                      <BookOpen size={15} aria-hidden="true" />
                      {evidenceFor(id).title}
                    </button>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </details>
      <div className="actions">
        {f.indicator === "reaction" && (
          <button
            className="btn btn-primary"
            onClick={() => {
              open(null);
              go({ kind: "app", page: "countermeasures", tab: "cognitive" });
            }}
          >
            <Target size={16} aria-hidden="true" /> Run reaction-time assessment
          </button>
        )}
        {f.indicator !== "radiation" &&
          f.indicator !== "co2" &&
          f.indicator !== "strength" && (
            <button
              className="btn btn-secondary"
              onClick={() => open({ type: "log", indicator: f.indicator })}
            >
              <Plus size={16} aria-hidden="true" /> Log a repeat reading
            </button>
          )}
        {state.voice &&
          (speaking ? (
            <button
              className="btn btn-quiet"
              onClick={() => {
                speechSynthesis.cancel();
                setSpeaking(false);
              }}
            >
              <Square size={14} aria-hidden="true" /> Stop
            </button>
          ) : (
            <button
              className="btn btn-quiet"
              onClick={() => {
                speak(f);
                setSpeaking(true);
              }}
            >
              <Volume2 size={16} aria-hidden="true" /> Read aloud
            </button>
          ))}
      </div>
      <p className="muted small provenance">
        {f.rule.id} v{f.rule.version} · calculated for{" "}
        {f.generatedAt.replace("T", " ").slice(0, 16)} UTC (simulated clock) ·
        not a diagnosis
      </p>
    </article>
  );
}

const TYPE_LABEL = {
  standard: "NASA standard",
  research: "NASA research",
  context: "NASA program context",
} as const;

function EvidenceView({ id }: { id: string }) {
  const { open } = useWs();
  const e = evidenceFor(id);
  return (
    <div className="evidence">
      <nav className="evidence-nav" aria-label="Evidence records">
        {evidence.map((x) => (
          <button
            key={x.id}
            aria-current={x.id === id ? "true" : undefined}
            onClick={() => open({ type: "evidence", id: x.id })}
          >
            <span>{x.title}</span>
            <small>{TYPE_LABEL[x.type]}</small>
          </button>
        ))}
      </nav>
      <article className="evidence-body">
        <span className={`origin ${e.type === "standard" ? "nasa" : ""}`}>
          {TYPE_LABEL[e.type]} · stored locally
        </span>
        <h3 className="finding-title">{e.title}</h3>
        <dl className="qa">
          <div>
            <dt>Version</dt>
            <dd>{e.version}</dd>
          </div>
          <div>
            <dt>Section</dt>
            <dd>{e.section}</dd>
          </div>
          {e.limit !== undefined && (
            <div>
              <dt>Reference value</dt>
              <dd>
                {e.limit} {e.unit}
                {e.aggregation ? `, ${e.aggregation.replace(/_/g, " ")}` : ""}
              </dd>
            </div>
          )}
          <div>
            <dt>How ASTRAMED uses it</dt>
            <dd>{e.statement}</dd>
          </div>
          <div>
            <dt>Limitations</dt>
            <dd>{e.limitations}</dd>
          </div>
          <div>
            <dt>Verification</dt>
            <dd>
              {e.verified
                ? "Checked against the original NASA source on 14 November 2026. The cited revision is pinned; this does not certify mission applicability."
                : "Not verified."}
            </dd>
          </div>
        </dl>
        <a
          className="btn btn-secondary"
          href={e.url}
          target="_blank"
          rel="noreferrer"
        >
          Open original NASA source{" "}
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
        <p className="muted small">
          This summary works offline. The original source needs a connection.
        </p>
      </article>
    </div>
  );
}

function LogReading({
  initial,
  onDone,
}: {
  initial: Indicator;
  onDone: () => void;
}) {
  const { state, setState, astronaut, notify, setIndicator, setHazard } =
    useWs();
  const loggable = metrics.filter(
    (m) => m.id !== "radiation" && m.id !== "strength",
  );
  const [id, setId] = useState<Indicator>(
    loggable.some((m) => m.id === initial) ? initial : "reaction",
  );
  const [value, setValue] = useState("");
  const [time, setTime] = useState("14:00");
  const [average, setAverage] = useState(false);
  const [error, setError] = useState("");
  const m = metricFor(id);
  const date = dayTimestamp(state.day).slice(0, 10);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const iso = /^\d{2}:\d{2}$/.test(time) ? `${date}T${time}:00.000Z` : "";
    const err =
      value.trim() === ""
        ? "Enter a value."
        : validateReading(id, Number(value), iso, m.unit, state.day);
    if (err) return setError(err);
    if (id === "co2" && !average)
      return setError(
        "Confirm that this is a one-hour average, not an instantaneous reading.",
      );
    const reading: Measurement = {
      id: crypto.randomUUID(),
      astronautId: astronaut.id,
      scenario: state.scenario,
      indicator: id,
      value: Number(value),
      unit: m.unit,
      day: state.day,
      timestamp: iso,
      source: "Manual entry",
      quality: "user_reported",
      aggregation: id === "co2" ? "one_hour_average" : undefined,
    };
    if (
      state.readings.some(
        (x) =>
          x.indicator === id &&
          x.astronautId === astronaut.id &&
          x.timestamp === iso &&
          x.scenario === state.scenario,
      )
    )
      return setError(
        "A reading already exists for this indicator at that time.",
      );
    setState((s) => ({ ...s, readings: [...s.readings, reading] }));
    setHazard("All hazards");
    setIndicator(id);
    notify(
      `Saved ${value} ${m.unit} for ${m.short.toLowerCase()} on day ${state.day}. Trend and findings recalculated.`,
    );
    onDone();
  };
  return (
    <form className="form" onSubmit={submit} noValidate>
      <p className="muted">
        For {astronaut.name}, mission day {state.day}. Demonstration values
        only; stored in this browser.
      </p>
      <label className="field-label">
        Indicator
        <select
          className="field"
          aria-label="Indicator"
          value={id}
          onChange={(e) => {
            setId(e.target.value as Indicator);
            setValue("");
            setError("");
          }}
        >
          {loggable.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
      </label>
      <div className="form-row">
        <label className="field-label">
          Value ({m.unit})
          <input
            className="field"
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!!error}
            aria-describedby="log-hint log-err"
          />
        </label>
        <label className="field-label">
          Time (UTC, simulated)
          <input
            className="field"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
      </div>
      <p id="log-hint" className="muted small">
        Accepted input range {m.min}–{m.max} {m.unit}: a data-quality check, not
        a medical limit. The chart uses the latest reading of each day.
      </p>
      {id === "co2" && (
        <label className="check">
          <input
            type="checkbox"
            checked={average}
            onChange={(e) => setAverage(e.target.checked)}
          />{" "}
          This is a one-hour average partial pressure
        </label>
      )}
      <p id="log-err" className="error" role="alert">
        {error}
      </p>
      <div className="actions">
        <button className="btn btn-primary" type="submit">
          <Plus size={16} aria-hidden="true" /> Save reading
        </button>
        <button type="button" className="btn btn-quiet" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function MissionDialog({ close }: { close: () => void }) {
  const { state, environment, astronaut, go } = useWs();
  return (
    <Dialog title="Mission details" onClose={close}>
      <dl className="qa">
        <div>
          <dt>Mission</dt>
          <dd>{mission.name} · fictional long-duration Mars transit</dd>
        </div>
        <div>
          <dt>Crew</dt>
          <dd>{astronauts.map((a) => a.name).join(", ")}</dd>
        </div>
        <div>
          <dt>Mission day</dt>
          <dd>{state.day} (simulated record ends at day 94)</dd>
        </div>
        <div>
          <dt>Environment context</dt>
          <dd>
            {environment.name} · {environment.gravity}
          </dd>
        </div>
        <div>
          <dt>Communication delay</dt>
          <dd>{environment.delay}</dd>
        </div>
        <div>
          <dt>Scenario</dt>
          <dd>{scenarios[state.scenario]}</dd>
        </div>
        <div>
          <dt>Profile</dt>
          <dd>
            {astronaut.name} · {astronaut.role} ·{" "}
            <span className="mono">{astronaut.designation}</span>
          </dd>
        </div>
      </dl>
      <div className="actions">
        <button
          className="btn btn-secondary"
          onClick={() => {
            close();
            go({ kind: "entry", screen: "briefing" });
          }}
        >
          Open full briefing
        </button>
      </div>
    </Dialog>
  );
}

function SettingsDialog({ close }: { close: () => void }) {
  const { state, update, setState, notify, findings, speak, go } = useWs();
  const top =
    findings.find((f) => f.status === "Alert" || f.status === "Review") ??
    findings[0];
  return (
    <Dialog title="Demo & preferences" onClose={close}>
      <div className="settings">
        <fieldset className="simulation-settings">
          <legend>Simulation controls</legend>
          <p className="muted small">
            Change the scenario or replay a mission day. Saved records remain
            available in their original scenario.
          </p>
          <div className="form-row">
            <label className="field-label">
              Demo scenario
              <select
                aria-label="Demo scenario"
                className="field"
                value={state.scenario}
                onChange={(e) =>
                  update({ scenario: e.target.value as Scenario })
                }
              >
                {Object.entries(scenarios).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Mission day
              <select
                aria-label="Mission day"
                className="field"
                value={state.day}
                onChange={(e) => update({ day: Number(e.target.value) })}
              >
                {Array.from({ length: 94 }, (_, i) => 94 - i).map((d) => (
                  <option key={d} value={d}>
                    Day {d}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
        <div className="setting">
          <div>
            <strong>Spoken notifications</strong>
            <p className="muted small">
              Uses your browser’s speech synthesis and the same calculated
              finding shown on screen. Plays after you save an assessment or
              press Read aloud; never repeats automatically. Voice availability
              depends on the browser and installed voices.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            aria-pressed={state.voice}
            onClick={() => {
              if (!("speechSynthesis" in window))
                return notify(
                  "Speech synthesis is unavailable in this browser.",
                );
              if (state.voice) speechSynthesis.cancel();
              update({ voice: !state.voice });
            }}
          >
            {state.voice ? "On" : "Off"}
          </button>
        </div>
        <div className="actions">
          <button
            className="btn btn-quiet"
            disabled={!state.voice}
            onClick={() => speak(top)}
          >
            <Volume2 size={15} aria-hidden="true" /> Replay top finding
          </button>
          <button
            className="btn btn-quiet"
            onClick={() =>
              "speechSynthesis" in window && speechSynthesis.cancel()
            }
          >
            <Square size={14} aria-hidden="true" /> Stop speaking
          </button>
        </div>
        <div className="setting">
          <div>
            <strong>Export local records</strong>
            <p className="muted small">
              Readings, assessments, check-ins and progress as JSON.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(state, null, 2)], {
                  type: "application/json",
                }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "astramed-demo-records.json";
              a.click();
              URL.revokeObjectURL(url);
              notify("Local records exported.");
            }}
          >
            <Download size={15} aria-hidden="true" /> Export
          </button>
        </div>
        <div className="setting">
          <div>
            <strong>Reset demonstration</strong>
            <p className="muted small">
              Back to Alex Morgan, scenario B, day 94, Mars transit. Clears
              logged readings, assessments, check-ins and progress.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              if (
                !confirm(
                  "Reset this demonstration and clear locally saved readings, assessments, check-ins and activities?",
                )
              )
                return;
              if ("speechSynthesis" in window) speechSynthesis.cancel();
              setState((s) => ({ ...initialState(), session: s.session }));
              close();
              go({ kind: "app", page: "health" });
              notify("Demo reset.");
            }}
          >
            <RefreshCw size={15} aria-hidden="true" /> Reset demo
          </button>
        </div>
        <details>
          <summary>Transparency and provenance</summary>
          <p className="muted small">
            Synthetic history is deterministic. Seeded preflight values are not
            clinical reference intervals. Code and documentation were produced
            with AI assistance and need independent review. No NASA endorsement
            is implied. Environment selection changes context, not limits. No
            NASA experimental dataset is incorporated. Environments available:{" "}
            {environments.map((e) => e.name).join(", ")}.
          </p>
        </details>
      </div>
    </Dialog>
  );
}
