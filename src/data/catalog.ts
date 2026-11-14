import type {
  Activity,
  Astronaut,
  Environment,
  Hazard,
  Indicator,
  Metric,
  Mission,
  Scenario,
} from "../types";
export const mission: Mission = {
  id: "ares-01",
  name: "Ares I",
  day: 94,
  crewIds: ["alex", "maya", "leo", "samira"],
};
export const scenarios: Record<Scenario, string> = {
  nominal: "A · Nominal",
  fatigue: "B · Fatigue observation",
  environment: "C · Cabin CO₂ concern",
};
export const environments: Environment[] = [
  {
    id: "mars",
    name: "Mars transit",
    gravity: "Microgravity",
    delay: "3–22 min one-way, varies with Earth–Mars distance",
    priority: "Autonomous checks and local evidence",
  },
  {
    id: "orbit",
    name: "Orbital station",
    gravity: "Microgravity",
    delay: "About 1 s or less via relay satellites",
    priority: "Exercise and cabin monitoring",
  },
  {
    id: "moon",
    name: "Lunar surface",
    gravity: "0.16 g",
    delay: "About 1.3 s one-way",
    priority: "Surface operations and mobility",
  },
  {
    id: "earth",
    name: "Earth reference",
    gravity: "1 g",
    delay: "Local support",
    priority: "Preflight comparison context",
  },
];
export const hazards: Hazard[] = [
  "All hazards",
  "Space radiation",
  "Gravity fields",
  "Isolation & confinement",
  "Hostile / closed environment",
  "Distance from Earth",
];
export const hazardContext: Record<Hazard, string> = {
  "All hazards":
    "Personal trends alongside mission conditions. Select a hazard to focus the monitoring view.",
  "Space radiation":
    "Track cumulative career dose. A career reference cannot establish safety during an acute radiation event.",
  "Gravity fields":
    "Review activity and measured strength relative to preflight. No expected loss trajectory is assumed.",
  "Isolation & confinement":
    "Review sleep and cognitive responses together. Co-occurring changes do not establish a cause.",
  "Hostile / closed environment":
    "Review cabin conditions and oxygen readings. CO₂ comparisons require a one-hour average partial pressure.",
  "Distance from Earth":
    "Local assessments and stored evidence support review when immediate Earth communication is limited.",
};
export const metrics: Metric[] = [
  {
    id: "reaction",
    label: "Reaction-time latency",
    short: "Reaction time",
    unit: "ms",
    min: 100,
    max: 3000,
    decimals: 0,
    hazards: ["Isolation & confinement", "Distance from Earth"],
    note: "Median of valid responses. Short browser task; not a validated clinical PVT.",
  },
  {
    id: "sleep",
    label: "Sleep duration",
    short: "Sleep",
    unit: "h",
    min: 0,
    max: 24,
    decimals: 1,
    hazards: ["Isolation & confinement", "Distance from Earth"],
    note: "Daily reported sleep duration; synthetic wearable history.",
  },
  {
    id: "heart",
    label: "Resting heart rate",
    short: "Resting heart rate",
    unit: "bpm",
    min: 25,
    max: 240,
    decimals: 0,
    hazards: ["Gravity fields", "Distance from Earth"],
    note: "Resting measurement. Baseline deviation is not a diagnosis.",
  },
  {
    id: "systolic",
    label: "Blood pressure · systolic",
    short: "Systolic pressure",
    unit: "mmHg",
    min: 50,
    max: 260,
    decimals: 0,
    hazards: ["Gravity fields"],
    note: "Paired with diastolic pressure; logged as separate components.",
  },
  {
    id: "diastolic",
    label: "Blood pressure · diastolic",
    short: "Diastolic pressure",
    unit: "mmHg",
    min: 25,
    max: 160,
    decimals: 0,
    hazards: ["Gravity fields"],
    note: "Paired with systolic pressure. No clinical blood-pressure rule is implemented.",
  },
  {
    id: "oxygen",
    label: "Oxygen saturation",
    short: "Oxygen saturation",
    unit: "%",
    min: 50,
    max: 100,
    decimals: 1,
    hazards: ["Hostile / closed environment"],
    note: "Illustrative SpO₂; no validated clinical alarm is implemented.",
  },
  {
    id: "activity",
    label: "Physical activity",
    short: "Physical activity",
    unit: "min",
    min: 0,
    max: 1440,
    decimals: 0,
    hazards: ["Gravity fields"],
    note: "Daily activity minutes. This is not an exercise prescription.",
  },
  {
    id: "co2",
    label: "Cabin CO₂ · 1 h average",
    short: "Cabin CO₂",
    unit: "mmHg",
    min: 0,
    max: 20,
    decimals: 1,
    hazards: ["Hostile / closed environment"],
    note: "One-hour average partial pressure in the habitable volume, not an instantaneous value.",
  },
  {
    id: "radiation",
    label: "Career effective radiation dose",
    short: "Career radiation dose",
    unit: "mSv",
    min: 0,
    max: 2000,
    decimals: 1,
    hazards: ["Space radiation"],
    note: "Synthetic cumulative career effective dose; includes illustrative pre-mission exposure.",
  },
  {
    id: "strength",
    label: "Measured strength · preflight ratio",
    short: "Muscle strength",
    unit: "% baseline",
    min: 0,
    max: 200,
    decimals: 1,
    hazards: ["Gravity fields"],
    note: "Illustrative strength ratio. No expected trajectory or bone-density inference.",
  },
];
const base: Record<Indicator, number> = {
  reaction: 285,
  sleep: 7.4,
  heart: 61,
  systolic: 118,
  diastolic: 76,
  oxygen: 98.2,
  activity: 90,
  co2: 2.1,
  radiation: 122,
  strength: 100,
};
export const astronauts: Astronaut[] = [
  {
    id: "alex",
    name: "Alex Morgan",
    role: "Mission specialist",
    initials: "AM",
    designation: "CREW 03 · MS",
    history:
      "Stable simulated preflight measures; recent sleep restriction in scenario B.",
    share: true,
    baseline: makeBaseline({}),
  },
  {
    id: "maya",
    name: "Maya Chen",
    role: "Commander",
    initials: "MC",
    designation: "CREW 01 · CDR",
    history:
      "Consistent simulated sleep and cognitive measures; higher preflight resting heart rate.",
    share: true,
    baseline: makeBaseline({ heart: 66, reaction: 272, sleep: 7.6 }),
  },
  {
    id: "leo",
    name: "Leo Okafor",
    role: "Flight engineer",
    initials: "LO",
    designation: "CREW 02 · FE",
    history:
      "Reduced simulated activity during maintenance work; no clinical condition assigned.",
    share: false,
    baseline: makeBaseline({
      heart: 58,
      reaction: 296,
      sleep: 7.2,
      activity: 105,
    }),
  },
  {
    id: "samira",
    name: "Samira Noor",
    role: "Crew medical officer",
    initials: "SN",
    designation: "CREW 04 · CMO",
    history: "Mild simulated sleep variability; stable cognitive responses.",
    share: true,
    baseline: makeBaseline({ heart: 64, reaction: 280, sleep: 7.8 }),
  },
];
function makeBaseline(overrides: Partial<Record<Indicator, number>>) {
  return Object.fromEntries(
    Object.entries({ ...base, ...overrides }).map(([id, value]) => [
      id,
      {
        value,
        count: id === "reaction" ? 5 : 14,
        source: "Synthetic preflight",
      },
    ]),
  ) as Astronaut["baseline"];
}
export const activities: Activity[] = [
  {
    id: "mobility",
    title: "Mobility check",
    category: "Movement",
    duration: "5 min · illustrative",
    description:
      "A gentle, self-paced mobility demonstration. Use approved restraints and mission procedures.",
    steps: [
      "Confirm clearance, equipment and a stable position with the crew medical officer.",
      "Explore comfortable shoulder and ankle motion without added load.",
      "Stop for pain, dizziness or equipment concerns; record the check separately from medical clearance.",
    ],
  },
  {
    id: "resistance",
    title: "Resistance session review",
    category: "Strength",
    duration: "10 min · illustrative review",
    description:
      "Review the mission-approved resistance plan. NASA uses specialized exercise equipment; this app does not prescribe a workout.",
    steps: [
      "Review the approved equipment setup and personal exercise plan.",
      "Confirm restraint and loading with the assigned operator.",
      "Record completion only after the actual approved session; demonstration completion is simulated here.",
    ],
  },
  {
    id: "recovery",
    title: "Recovery & routine check",
    category: "Recovery",
    duration: "3 min · illustrative",
    description:
      "Review your work-rest schedule and note barriers to a consistent rest period.",
    steps: [
      "Review the recent sleep history and planned rest opportunity.",
      "Note interruptions and schedule concerns for a crew check-in.",
      "Use established mission procedures for follow-up; this activity does not treat fatigue.",
    ],
  },
];
export function metricFor(id: Indicator) {
  return metrics.find((m) => m.id === id)!;
}
