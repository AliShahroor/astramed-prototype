import { activities, astronauts } from "../data/catalog";
import { CABIN_ID } from "../app/useMission";
import type { AppState, Astronaut, Finding } from "../types";

export function checkinKey(
  state: Pick<AppState, "scenario" | "day">,
  id: string,
) {
  return `${state.scenario}-${id}-${state.day}`;
}
export function lastCheckin(state: AppState, id: string) {
  for (let day = state.day; day >= 1; day--) {
    const key = checkinKey({ ...state, day }, id);
    if (state.checkins[key])
      return {
        day,
        timestamp: state.checkins[key],
        request: state.checkinRequests[key] ?? "routine",
      };
  }
  return null;
}
export function sharedStatus(a: Astronaut, findings: Finding[]) {
  if (!a.share) return "Limited sharing";
  const personal = findings.filter((f) => f.indicator !== "co2");
  if (personal.some((f) => f.status === "Alert")) return "Alert";
  if (personal.some((f) => f.status === "Review")) return "Review";
  if (personal.some((f) => f.status === "Insufficient data"))
    return "Insufficient data";
  return "No flag";
}
export function visibleNotifications(state: AppState) {
  return state.notifications.filter(
    (n) =>
      n.scenario === state.scenario &&
      n.day <= state.day &&
      (n.astronautId === CABIN_ID ||
        astronauts.some((a) => a.id === n.astronautId && a.share)),
  );
}
export function crewSummary(
  state: AppState,
  findings: Record<string, Finding[]>,
) {
  return {
    total: astronauts.length,
    review: astronauts.filter((a) =>
      ["Review", "Alert"].includes(sharedStatus(a, findings[a.id] ?? [])),
    ).length,
    pending: astronauts.filter((a) => !state.checkins[checkinKey(state, a.id)])
      .length,
    unread: visibleNotifications(state).filter((n) => !n.acknowledged).length,
  };
}
export interface CrewEvent {
  id: string;
  astronautId: string;
  day: number;
  timestamp: string;
  title: string;
  type: string;
}
export function crewEvents(state: AppState): CrewEvent[] {
  const events: CrewEvent[] = [];
  for (const a of astronauts) {
    for (let day = 1; day <= state.day; day++) {
      const key = checkinKey({ ...state, day }, a.id);
      if (state.checkins[key])
        events.push({
          id: key,
          astronautId: a.id,
          day,
          timestamp: state.checkins[key],
          title:
            state.checkinRequests[key] === "support"
              ? "Support requested at check-in"
              : state.checkinRequests[key] === "check-in"
                ? "Follow-up requested at check-in"
                : "Check-in recorded",
          type: "Check-in",
        });
    }
    if (!a.share) continue;
    for (const r of state.assessments.filter(
      (r) =>
        r.astronautId === a.id &&
        r.scenario === state.scenario &&
        r.day <= state.day,
    ))
      events.push({
        id: r.id,
        astronautId: a.id,
        day: r.day,
        timestamp: r.timestamp,
        title: "Cognitive assessment completed",
        type: "Assessment",
      });
    for (const c of state.completions.filter(
      (c) =>
        c.astronautId === a.id &&
        c.scenario === state.scenario &&
        c.day <= state.day,
    ))
      events.push({
        id: `${c.astronautId}-${c.activityId}-${c.timestamp}`,
        astronautId: a.id,
        day: c.day,
        timestamp: c.timestamp,
        title: `${activities.find((a) => a.id === c.activityId)?.title ?? "Activity"} recorded`,
        type: "Activity",
      });
  }
  for (const n of visibleNotifications(state)) {
    events.push({
      id: n.id,
      astronautId: n.astronautId,
      day: n.day,
      timestamp: n.timestamp,
      title: n.title,
      type: "Notification",
    });
    if (n.acknowledgedAt && (n.acknowledgedDay ?? n.day) <= state.day)
      events.push({
        id: `${n.id}-ack`,
        astronautId: n.astronautId,
        day: n.acknowledgedDay ?? n.day,
        timestamp: n.acknowledgedAt,
        title: "Notification acknowledged",
        type: "Acknowledgement",
      });
  }
  return events.sort(
    (a, b) => b.day - a.day || b.timestamp.localeCompare(a.timestamp),
  );
}
export function recordedTime(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.valueOf())
    ? "Time not recorded"
    : `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
