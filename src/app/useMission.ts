import { useEffect, useMemo, useState } from "react";
import { astronauts, mission } from "../data/catalog";
import { evaluateAll, generateHistory } from "../engine/monitoring";
import type { AppState, CrewNotification } from "../types";
export const STORAGE_KEY = "astramed-state-v1";
/** Crew-level status always uses the same fixed window so every viewer sees the same result. */
export const CREW_WINDOW_DAYS = 14;
/** Shared cabin readings are not attributed to any person. */
export const CABIN_ID = "cabin";
export function initialState(): AppState {
  return {
    astronautId: "alex",
    scenario: "fatigue",
    day: 94,
    environmentId: "mars",
    readings: [],
    assessments: [],
    completions: [],
    notifications: [],
    checkins: {},
    voice: false,
    checkinRequests: {},
    session: { entered: false, briefed: [] },
  };
}
/** Normalize older saved sessions without discarding readings or acknowledgements. */
export function restoreState(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") return initialState();
  const s = raw as AppState;
  if (
    !astronauts.some((a) => a.id === s.astronautId) ||
    !["nominal", "fatigue", "environment"].includes(s.scenario) ||
    !Number.isInteger(s.day) ||
    s.day < 1 ||
    s.day > 94 ||
    !["mars", "orbit", "moon", "earth"].includes(s.environmentId) ||
    ![s.readings, s.assessments, s.completions, s.notifications].every(
      Array.isArray,
    ) ||
    !s.checkins ||
    typeof s.checkins !== "object" ||
    typeof s.voice !== "boolean"
  )
    return initialState();
  return {
    ...s,
    checkinRequests: s.checkinRequests ?? {},
    session: {
      entered: s.session?.entered ?? false,
      briefed: Array.isArray(s.session?.briefed)
        ? s.session.briefed.filter((id) => astronauts.some((a) => a.id === id))
        : [],
    },
    notifications: s.notifications.map((n) => ({
      ...n,
      astronautId: n.findingId?.includes("co2") ? CABIN_ID : n.astronautId,
      id: `${n.scenario}-${n.findingId?.includes("co2") ? CABIN_ID : n.astronautId}-${n.findingId?.split("-").at(-1)}`,
    })),
  };
}
function readState(): AppState {
  try {
    return restoreState(
      JSON.parse(
        localStorage.getItem(STORAGE_KEY) ||
          localStorage.getItem("astramed-state-v2") ||
          "null",
      ),
    );
  } catch {
    return initialState();
  }
}
export function useMission() {
  const [state, setState] = useState<AppState>(readState);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  const rows = useMemo(
    () => [
      ...astronauts.flatMap((a) => generateHistory(a, state.scenario)),
      ...state.readings,
    ],
    [state.scenario, state.readings],
  );
  const crewFindings = useMemo(
    () =>
      Object.fromEntries(
        astronauts.map((a) => [
          a.id,
          evaluateAll(a, rows, state.scenario, state.day, CREW_WINDOW_DAYS),
        ]),
      ),
    [rows, state.scenario, state.day],
  );
  // Notification history: one entry per person (or the cabin) / rule / scenario, created the first
  // time a finding meets the notification policy. Keep the real recording timestamp and simulated day.
  useEffect(() => {
    const proposed: CrewNotification[] = [];
    for (const a of astronauts)
      for (const f of crewFindings[a.id]) {
        if (!f.notify) continue;
        const cabin = f.indicator === "co2";
        if (!cabin && !a.share) continue;
        const owner = cabin ? CABIN_ID : a.id;
        const id = `${state.scenario}-${owner}-${f.indicator}`;
        if (proposed.some((p) => p.id === id)) continue;
        proposed.push({
          id,
          astronautId: owner,
          scenario: state.scenario,
          day: state.day,
          findingId: f.id,
          title: cabin
            ? "Cabin CO₂ one-hour average above the NASA reference"
            : f.indicator === "radiation"
              ? "Career dose reference reached"
              : "Check-in requested by monitoring policy",
          acknowledged: false,
          timestamp: new Date().toISOString(),
        });
      }
    setState((prev) => {
      const added = proposed.filter(
        (n) => !prev.notifications.some((p) => p.id === n.id),
      );
      return added.length
        ? { ...prev, notifications: [...added, ...prev.notifications] }
        : prev;
    });
  }, [crewFindings, state.scenario, state.day]);
  return { state, setState, rows, crewFindings, storageError, mission };
}
