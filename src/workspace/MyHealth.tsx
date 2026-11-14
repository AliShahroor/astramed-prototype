import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, Minus, Plus, Target } from "lucide-react";
import { hazardContext, hazards, metricFor, metrics } from "../data/catalog";
import { evidenceFor } from "../data/evidence";
import { dayTimestamp, doseUtilization, selectSeries } from "../engine/monitoring";
import { TrendChart } from "../components/TrendChart";
import type { Finding, Hazard } from "../types";
import { StatusTag, useWs } from "./context";

export function formatValue(f: Finding) {
  const m = metricFor(f.indicator);
  return f.current ? `${f.current.value.toFixed(m.decimals)} ${m.unit}` : "—";
}
export function referenceText(f: Finding) {
  const m = metricFor(f.indicator);
  if (f.indicator === "co2") return `${evidenceFor("co2").limit} mmHg NASA reference (1 h average)`;
  if (f.indicator === "radiation") return `${evidenceFor("radiation").limit} mSv NASA career reference`;
  return f.baseline === null ? "No baseline" : `${f.baseline} ${m.unit} personal baseline`;
}
export function changeText(f: Finding) {
  if (f.indicator === "co2" && f.current) {
    const d = f.current.value - evidenceFor("co2").limit!;
    return `${d > 0 ? "+" : ""}${d.toFixed(1)} mmHg vs reference`;
  }
  if (f.indicator === "radiation" && f.current) return `${doseUtilization(f.current.value, f.current.unit)?.toFixed(1)}% of career reference`;
  return f.change === null ? "No comparison" : `${f.change >= 0 ? "+" : ""}${f.change.toFixed(1)}% vs baseline`;
}

