import { useEffect, useMemo, useState } from "react";
import { astronauts, mission } from "../data/catalog";
import { evaluateAll, generateHistory } from "../engine/monitoring";
import type { AppState, CrewNotification } from "../types";
export const STORAGE_KEY = "astramed-state-v1";
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
  };
}
function readState(): AppState {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (
      s &&
      astronauts.some((a) => a.id === s.astronautId) &&
      ["nominal", "fatigue", "environment"].includes(s.scenario) &&
      Number.isInteger(s.day) &&
      s.day >= 1 &&
      s.day <= 94 &&
      ["mars", "orbit", "moon", "earth"].includes(s.environmentId) &&
      ["readings", "assessments", "completions", "notifications"].every((k) =>
        Array.isArray(s[k]),
      ) &&
      s.checkins &&
      typeof s.voice === "boolean"
    )
      return s;
  } catch {
    /* Invalid storage falls back to a reproducible demo. */
  }
  return initialState();
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
          evaluateAll(a, rows, state.scenario, state.day, 14),
        ]),
      ),
    [rows, state.scenario, state.day],
  );
  useEffect(() => {
    const proposed: CrewNotification[] = astronauts.flatMap((a) =>
      crewFindings[a.id]
        .filter(
          (f) =>
            f.notify && (f.indicator === "co2" ? a.id === "alex" : a.share),
        )
        .map((f) => ({
          id: `${state.scenario}-${f.id}`,
          astronautId: a.id,
          scenario: state.scenario,
          day: state.day,
          findingId: f.id,
          title:
            f.indicator === "co2"
              ? "Shared cabin reference exceeded"
              : "Check-in requested by monitoring policy",
          acknowledged: false,
          timestamp: new Date().toISOString(),
        })),
    );
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
