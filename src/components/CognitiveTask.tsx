import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Play, RotateCcw } from "lucide-react";
import { BATTERY_PROTOCOL, TESTS, TRIAL_TIMEOUT_MS, codeKey, makeTrials, score, type Stimulus } from "../engine/battery";
import type { CogResult, CogTest, CogTrial, Scenario } from "../types";

type Phase = "intro" | "prime" | "sample" | "delay" | "stimulus" | "feedback" | "gap" | "done";

function Grid({ cells, label }: { cells: boolean[]; label: string }) {
  return (
    <div className="msp-grid" role="img" aria-label={label}>
      {cells.map((on, i) => <span key={i} className={on ? "on" : ""} />)}
    </div>
  );
}

export function CognitiveTask({ test, astronautId, scenario, day, onSave, onExit }: { test: CogTest; astronautId: string; scenario: Scenario; day: number; onSave: (r: CogResult) => void; onExit: () => void }) {
  const info = TESTS[test];
  const key = useMemo(() => codeKey(astronautId, day), [astronautId, day]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [practice, setPractice] = useState(info.practice > 0);
  const [trials, setTrials] = useState<Stimulus[]>([]);
  const [i, setI] = useState(0);
  const [log, setLog] = useState<CogTrial[]>([]);
  const [feedback, setFeedback] = useState("");
  const [saved, setSaved] = useState(false);
  const onset = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const live = useRef({ phase, i, practice, trials, log });
  live.current = { phase, i, practice, trials, log };
  const clear = () => { if (timer.current) clearTimeout(timer.current); };
  const answerRef = useRef<(choice: 0 | 1 | null) => void>(() => {});
  const timeout = () => answerRef.current(null);
  useEffect(() => clear, []);

  const show = useCallback((idx: number, list: Stimulus[]) => {
    clear();
    const s = list[idx];
    if (s.kind === "grid") {
      setPhase("sample");
      timer.current = setTimeout(() => {
        setPhase("delay");
        timer.current = setTimeout(() => { onset.current = performance.now(); setPhase("stimulus"); timer.current = setTimeout(timeout, TRIAL_TIMEOUT_MS); }, 5000);
      }, 2000);
    } else {
      onset.current = performance.now();
      setPhase("stimulus");
      timer.current = setTimeout(timeout, TRIAL_TIMEOUT_MS);
    }
  }, []);  

  const begin = (isPractice: boolean) => {
    const n = isPractice ? info.practice : info.trials;
    const list = makeTrials(test, n, Math.random, key);
    setTrials(list); setI(0); setPractice(isPractice); setFeedback("");
    if (!isPractice) setLog([]);
    if (list[0].kind === "digit") {
      setPhase("prime");
      clear();
      timer.current = setTimeout(() => show(0, list), 1500);
    } else show(0, list);
  };

  const answer = useCallback((choice: 0 | 1 | null) => {
    const { phase: ph, i: idx, practice: pr, trials: list, log: lg } = live.current;
    if (ph !== "stimulus") return;
    clear();
    const rt = performance.now() - onset.current;
    const correct = choice === null ? null : choice === list[idx].answer;
    const next = idx + 1;
    const finish = () => {
      if (next < list.length) { setI(next); setPhase("gap"); timer.current = setTimeout(() => show(next, list), 350); }
      else if (pr) { setPhase("intro"); setPractice(false); setFeedback("Practice finished. The scored trials do not show feedback."); }
      else setPhase("done");
    };
    if (!pr) setLog([...lg, { correct, rtMs: Math.round(rt) }]);
    if (pr) {
      setFeedback(correct === null ? "No response" : correct ? "Correct" : "Incorrect");
      setPhase("feedback");
      timer.current = setTimeout(finish, 800);
    } else finish();
  }, [show]);
  answerRef.current = answer;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (live.current.phase !== "stimulus" || e.repeat) return;
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "f") { e.preventDefault(); answer(0); }
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "j") { e.preventDefault(); answer(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer]);

  const s = trials[i];
  const result = phase === "done" ? score(log, test) : null;
  const showKey = test === "CDS" && phase !== "intro" && phase !== "done";

  return (
    <div className="cog-task">
      <div className="cog-task-head">
        <div>
          <span className="label">{info.domain}</span>
          <h3 className="h3">{info.name} <span className="muted mono">({test})</span></h3>
        </div>
        <button className="btn btn-link sm" onClick={() => { clear(); onExit(); }}>All tests</button>
      </div>

      {phase === "intro" && (
        <div className="cog-intro">
          <p>{info.task}</p>
          <p className="muted small">Respond with the buttons or the keyboard: <kbd>F</kbd> or <kbd>←</kbd> for “{info.choices[0]}”, <kbd>J</kbd> or <kbd>→</kbd> for “{info.choices[1]}”. Each trial times out after {TRIAL_TIMEOUT_MS / 1000} s. Work quickly but accurately.</p>
          {feedback && <p className="tone ok small" role="status">{feedback}</p>}
          <div className="actions">
            {practice && info.practice > 0 ? (
              <button className="btn btn-primary" onClick={() => begin(true)}><Play size={16} aria-hidden="true" /> Start practice ({info.practice} trials)</button>
            ) : (
              <button className="btn btn-primary" onClick={() => begin(false)}><Play size={16} aria-hidden="true" /> Start {info.trials} scored trials</button>
            )}
            {practice && info.practice > 0 && <button className="btn btn-quiet" onClick={() => begin(false)}>Skip practice</button>}
          </div>
        </div>
      )}

      {showKey && (
        <div className="code-key" aria-label="Code key">
          {Object.entries(key).map(([sym, d]) => <span key={sym}><b aria-hidden="true">{sym}</b><i>{d}</i></span>)}
        </div>
      )}

      {phase !== "intro" && phase !== "done" && (
        <>
          <p className="muted small" aria-live="polite">{practice ? "Practice" : "Scored"} trial {Math.min(i + 1, trials.length)} of {trials.length}</p>
          <div className={`cog-stage ${phase}`}>
            {phase === "prime" && s?.kind === "digit" && <><span className="muted small">Remember this digit</span><span className="cog-digit">{s.previous}</span></>}
            {phase === "sample" && s?.kind === "grid" && <><span className="muted small">Study this pattern</span><Grid cells={s.sample} label="Sample pattern" /></>}
            {phase === "delay" && <span className="muted">Hold the pattern in mind…</span>}
            {phase === "feedback" && <span className={feedback === "Correct" ? "tone ok" : "tone warn"}>{feedback}</span>}
            {phase === "stimulus" && s && (
              s.kind === "pair" ? <span className="cog-pair"><b aria-label={`symbol ${s.symbol}`}>{s.symbol}</b><span>{s.digit}</span></span>
              : s.kind === "math" ? <span className="cog-math">{s.text}</span>
              : s.kind === "digit" ? <span className="cog-digit">{s.digit}</span>
              : <div className="msp-choice"><Grid cells={s.left} label="Left pattern" /><Grid cells={s.right} label="Right pattern" /></div>
            )}
          </div>
          <div className="cog-choices">
            <button className="btn btn-secondary btn-lg" disabled={phase !== "stimulus"} onClick={() => answer(0)}>{info.choices[0]} <kbd>F</kbd></button>
            <button className="btn btn-secondary btn-lg" disabled={phase !== "stimulus"} onClick={() => answer(1)}>{info.choices[1]} <kbd>J</kbd></button>
          </div>
        </>
      )}

      {phase === "done" && result && (
        <div className="assessment-result">
          <span className="label">{info.name} complete</span>
          <h3>{result.correct} of {result.total} correct · {result.accuracy.toFixed(0)}%</h3>
          <p className="muted">
            Median response time: {result.medianRt === null ? "—" : `${Math.round(result.medianRt)} ms`} · Throughput: {result.throughput === null ? "—" : `${result.throughput.toFixed(1)} correct/min`}
            {result.lapses !== undefined && ` · ${result.lapses} lapses (over 700 ms)`} · {log.filter((t) => t.correct === null).length} timed out
          </p>
          {test === "CDS" && <p className="muted small">Code Substitution is the learning step for the delayed test (CDD), so it is not compared with a baseline. Run CDD at the end of the battery.</p>}
          <div className="actions">
            <button className="btn btn-primary" disabled={saved} onClick={() => {
              onSave({ id: crypto.randomUUID(), test, astronautId, scenario, day, timestamp: new Date().toISOString(), protocol: BATTERY_PROTOCOL, trials: log, ...result });
              setSaved(true);
            }}><Check size={16} aria-hidden="true" /> {saved ? "Saved" : "Save result"}</button>
            <button className="btn btn-quiet" onClick={() => { setPhase("intro"); setPractice(false); setSaved(false); setFeedback(""); }}><RotateCcw size={14} aria-hidden="true" /> Run again</button>
          </div>
        </div>
      )}
    </div>
  );
}
