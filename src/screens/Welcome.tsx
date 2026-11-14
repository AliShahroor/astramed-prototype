import { ArrowRight, BookOpen, Gauge, WifiOff } from "lucide-react";
import { astronauts, mission } from "../data/catalog";
import type { AppState } from "../types";
import { Trajectory, Wordmark } from "./brand";

export function Welcome({ state, onEnter, onContinue }: { state: AppState; onEnter: () => void; onContinue: () => void }) {
  const current = astronauts.find((a) => a.id === state.astronautId)!;
  return (
    <div className="entry">
      <header className="entry-top">
        <Wordmark />
        <span className="entry-meta">Team Code Blue · NASA Space Apps Challenge 2026 prototype</span>
      </header>
      <main id="main" className="entry-main welcome">
        <div className="welcome-copy">
          <h1 className="welcome-title">
            Your health. Your mission.
            <br />
            Informed decisions beyond Earth.
          </h1>
          <p className="lede">
            ASTRAMED compares each astronaut’s measurements with their own preflight baseline, explains every flag
            step by step, and links it to the NASA evidence behind it. The analysis runs on board, without waiting
            for Earth.
          </p>
          <div className="welcome-actions">
            <button className="btn btn-primary btn-lg" onClick={onEnter}>
              Enter Mission Demo <ArrowRight size={18} aria-hidden="true" />
            </button>
            {state.session.entered && (
              <button className="btn btn-quiet btn-lg" onClick={onContinue}>
                Continue as {current.name}
              </button>
            )}
          </div>
          <ul className="capabilities">
            <li>
              <Gauge size={18} aria-hidden="true" />
              <div>
                <strong>Explainable findings</strong>
                <span>Every flag shows the reading, the baseline, the change and the rule that fired.</span>
              </div>
            </li>
            <li>
              <BookOpen size={18} aria-hidden="true" />
              <div>
                <strong>NASA evidence, packaged locally</strong>
                <span>Standards and research are cited by section, together with their limitations.</span>
              </div>
            </li>
            <li>
              <WifiOff size={18} aria-hidden="true" />
              <div>
                <strong>Local-first</strong>
                <span>Analysis runs in the browser; the production build caches itself for offline use.</span>
              </div>
            </li>
          </ul>
        </div>
        <figure className="welcome-figure" aria-hidden="true">
          <Trajectory day={state.day} />
          <figcaption>
            {mission.name} · fictional Mars transit · mission day {state.day}
          </figcaption>
        </figure>
      </main>
      <footer className="entry-foot">
        All crew and measurements are synthetic. ASTRAMED is an unvalidated prototype, not a medical device, and does
        not replace a flight surgeon.
      </footer>
    </div>
  );
}
