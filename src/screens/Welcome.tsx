import { ArrowRight } from "lucide-react";
import { astronauts, environments } from "../data/catalog";
import type { AppState } from "../types";
import { Wordmark } from "./brand";
export function Welcome({
  state,
  onEnter,
  onContinue,
}: {
  state: AppState;
  onEnter: () => void;
  onContinue: () => void;
}) {
  const current = astronauts.find((a) => a.id === state.astronautId)!;
  return (
    <div className="entry">
      <header className="entry-top">
        <Wordmark />
        <span className="entry-meta">
          Team Code Blue · Mission systems prototype
        </span>
      </header>
      <main id="main" className="entry-main welcome">
        <div className="welcome-copy">
          <p className="eyebrow">Ares I / Crew health operations</p>
          <h1 className="welcome-title">
            Astronaut Health
            <br className="desktop-break" /> Monitoring System
          </h1>
          <p className="lede">
            Review personal measurements, investigate monitoring findings and
            coordinate crew check-ins from a single workspace.
          </p>
          <div className="welcome-actions">
            <button className="btn btn-primary btn-lg" onClick={onEnter}>
              Enter Mission System <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button className="btn btn-secondary btn-lg" onClick={onContinue}>
              Quick Demo
            </button>
          </div>
          {state.session.entered && (
            <button className="btn btn-link returning" onClick={onContinue}>
              Continue as {current.name} <ArrowRight size={16} />
            </button>
          )}
          <p className="welcome-notice">
            Simulated crew access. No account or password required.
          </p>
        </div>
        <aside className="mission-dossier" aria-label="Mission summary">
          <div className="dossier-heading">
            <span className="eyebrow">Mission record</span>
            <span className="sim-label">Demonstration</span>
          </div>
          <h2>Ares I</h2>
          <p className="muted">Fictional long-duration exploration mission</p>
          <dl className="dossier-facts">
            <div>
              <dt>Mission day</dt>
              <dd>{String(state.day).padStart(3, "0")}</dd>
            </div>
            <div>
              <dt>Crew</dt>
              <dd>04</dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd>
                {environments.find((e) => e.id === state.environmentId)?.name}
              </dd>
            </div>
          </dl>
          <ol className="capabilities">
            <li>
              <span>01</span>
              <div>
                <strong>Personal health</strong>
                <p>Baseline comparisons and traceable evidence.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Crew operations</strong>
                <p>Shared status, notifications and check-ins.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Countermeasures</strong>
                <p>Activity records and reaction-time assessment.</p>
              </div>
            </li>
          </ol>
        </aside>
      </main>
      <footer className="entry-foot">
        <span>
          Synthetic data · Unvalidated decision-support prototype · Not a
          medical device
        </span>
        <span>Local analysis · Offline after initial load</span>
      </footer>
    </div>
  );
}
