import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  LogOut,
  Map,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import type { Route } from "../app/route";
import type { useMission } from "../app/useMission";
import { astronauts, environments } from "../data/catalog";
import { evaluateAll } from "../engine/monitoring";
import type { Finding, Hazard, Indicator } from "../types";
import { Wordmark } from "../screens/brand";
import { WsContext, useWs, type Modal, type Ws } from "./context";
import { MyHealth } from "./MyHealth";
import { Crew } from "./Crew";
import { Countermeasures } from "./Countermeasures";
import { Modals } from "./Modals";
import { visibleNotifications } from "./crewOperations";

export function Workspace({
  mission,
  route,
  go,
}: {
  mission: ReturnType<typeof useMission>;
  route: Extract<Route, { kind: "app" }>;
  go: (r: Route) => void;
}) {
  const { state, setState, rows } = mission;
  const [range, setRange] = useState(14);
  const [indicator, setIndicator] = useState<Indicator>("reaction");
  const [hazard, setHazard] = useState<Hazard>("All hazards");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [offline, setOffline] = useState(!navigator.onLine);
  const [cached, setCached] = useState(false);
  const astronaut = astronauts.find((a) => a.id === state.astronautId)!;
  const environment = environments.find((e) => e.id === state.environmentId)!;
  const findings = useMemo(
    () => evaluateAll(astronaut, rows, state.scenario, state.day, range),
    [astronaut, rows, state.scenario, state.day, range],
  );
  const pending = visibleNotifications(state).filter((n) => !n.acknowledged);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const on = () => setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    let active = true;
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.ready.then(() => {
        if (active) setCached(true);
      });
    return () => {
      active = false;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [route.page]);
  const update = (patch: Partial<typeof state>) =>
    setState((s) => ({ ...s, ...patch }));
  const speak = (f: Finding) => {
    if (!("speechSynthesis" in window))
      return setToast("Speech synthesis is unavailable in this browser.");
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(
      `${f.status === "Nominal" ? "No flag" : f.status}. ${f.title}. ${f.summary} ${f.next}`,
    );
    u.rate = 0.95;
    speechSynthesis.speak(u);
  };
  const ws: Ws = {
    mission,
    state,
    setState,
    update,
    astronaut,
    environment,
    findings,
    range,
    setRange,
    indicator,
    setIndicator,
    hazard,
    setHazard,
    open: setModal,
    notify: setToast,
    speak,
    go,
    page: route.page,
    tab: route.tab ?? "physical",
  };
  const nav = [
    { page: "health", label: "My Health", number: "01" },
    { page: "crew", label: "Crew", number: "02" },
    { page: "countermeasures", label: "Countermeasures", number: "03" },
  ];
  return (
    <WsContext.Provider value={ws}>
      <div className="app">
        <a
          className="skip-link"
          href="#main"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("main")?.focus();
          }}
        >
          Skip to content
        </a>
        <aside className="sidebar">
          <a
            href="#/health"
            className="appbar-brand"
            aria-label="ASTRAMED, My Health"
          >
            <Wordmark compact />
            <span className="brand-subtitle">Crew health systems</span>
          </a>
          <nav aria-label="Primary" className="appnav">
            {nav.map((n) => (
              <a
                key={n.page}
                href={`#/${n.page}`}
                aria-current={route.page === n.page ? "page" : undefined}
                className="appnav-link"
              >
                <span className="nav-number" aria-hidden="true">
                  {n.number}
                </span>
                {n.label}
                {n.page === "crew" && pending.length > 0 && (
                  <span className="count">{pending.length}</span>
                )}
              </a>
            ))}
          </nav>
          <div className="sidebar-mission">
            <span className="eyebrow">Mission record</span>
            <strong>Ares I</strong>
            <span>
              Day {state.day} · {environment.name}
            </span>
            <button
              className="btn btn-link"
              onClick={() => setModal({ type: "mission" })}
            >
              Mission details
            </button>
          </div>
          <div className="sidebar-bottom">
            <button
              className="sidebar-action"
              onClick={() => setModal({ type: "evidence", id: "measures" })}
            >
              <BookOpen size={16} aria-hidden="true" />
              Evidence library
            </button>
            <button
              className="sidebar-action"
              onClick={() => setModal({ type: "settings" })}
            >
              <Settings size={16} aria-hidden="true" />
              Demo &amp; preferences
            </button>
            <span className="connection">
              <span className="dot" aria-hidden="true" />
              {offline
                ? "Offline · local records"
                : cached
                  ? "Offline cache ready"
                  : "Preparing offline cache"}
            </span>
            <span className="team-label">Team Code Blue · Prototype</span>
          </div>
        </aside>
        <div className="workspace">
          <header className="appbar">
            <span className="page-crumb">
              Ares I <span aria-hidden="true">/</span>{" "}
              {nav.find((n) => n.page === route.page)?.label}
            </span>
            <div className="appbar-right">
              <span className="day-label">Day {state.day}</span>
              <label className="env-select">
                <span className="sr-only">Environment</span>
                <select
                  aria-label="Environment"
                  value={state.environmentId}
                  onChange={(e) => {
                    update({ environmentId: e.target.value });
                    setToast(
                      "Environment context updated. Readings and reference limits are unchanged.",
                    );
                  }}
                >
                  {environments.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => {
                  go({ kind: "app", page: "crew" });
                  setTimeout(
                    () => document.getElementById("notifications-h")?.focus(),
                    0,
                  );
                }}
                className="icon-btn"
                aria-label={`Crew notifications, ${pending.length} pending`}
              >
                <Bell size={18} aria-hidden="true" />
                {pending.length > 0 && (
                  <span className="ping" aria-hidden="true" />
                )}
              </button>
              <ProfileMenu />
            </div>
          </header>
          {mission.storageError && (
            <p className="banner error" role="alert">
              Browser storage is unavailable or full. Changes stay in memory
              until you close the tab.
            </p>
          )}
          <main id="main" tabIndex={-1} className={`page page-${route.page}`}>
            {route.page === "health" && <MyHealth />}
            {route.page === "crew" && <Crew />}
            {route.page === "countermeasures" && <Countermeasures />}
          </main>
          <footer className="appfoot">
            <span>Synthetic mission data · Decision-support prototype</span>
            <button
              className="btn btn-link sm"
              onClick={() => setModal({ type: "settings" })}
            >
              About this demonstration
            </button>
          </footer>
        </div>
        <Modals modal={modal} close={() => setModal(null)} />
        {toast && (
          <div className="toast" role="status">
            <Check size={16} aria-hidden="true" />
            <span>{toast}</span>
            <button
              className="icon-btn sm"
              onClick={() => setToast("")}
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </WsContext.Provider>
  );
}
function ProfileMenu() {
  const { astronaut, setState, update, notify, go, open: showModal } = useWs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const act = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const signOut = () => {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    setState((s) => ({ ...s, session: { ...s.session, entered: false } }));
    go({ kind: "entry", screen: "welcome" });
  };
  return (
    <div className="profile-menu" ref={ref}>
      <button
        ref={buttonRef}
        className="profile-btn"
        aria-expanded={open}
        aria-controls="profile-options"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Profile: ${astronaut.name}`}
      >
        <span className="avatar" aria-hidden="true">
          {astronaut.initials}
        </span>
        <span className="profile-btn-text">
          {astronaut.name}
          <small>{astronaut.role}</small>
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="menu"
          id="profile-options"
          role="group"
          aria-label="Profile and session"
        >
          <div className="menu-label">Switch profile</div>
          {astronauts.map((a) => (
            <button
              key={a.id}
              className="menu-item"
              aria-pressed={a.id === astronaut.id}
              onClick={act(() => {
                update({ astronautId: a.id });
                notify(`Viewing ${a.name}.`);
              })}
            >
              <span className="avatar sm" aria-hidden="true">
                {a.initials}
              </span>
              <span className="grow">
                {a.name}
                <small>{a.role}</small>
              </span>
              {a.id === astronaut.id && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
          <div className="menu-sep" />
          <button
            className="menu-item"
            onClick={act(() => go({ kind: "entry", screen: "access" }))}
          >
            <UserRound size={16} />
            Crew profile selection
          </button>
          <button
            className="menu-item"
            onClick={act(() => go({ kind: "entry", screen: "briefing" }))}
          >
            <Map size={16} />
            Mission briefing
          </button>
          <button
            className="menu-item"
            onClick={act(() => showModal({ type: "settings" }))}
          >
            <Settings size={16} />
            Demo &amp; preferences
          </button>
          <button className="menu-item" onClick={act(signOut)}>
            <LogOut size={16} />
            Sign out of demo
          </button>
          <p className="menu-note">
            Simulated access · saved records are retained
          </p>
        </div>
      )}
    </div>
  );
}