export function MyHealth() {
  const { astronaut, findings, state, range, setRange, indicator, setIndicator, hazard, setHazard, open, environment, mission } = useWs();
  const active = findings.filter((f) => f.status === "Review" || f.status === "Alert");
  const primary = active[0];
  const others = active.slice(1);
  const insufficient = findings.filter((f) => f.status === "Insufficient data").length;
  const visible = metrics.filter((m) => hazard === "All hazards" || m.hazards.includes(hazard));
  const shown = visible.some((m) => m.id === indicator) ? indicator : visible[0].id;
  const trend = selectSeries(mission.rows, astronaut.id, state.scenario, shown, state.day, range);
  const alerts = active.filter((f) => f.status === "Alert").length;

  const pickHazard = (h: Hazard) => {
    setHazard(h);
    const avail = metrics.filter((m) => h === "All hazards" || m.hazards.includes(h));
    if (!avail.some((m) => m.id === indicator)) setIndicator(avail[0].id);
  };

  const summary = primary
    ? `${active.length} ${active.length === 1 ? "observation needs" : "observations need"} your attention${alerts ? `, including ${alerts} reference ${alerts === 1 ? "exceedance" : "exceedances"}` : ""}.`
    : `No prototype flags on mission day ${state.day}.`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">My Health</h1>
          <p className="page-sub">
            {astronaut.name} · {astronaut.role} · {environment.name} · record of {dayTimestamp(state.day).slice(0, 10)} (simulated clock)
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => open({ type: "log" })}>
          <Plus size={16} aria-hidden="true" /> Log reading
        </button>
      </div>

      <section className="overview" aria-labelledby="status-h">
        <div className="overview-status">
          <h2 id="status-h" className="h2">Current status</h2>
          <p className="status-line">{summary}</p>
          <p className="muted small">
            Compared with your own preflight baseline over the last {range === 94 ? "full mission" : `${range} days`}. This is not a health score.
            {insufficient > 0 && ` ${insufficient} ${insufficient === 1 ? "indicator has" : "indicators have"} insufficient data for this day.`}
          </p>
        </div>
        <dl className="vitals" aria-label="Key measurements">
          {(["reaction", "sleep", "heart"] as const).map((id) => {
            const f = findings.find((x) => x.indicator === id)!;
            const m = metricFor(id);
            const up = (f.change ?? 0) > 0.05, down = (f.change ?? 0) < -0.05;
            return (
              <div key={id} className="vital">
                <dt>
                  <button className="link-plain" onClick={() => { setHazard("All hazards"); setIndicator(id); document.getElementById("trends")?.scrollIntoView({ behavior: "smooth" }); }}>
                    {m.short}
                  </button>
                </dt>
                <dd>
                  <span className="vital-value">{f.current ? f.current.value.toFixed(m.decimals) : "—"}<span className="unit"> {m.unit}</span></span>
                  <span className={`vital-delta ${f.status === "Review" ? "warn" : ""}`}>
                    {up ? <ArrowUpRight size={14} aria-hidden="true" /> : down ? <ArrowDownRight size={14} aria-hidden="true" /> : <Minus size={14} aria-hidden="true" />}
                    {f.change === null ? "no baseline" : `${Math.abs(f.change).toFixed(1)}% ${up ? "above" : down ? "below" : "from"} ${f.baseline} ${m.unit}`}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      {primary ? (
        <section className={`finding ${primary.status === "Alert" ? "is-alert" : "is-review"}`} aria-labelledby="finding-h">
          <div className="finding-meta">
            <StatusTag status={primary.status} />
            <span className="muted small">{primary.rule.origin}</span>
          </div>
          <h2 id="finding-h" className="finding-title">{primary.title}</h2>
          <p className="finding-summary">{primary.explanation}</p>
          <dl className="facts">
            <div><dt>Observed</dt><dd>{formatValue(primary)}</dd></div>
            <div><dt>Compared with</dt><dd>{referenceText(primary)}</dd></div>
            <div><dt>Change</dt><dd>{changeText(primary)}</dd></div>
            <div><dt>Period</dt><dd>{primary.window} · {primary.persistence} consecutive {primary.persistence === 1 ? "day" : "days"} meeting the rule</dd></div>
          </dl>
          <div className="finding-next">
            <span className="label">Next check</span>
            <p>{primary.next}</p>
          </div>
          <div className="actions">
            <button className="btn btn-primary" onClick={() => open({ type: "finding", indicator: primary.indicator })}>
              Open health card <ArrowRight size={16} aria-hidden="true" />
            </button>
            {primary.indicator === "reaction" && (
              <a className="btn btn-secondary" href="#/countermeasures/cognitive">
                <Target size={16} aria-hidden="true" /> Run reassessment
              </a>
            )}
            <button className="btn btn-link" onClick={() => open({ type: "evidence", id: primary.evidenceIds.at(-1)! })}>
              <BookOpen size={15} aria-hidden="true" /> {evidenceFor(primary.evidenceIds.at(-1)!).title}
            </button>
          </div>
          {others.length > 0 && (
            <div className="also">
              <h3 className="label">Also under review</h3>
              <ul>
                {others.map((f) => (
                  <li key={f.id}>
                    <button className="row-btn" onClick={() => open({ type: "finding", indicator: f.indicator })}>
                      <StatusTag status={f.status} plain />
                      <span className="grow">{f.title}</span>
                      <span className="muted">{formatValue(f)} · {changeText(f)}</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <section className="finding is-clear" aria-label="No active findings">
          <h2 className="finding-title">No active findings</h2>
          <p className="finding-summary">
            None of the implemented rules is triggered on day {state.day}. That is not a statement of good health: rules cover only some indicators, and symptoms or concerns should be raised with the crew medical officer regardless of this display.
          </p>
        </section>
      )}

      <section id="trends" className="trends" aria-labelledby="trends-h">
        <div className="section-head">
          <h2 id="trends-h" className="h2">Trends</h2>
          <div className="segmented" role="group" aria-label="Time range">
            {[7, 14, 30, 94].map((n) => (
              <button key={n} aria-pressed={range === n} onClick={() => setRange(n)}>{n === 94 ? "Mission" : `${n} days`}</button>
            ))}
          </div>
        </div>
        <div className="hazards" role="group" aria-label="NASA hazard filter">
          {hazards.map((h) => (
            <button key={h} className="chip" aria-pressed={hazard === h} onClick={() => pickHazard(h)}>{h === "All hazards" ? "All indicators" : h}</button>
          ))}
          <button className="btn btn-link sm" onClick={() => open({ type: "evidence", id: "hazards" })}>About the five hazards</button>
        </div>
        <p className="hazard-note">{hazardContext[hazard]}</p>
        <div className="trend-grid">
          <ul className="indicator-list" aria-label="Indicators">
            {visible.map((m) => {
              const f = findings.find((x) => x.indicator === m.id)!;
              return (
                <li key={m.id}>
                  <button className="indicator" aria-pressed={shown === m.id} onClick={() => setIndicator(m.id)}>
                    <span className="indicator-top">
                      <span className="indicator-name">{m.short}</span>
                      <span className="indicator-value">{formatValue(f)}</span>
                    </span>
                    <span className="indicator-bottom">
                      <span>{changeText(f)}</span>
                      <StatusTag status={f.status} plain />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="chart-panel">
            <div className="chart-head">
              <div>
                <h3 className="h3">{metricFor(shown).label}</h3>
                <p className="muted small">{metricFor(shown).note}</p>
              </div>
              <button className="btn btn-link sm" onClick={() => open({ type: "finding", indicator: shown })}>Explain this indicator</button>
            </div>
            <TrendChart key={shown} rows={trend} indicator={shown} baseline={astronaut.baseline[shown].value} />
          </div>
        </div>
      </section>
    </>
  );
}
