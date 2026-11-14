import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, ChevronDown, ChevronLeft, ChevronRight, LogOut, Map, RefreshCw, Settings, UserRound, X } from "lucide-react";
import type { Route } from "../app/route";
import type { useMission } from "../app/useMission";
import { initialState } from "../app/useMission";
import { astronauts, environments, metrics, scenarios } from "../data/catalog";
import { evaluateAll } from "../engine/monitoring";
import type { Finding, Hazard, Indicator, Scenario } from "../types";
import { Wordmark } from "../screens/brand";
import { WsContext, useWs, type Modal, type Ws } from "./context";
import { MyHealth } from "./MyHealth";
import { Crew } from "./Crew";
import { Countermeasures } from "./Countermeasures";
import { Modals } from "./Modals";

export function Workspace({ mission, route, go }: { mission: ReturnType<typeof useMission>; route: Extract<Route, { kind: "app" }>; go: (r: Route) => void }) {
  const { state, setState, rows } = mission;
  const [range, setRange] = useState(14);
  const [indicator, setIndicator] = useState<Indicator>("reaction");
  const [hazard, setHazard] = useState<Hazard>("All hazards");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const astronaut = astronauts.find((a) => a.id === state.astronautId)!;
  const environment = environments.find((e) => e.id === state.environmentId)!;
  const findings = useMemo(() => evaluateAll(astronaut, rows, state.scenario, state.day, range), [astronaut, rows, state.scenario, state.day, range]);
  const pending = state.notifications.filter((n) => n.scenario === state.scenario && n.day <= state.day && !n.acknowledged);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const update = (patch: Partial<typeof state>) => setState((s) => ({ ...s, ...patch }));
  const speak = (f: Finding) => {
    if (!("speechSynthesis" in window)) return setToast("Speech synthesis is unavailable in this browser.");
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`${f.status === "Nominal" ? "No flag" : f.status}. ${f.title}. ${f.summary} ${f.next}`);
    u.rate = 0.95;
    speechSynthesis.speak(u);
  };
  const reset = () => {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    setState((s) => ({ ...initialState(), session: s.session }));
    setHazard("All hazards");
    setIndicator("reaction");
    setRange(14);
    setModal(null);
    go({ kind: "app", page: "health" });
    setToast("Demo reset: Alex Morgan, scenario B, mission day 94. Logged records cleared.");
  };

  const ws: Ws = {
    mission, state, setState, update, astronaut, environment, findings, range, setRange,
    indicator, setIndicator, hazard, setHazard, open: setModal, notify: setToast, speak, go,
    page: route.page, tab: route.tab ?? "physical",
  };

  const NAV = [
    { page: "health" as const, label: "My Health" },
    { page: "crew" as const, label: "Crew" },
    { page: "countermeasures" as const, label: "Countermeasures" },
  ];

  return (
    <WsContext.Provider value={ws}>
      <div className="app">
        <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>
          Skip to content
        </a>
        <header className="appbar">
          <div className="appbar-inner">
            <a href="#/health" className="appbar-brand" aria-label="ASTRAMED, My Health">
              <Wordmark compact />
            </a>
            <nav aria-label="Primary" className="appnav">
              {NAV.map((n) => (
                <a key={n.page} href={`#/${n.page}`} aria-current={route.page === n.page ? "page" : undefined} className="appnav-link">
                  {n.label}
                  {n.page === "crew" && pending.length > 0 && (
                    <span className="count" aria-label={`${pending.length} pending`}>{pending.length}</span>
                  )}
                </a>
              ))}
            </nav>
            <div className="appbar-right">
              <button className="mission-chip" onClick={() => setModal({ type: "mission" })} aria-label="Mission details">
                <span className="mission-chip-name">Ares I</span>
                <span className="mission-chip-day">Day {state.day}</span>
              </button>
              <label className="env-select">
                <span className="sr-only">Environment</span>
                <select aria-label="Environment" value={state.environmentId} onChange={(e) => { update({ environmentId: e.target.value }); setToast(`Context set to ${environments.find((x) => x.id === e.target.value)!.name}. Readings and reference limits are unchanged.`); }}>
                  {environments.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </label>
              <a href="#/crew" className="icon-btn" aria-label={`Crew notifications, ${pending.length} pending`}>
                <Bell size={18} aria-hidden="true" />
                {pending.length > 0 && <span className="ping" aria-hidden="true" />}
              </a>
              <ProfileMenu
                onSwitch={(id) => { update({ astronautId: id }); setToast(`Now viewing as ${astronauts.find((a) => a.id === id)!.name}.`); }}
                onBriefing={() => go({ kind: "entry", screen: "briefing" })}
                onSettings={() => setModal({ type: "settings" })}
                onWelcome={() => go({ kind: "entry", screen: "welcome" })}
                onReset={reset}
              />
            </div>
          </div>
        </header>
        <div className="simbar" role="region" aria-label="Simulation controls">
          <div className="simbar-inner">
            <span className="sim-flag"><span className="dot" aria-hidden="true" />Simulated data</span>
            <label className="sim-field">
              Scenario
              <select aria-label="Demo scenario" value={state.scenario} onChange={(e) => { update({ scenario: e.target.value as Scenario }); setToast("Scenario loaded. Findings and crew statuses were recalculated."); }}>
                {Object.entries(scenarios).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </label>
            <div className="sim-field day-field">
              <span aria-hidden="true">Mission day</span>
              <button className="step" aria-label="Previous mission day" disabled={state.day <= 1} onClick={() => update({ day: state.day - 1 })}><ChevronLeft size={16} /></button>
              <select aria-label="Mission day" value={state.day} onChange={(e) => update({ day: Number(e.target.value) })}>
                {Array.from({ length: 94 }, (_, i) => 94 - i).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <button className="step" aria-label="Next mission day" disabled={state.day >= 94} onClick={() => update({ day: state.day + 1 })}><ChevronRight size={16} /></button>
            </div>
            <span className="sim-context">
              {environment.name} · {environment.gravity} · {environment.delay}
            </span>
          </div>
        </div>
        {mission.storageError && (
          <p className="banner error" role="alert">Browser storage is unavailable or full. Changes stay in memory until you close the tab.</p>
        )}
        <main id="main" tabIndex={-1} className="page">
          {route.page === "health" && <MyHealth />}
          {route.page === "crew" && <Crew />}
          {route.page === "countermeasures" && <Countermeasures />}
        </main>
        <footer className="appfoot">
          <span>Synthetic crew and measurements · Decision-support prototype · Not a medical device</span>
          <span>Team Code Blue · {metrics.length} indicators · rules v1.0.0</span>
        </footer>
        <Modals modal={modal} close={() => setModal(null)} />
        {toast && (
          <div className="toast" role="status">
            <Check size={16} aria-hidden="true" />
            <span>{toast}</span>
            <button className="icon-btn sm" onClick={() => setToast("")} aria-label="Dismiss message"><X size={14} /></button>
          </div>
        )}
      </div>
    </WsContext.Provider>
  );
}

function ProfileMenu({ onSwitch, onBriefing, onSettings, onWelcome, onReset }: { onSwitch: (id: string) => void; onBriefing: () => void; onSettings: () => void; onWelcome: () => void; onReset: () => void }) {
  const { astronaut } = useWs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  const act = (fn: () => void) => () => { setOpen(false); fn(); };
  return (
    <div className="profile-menu" ref={ref}>
      <button ref={buttonRef} className="profile-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} aria-label={`Profile: ${astronaut.name}`}>
        <span className="avatar" aria-hidden="true">{astronaut.initials}</span>
        <span className="profile-btn-text">
          <span>{astronaut.name}</span>
          <small>{astronaut.role}</small>
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="menu" role="menu" aria-label="Profile and session">
          <div className="menu-label">Switch astronaut</div>
          {astronauts.map((a) => (
            <button key={a.id} role="menuitemradio" aria-checked={a.id === astronaut.id} className="menu-item" onClick={act(() => onSwitch(a.id))}>
              <span className="avatar sm" aria-hidden="true">{a.initials}</span>
              <span className="grow">{a.name}<small>{a.role}</small></span>
              {a.id === astronaut.id && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
          <div className="menu-sep" role="separator" />
          <button role="menuitem" className="menu-item" onClick={act(onBriefing)}><Map size={16} aria-hidden="true" /><span className="grow">Mission briefing</span></button>
          <button role="menuitem" className="menu-item" onClick={act(onSettings)}><Settings size={16} aria-hidden="true" /><span className="grow">Demo &amp; preferences</span></button>
          <button role="menuitem" className="menu-item" onClick={act(onWelcome)}><LogOut size={16} aria-hidden="true" /><span className="grow">Return to welcome</span></button>
          <button role="menuitem" className="menu-item danger" onClick={act(() => { if (confirm("Reset the demo? Logged readings, assessments, check-ins and progress will be cleared.")) onReset(); })}><RefreshCw size={16} aria-hidden="true" /><span className="grow">Reset demo</span></button>
          <div className="menu-sep" role="separator" />
          <p className="menu-note"><UserRound size={14} aria-hidden="true" /> Demo profiles, no authentication.</p>
        </div>
      )}
    </div>
  );
}

