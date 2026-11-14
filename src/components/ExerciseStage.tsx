import { useEffect, useState } from "react";
import type { Activity, ExerciseClip, SessionMetrics } from "../types";
import { BodyMap } from "./BodyMap";
import { DEMO_BODY_MASS_KG, DEMO_MAX_HR, PLAN, REPS_PER_SET, formatClock, hrStats, startDemo, stepDemo, strengthStats } from "../engine/session";
import type { Bests, Kind } from "../engine/session";

const SPEEDS = [1, 10, 60];
const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const reduceMotion = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export interface StageSave { seconds: number; metrics: SessionMetrics }

/**
 * Exercise page: live metrics on the left, the looping clip with a session bar in the middle,
 * worked muscles and personal records on the right. Values come from a simulated demo session.
 */
export function ExerciseStage({ a, restHr, bests, streak, broken, onSave }: {
  a: Activity;
  restHr: number;
  bests: Bests;
  streak: number;
  broken: string[];
  onSave: (s: StageSave) => void;
}) {
  const kind = a.kind as Kind;
  const plan = PLAN[kind];
  const load = a.demoLoad ?? 0;
  const [demo, setDemo] = useState(() => startDemo(restHr));
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(10);

  useEffect(() => {
    if (!running) return;
    let carry = 0;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      carry += ((now - last) / 1000) * speed;
      last = now;
      const whole = Math.floor(carry);
      if (!whole) return;
      carry -= whole;
      setDemo((d) => stepDemo(d, whole, kind, restHr, load));
    }, 200);
    return () => clearInterval(id);
  }, [running, speed, kind, restHr, load]);

  const done = demo.sec >= plan.maxSec;
  const hr = hrStats(demo.samples);
  const st = strengthStats(demo.sets);
  const hrNow = Math.round(demo.hr);
  const wob = (amp: number) => Math.sin(demo.sec / 5) * amp;
  const setting = (id: string) => a.settings?.find((s) => s.id === id)?.initial ?? 0;

  const rows: [string, string][] = kind === "aerobic" ? [
    ["Duration", formatClock(demo.sec)],
    ...(a.id === "treadmill" ? [
      ["Speed", `${fmt(setting("speed") + wob(0.2), 1)} km/h`],
      ["Harness load", `${fmt(setting("harness"))}% BW`],
    ] as [string, string][] : [
      ["Power", `${fmt(setting("power") + wob(6))} W`],
      ["Cadence", `${fmt(setting("cadence") + wob(3))} rpm`],
    ] as [string, string][]),
    ["Heart rate", `${hrNow} bpm`],
    ["Average heart rate", hr.avg ? `${fmt(hr.avg)} bpm` : "–"],
    ["Share of max heart rate", `${fmt((demo.hr / DEMO_MAX_HR) * 100)}%`],
    ["Time at 70% or more", formatClock(hr.secAbove70)],
    ["Time at 90% or more", formatClock(hr.secAbove90)],
  ] : kind === "strength" ? [
    ["Load", `${fmt(load)} kg`],
    ["Reps this set", demo.restLeft ? `Rest ${formatClock(demo.restLeft)}` : `${demo.repInSet} of ${REPS_PER_SET}`],
    ["Sets done", fmt(st.sets)],
    ["Volume", `${fmt(st.volume)} kg`],
    ["Load ÷ body mass", `${fmt(load / DEMO_BODY_MASS_KG, 2)} ×`],
    ["Estimated max", st.estMax ? `${fmt(st.estMax, 1)} kg` : "–"],
    ["Heart rate", `${hrNow} bpm`],
  ] : [
    ["Duration", formatClock(demo.sec)],
    ["Reps this set", demo.restLeft ? `Rest ${formatClock(demo.restLeft)}` : `${demo.repInSet} of ${REPS_PER_SET}`],
    ["Total reps", fmt(st.reps + demo.repInSet)],
    ["Sets done", fmt(st.sets)],
    ["Heart rate", `${hrNow} bpm`],
    ["Average heart rate", hr.avg ? `${fmt(hr.avg)} bpm` : "–"],
  ];

  const save = () => {
    const metrics: SessionMetrics = { avgHr: Math.round(hr.avg) || undefined, peakHr: Math.round(hr.peak) || undefined };
    if (kind === "aerobic") {
      Object.assign(metrics, { secAbove70: hr.secAbove70, secAbove90: hr.secAbove90 });
      for (const s of a.settings ?? []) (metrics as Record<string, number>)[s.id] = s.initial;
    } else {
      Object.assign(metrics, { sets: st.sets, reps: st.reps });
      if (kind === "strength") Object.assign(metrics, { volume: Math.round(st.volume), topLoad: st.topLoad, estMax: Math.round(st.estMax * 10) / 10, loadRatio: Math.round(st.loadRatio * 100) / 100 });
    }
    onSave({ seconds: demo.sec, metrics });
    setDemo(startDemo(restHr));
  };

  const pct = (demo.sec / plan.maxSec) * 100;
  const minPct = (plan.minSec / plan.maxSec) * 100;
  const records: [string, string][] = kind === "aerobic" ? [
    ["Longest session", bests.longestSec ? formatClock(bests.longestSec) : "–"],
    ["Most time at 70% or more", bests.secAbove70 ? formatClock(bests.secAbove70) : "–"],
  ] : kind === "strength" ? [
    ["Estimated max", bests.estMax ? `${fmt(bests.estMax, 1)} kg` : "–"],
    ["Heaviest set", bests.topLoad ? `${fmt(bests.topLoad)} kg` : "–"],
    ["Best volume", bests.volume ? `${fmt(bests.volume)} kg` : "–"],
  ] : [
    ["Most reps", bests.reps ? fmt(bests.reps) : "–"],
    ["Longest session", bests.longestSec ? formatClock(bests.longestSec) : "–"],
  ];

  return (
    <section className="xs" aria-label={`${a.title} session`}>
      <div className="xs-metrics">
        <p className="xs-eyebrow">Live session <span className="muted">· simulated</span></p>
        <dl>
          {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <p className="xs-note">Demo values. Heart rate is simulated; a real build would read a wearable. Max heart rate {DEMO_MAX_HR} bpm and body mass {DEMO_BODY_MASS_KG} kg are demo values.</p>
      </div>

      <div className="xs-center">
        <div className="xs-bar" role="group" aria-label="Session progress">
          <div className="xs-bar-head">
            <span className="xs-clock">{formatClock(demo.sec)}<span className="muted"> / {formatClock(plan.maxSec)}</span></span>
            <span className="muted small">{plan.label}</span>
          </div>
          <div className="xs-track" role="progressbar" aria-label="Session time" aria-valuemin={0} aria-valuemax={plan.maxSec} aria-valuenow={demo.sec} aria-valuetext={`${formatClock(demo.sec)} of ${formatClock(plan.maxSec)}`}>
            {plan.minSec < plan.maxSec && <span className="xs-zone" style={{ left: `${minPct}%` }} />}
            <span className="xs-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="xs-controls">
            <button className="btn btn-link sm" onClick={() => setRunning((r) => !r)} disabled={done}>{running && !done ? "Pause" : "Resume"}</button>
            <button className="btn btn-link sm" onClick={() => { setDemo(startDemo(restHr)); setRunning(true); }}>Restart</button>
            <span className="xs-speed" role="group" aria-label="Demo speed">
              {SPEEDS.map((s) => <button key={s} className="btn btn-link sm" aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s}×</button>)}
            </span>
            <button className="btn btn-secondary sm xs-save" onClick={save} disabled={demo.sec < 1}>Save session</button>
          </div>
        </div>
        {a.clip ? <Clip clip={a.clip} /> : <div className="xs-noclip">No demonstration clip for this exercise yet.</div>}
      </div>

      {a.muscles && (
        <div className="xs-body">
          <p className="xs-eyebrow">Muscles worked</p>
          <BodyMap primary={a.muscles.primary} secondary={a.muscles.secondary} />
        </div>
      )}

      <div className="xs-records">
        <p className="xs-eyebrow">Best record</p>
        <dl>{records.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {broken.length > 0 && <p className="xs-new" role="status">New best: {broken.join(", ")}</p>}
        <p className="xs-eyebrow spaced">Streak</p>
        <p className="xs-streak">{streak} {streak === 1 ? "day" : "days"}</p>
        <p className="xs-note">Compared only with your own saved sessions. Missed days are never penalised.</p>
      </div>
    </section>
  );
}

function Clip({ clip }: { clip: ExerciseClip }) {
  return (
    <figure className="xs-clip">
      <video src={`${import.meta.env.BASE_URL}${clip.src}`} autoPlay={!reduceMotion} controls={reduceMotion} muted loop playsInline preload="auto" aria-label={`Looping demonstration: ${clip.shows}`} />
      <figcaption className="video-credit">
        {clip.credit} · “{clip.title}”{clip.page && <> · <a href={clip.page} target="_blank" rel="noreferrer">Source</a></>}. {clip.shows}{clip.exact ? "" : " Shows the device, not this exact exercise."}
        {" "}Use does not imply endorsement of ASTRAMED.
      </figcaption>
    </figure>
  );
}
