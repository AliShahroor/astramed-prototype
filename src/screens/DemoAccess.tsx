import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { astronauts, mission } from "../data/catalog";
import type { AppState } from "../types";
import { Wordmark } from "./brand";

export function DemoAccess({
  state,
  onEnter,
  onBack,
  onSkip,
}: {
  state: AppState;
  onEnter: (id: string) => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="entry">
      <header className="entry-top">
        <Wordmark />
        <span className="entry-meta">Demo access</span>
      </header>
      <main id="main" className="entry-main narrow">
        <button className="btn btn-link back" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>
        <h1 className="h1">Choose a crew profile</h1>
        <p className="lede">
          Each profile opens that astronaut’s own health view on {mission.name}.
          Crew settings, scenario and records are shared across profiles.
        </p>
        <p className="notice-line">
          <Info size={16} aria-hidden="true" />
          Demonstration only. There are no passwords and no real authentication;
          every profile is fictional.
        </p>
        <ul className="profile-list" aria-label="Crew profiles">
          {astronauts.map((a) => (
            <li key={a.id}>
              <button
                className="profile"
                onClick={() => onEnter(a.id)}
                aria-label={`Enter as ${a.name}, ${a.role}`}
              >
                <span className="avatar lg" aria-hidden="true">
                  {a.initials}
                </span>
                <span className="profile-text">
                  <span className="profile-name">{a.name}</span>
                  <span className="profile-role">
                    {a.role} · <span className="mono">{a.designation}</span>
                  </span>
                </span>
                <span className="profile-go">
                  {state.session.entered && state.astronautId === a.id
                    ? "Last used"
                    : "Enter"}
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="guest-row">
          <span>Short on time?</span>
          <button className="btn btn-quiet" onClick={onSkip}>
            Skip to workspace
          </button>
        </div>
      </main>
    </div>
  );
}
