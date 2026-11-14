import type { CogResult, CogTest, CogTrial } from "../types";
import { median } from "./monitoring";

/**
 * Browser tasks modelled on the structure of WinSCAT subtests. They are Code Blue re-creations for demonstration,
 * not WinSCAT/ANAM, have no normative data and are not validated. Results are compared only with the same
 * astronaut's own earlier sessions.
 */
export const BATTERY_PROTOCOL = "CB-COG-1.0";
export const TRIAL_TIMEOUT_MS = 6000;
export const BASELINE_SESSIONS = 3;

export interface TestInfo {
  id: CogTest;
  name: string;
  domain: string;
  task: string;
  choices: [string, string];
  trials: number;
  practice: number;
}

export const TESTS: Record<CogTest, TestInfo> = {
  CDS: { id: "CDS", name: "Code Substitution (learning)", domain: "Learning", task: "A key pairs nine symbols with digits. Decide whether each symbol–digit pair shown matches the key.", choices: ["Match", "No match"], trials: 18, practice: 3 },
  MTH: { id: "MTH", name: "Mathematical Processing", domain: "Verbal working memory", task: "Solve the three-term problem and decide whether the answer is less than or greater than 5.", choices: ["Less than 5", "Greater than 5"], trials: 15, practice: 2 },
  CPT: { id: "CPT", name: "Running Memory Continuous Performance", domain: "Sustained attention and concentration", task: "Digits appear one at a time. Decide whether each digit is the same as the one just before it.", choices: ["Same", "Different"], trials: 20, practice: 3 },
  MTS: { id: "MTS", name: "Delayed Matching to Sample", domain: "Visual short-term memory", task: "Study a 4×4 pattern. After a 5-second delay, choose which of two patterns is identical to it.", choices: ["Left", "Right"], trials: 8, practice: 1 },
  CDD: { id: "CDD", name: "Code Substitution Delayed", domain: "Delayed recall memory", task: "Without the key, decide whether each symbol–digit pair matches the key you used in Code Substitution today.", choices: ["Match", "No match"], trials: 18, practice: 0 },
};
/** Order used in the NASA bed-rest report: CDD is always last so the CDS key must be recalled after a delay. */
export const ORDER: CogTest[] = ["CDS", "CPT", "MTH", "MTS", "CDD"];
/** CDS is the learning step for CDD and is not compared with a baseline. */
export const SCORED_TESTS: CogTest[] = ["CPT", "MTH", "MTS", "CDD"];
export const LAPSE_MS = 700;
export const SYMBOLS = ["▲", "●", "■", "◆", "★", "✚", "▼", "◀", "▶"];

export function seeded(seed: string): () => number {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const shuffle = <T,>(xs: T[], r: () => number) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Same key all day for one astronaut, so delayed recognition tests the key learned earlier that day. */
export function codeKey(astronautId: string, day: number): Record<string, number> {
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], seeded(`${astronautId}-${day}-key`));
  return Object.fromEntries(SYMBOLS.map((s, i) => [s, digits[i]]));
}

export type Stimulus =
  | { kind: "pair"; symbol: string; digit: number; answer: 0 | 1 }
  | { kind: "math"; text: string; value: number; answer: 0 | 1 }
  | { kind: "digit"; digit: number; previous: number; answer: 0 | 1 }
  | { kind: "grid"; sample: boolean[]; left: boolean[]; right: boolean[]; answer: 0 | 1 };

export function makeTrials(test: CogTest, n: number, r: () => number, key: Record<string, number>): Stimulus[] {
  const out: Stimulus[] = [];
  if (test === "CDS" || test === "CDD") {
    for (let i = 0; i < n; i++) {
      const symbol = SYMBOLS[Math.floor(r() * 9)];
      const match = r() < 0.5;
      let digit = key[symbol];
      if (!match) while (digit === key[symbol]) digit = 1 + Math.floor(r() * 9);
      out.push({ kind: "pair", symbol, digit, answer: match ? 0 : 1 });
    }
  } else if (test === "MTH") {
    while (out.length < n) {
      const a = 1 + Math.floor(r() * 9), b = 1 + Math.floor(r() * 9), c = 1 + Math.floor(r() * 9);
      const op1 = r() < 0.5 ? "+" : "−", op2 = r() < 0.5 ? "+" : "−";
      const value = (op1 === "+" ? a + b : a - b) + (op2 === "+" ? c : -c);
      if (value === 5) continue;
      out.push({ kind: "math", text: `${a} ${op1} ${b} ${op2} ${c}`, value, answer: value < 5 ? 0 : 1 });
    }
  } else if (test === "CPT") {
    let prev = Math.floor(r() * 10);
    for (let i = 0; i < n; i++) {
      const same = r() < 0.35;
      let d = prev;
      if (!same) while (d === prev) d = Math.floor(r() * 10);
      out.push({ kind: "digit", digit: d, previous: prev, answer: same ? 0 : 1 });
      prev = d;
    }
  } else {
    for (let i = 0; i < n; i++) {
      const cells = shuffle(Array.from({ length: 16 }, (_, k) => k), r).slice(0, 7);
      const sample = Array.from({ length: 16 }, (_, k) => cells.includes(k));
      const variant = [...sample];
      const on = shuffle(cells, r).slice(0, 2);
      const off = shuffle(Array.from({ length: 16 }, (_, k) => k).filter((k) => !sample[k]), r).slice(0, 2);
      on.forEach((k) => (variant[k] = false));
      off.forEach((k) => (variant[k] = true));
      const left = r() < 0.5;
      out.push({ kind: "grid", sample, left: left ? sample : variant, right: left ? variant : sample, answer: left ? 0 : 1 });
    }
  }
  return out;
}

export function score(trials: CogTrial[], test?: CogTest) {
  const total = trials.length;
  const correct = trials.filter((t) => t.correct === true).length;
  const answered = trials.filter((t) => t.correct !== null);
  const accuracy = total ? (correct / total) * 100 : 0;
  const medianRt = median(answered.map((t) => t.rtMs));
  const meanRt = answered.length ? answered.reduce((a, t) => a + t.rtMs, 0) / answered.length : null;
  // Throughput: estimated correct responses per minute = proportion correct × 60 000 / mean response time.
  const throughput = meanRt ? (correct / total) * (60000 / meanRt) : null;
  const lapses = test === "CPT" ? trials.filter((t) => t.correct === null || t.rtMs > LAPSE_MS).length : undefined;
  return { total, correct, accuracy, medianRt, throughput, lapses };
}

/** Personal baseline = median throughput of the astronaut's first sessions on that test. */
export function personalBaseline(results: CogResult[], test: CogTest, astronautId: string) {
  const first = results.filter((r) => r.test === test && r.astronautId === astronautId && r.throughput !== null).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(0, BASELINE_SESSIONS);
  return { sessions: first.length, ready: first.length >= BASELINE_SESSIONS, throughput: first.length >= BASELINE_SESSIONS ? median(first.map((r) => r.throughput!)) : null };
}
