import { describe, expect, it } from "vitest";
import { astronauts } from "../src/data/catalog";
import { evaluateAll, generateHistory } from "../src/engine/monitoring";
import { initialState, restoreState } from "../src/app/useMission";
import { parseHash, toHash } from "../src/app/route";
import {
  checkinKey,
  crewEvents,
  crewSummary,
  lastCheckin,
  sharedStatus,
} from "../src/workspace/crewOperations";
import type { CrewNotification } from "../src/types";
const findings = Object.fromEntries(
  astronauts.map((a) => [
    a.id,
    evaluateAll(a, generateHistory(a, "fatigue"), "fatigue", 94, 14),
  ]),
);
const note: CrewNotification = {
  id: "fatigue-alex-reaction",
  astronautId: "alex",
  scenario: "fatigue",
  day: 94,
  findingId: "alex-reaction",
  title: "Check-in requested",
  timestamp: "2026-11-14T12:00:00Z",
  acknowledged: false,
};

describe("saved records and entry routes", () => {
  it("retains legacy records and acknowledged cabin notifications while adding a session", () => {
    const old = {
      ...initialState(),
      session: undefined,
      checkinRequests: undefined,
      checkins: { "fatigue-alex-94": "2026-11-14T12:00:00Z" },
      notifications: [
        {
          ...note,
          id: "environment-alex-co2",
          scenario: "environment",
          findingId: "alex-co2",
          acknowledged: true,
        },
      ],
    };
    const saved = restoreState(old);
    expect(saved.session).toEqual({ entered: false, briefed: [] });
    expect(saved.checkins).toEqual(old.checkins);
    expect(saved.notifications[0]).toMatchObject({
      astronautId: "cabin",
      id: "environment-cabin-co2",
      acknowledged: true,
    });
    expect(saved.checkinRequests).toEqual({});
  });
  it("keeps current session preferences and rejects malformed top-level state", () => {
    const state = initialState();
    state.session = { entered: true, briefed: ["maya"] };
    expect(restoreState(state).session).toEqual(state.session);
    expect(restoreState({ ...state, day: 200 })).toEqual(initialState());
    expect(restoreState(null)).toEqual(initialState());
  });
  it("supports direct links, invalid-route recovery and countermeasure subpages", () => {
    expect(parseHash("#/crew")).toEqual({
      kind: "app",
      page: "crew",
      tab: undefined,
    });
    expect(parseHash("#/countermeasures/progress")).toEqual({
      kind: "app",
      page: "countermeasures",
      tab: "progress",
    });
    expect(toHash({ kind: "entry", screen: "briefing" })).toBe("#/briefing");
    expect(parseHash("#/missing")).toEqual({
      kind: "entry",
      screen: "welcome",
    });
  });
});
describe("derived crew operations", () => {
  it("counts only saved check-ins and shared findings; acknowledgement does not resolve review", () => {
    const state = initialState();
    state.notifications = [note];
    expect(crewSummary(state, findings)).toEqual({
      total: 4,
      review: 1,
      pending: 4,
      unread: 1,
    });
    state.checkins[checkinKey(state, "alex")] = "2026-11-14T12:10:00Z";
    state.notifications[0] = { ...note, acknowledged: true };
    expect(crewSummary(state, findings)).toEqual({
      total: 4,
      review: 1,
      pending: 3,
      unread: 0,
    });
  });
  it("does not invent a synthetic last check-in, or show future/other-scenario records", () => {
    const state = initialState();
    expect(lastCheckin(state, "alex")).toBeNull();
    state.checkins = {
      "nominal-alex-94": "2026-11-14T12:10:00Z",
      "fatigue-alex-94": "2026-11-14T12:10:00Z",
      "fatigue-alex-90": "2026-11-14T11:10:00Z",
    };
    state.day = 92;
    expect(lastCheckin(state, "alex")?.day).toBe(90);
    expect(crewEvents(state).map((e) => e.day)).toEqual([90]);
  });
  it("keeps limited-sharing medical status and activity details out of crew views", () => {
    const state = initialState();
    const leo = astronauts.find((a) => a.id === "leo")!;
    expect(sharedStatus(leo, findings.alex)).toBe("Limited sharing");
    state.completions = [
      {
        astronautId: "leo",
        activityId: "mobility",
        scenario: "fatigue",
        day: 94,
        timestamp: "2026-11-14T12:00:00Z",
      },
    ];
    state.notifications = [{ ...note, astronautId: "leo" }];
    expect(crewEvents(state)).toEqual([]);
    expect(crewSummary(state, findings).unread).toBe(0);
  });
  it("constructs activity from stored events and support requests without raw readings", () => {
    const state = initialState();
    state.notifications = [
      { ...note, acknowledged: true, acknowledgedAt: "2026-11-14T12:15:00Z" },
    ];
    state.checkins[checkinKey(state, "alex")] = "2026-11-14T12:20:00Z";
    state.checkinRequests[checkinKey(state, "alex")] = "support";
    const events = crewEvents(state);
    expect(events.map((e) => e.title)).toEqual([
      "Support requested at check-in",
      "Notification acknowledged",
      "Check-in requested",
    ]);
    expect(events.every((e) => !("value" in e) && !("median" in e))).toBe(true);
  });
});
