export type Indicator =
  | "reaction"
  | "sleep"
  | "heart"
  | "systolic"
  | "diastolic"
  | "oxygen"
  | "activity"
  | "co2"
  | "radiation"
  | "strength";
export type Scenario = "nominal" | "fatigue" | "environment";
export type Status = "Nominal" | "Review" | "Alert" | "Insufficient data";
export type SourceType =
  | "Synthetic personal reading"
  | "Synthetic cabin sensor"
  | "Manual entry"
  | "Browser assessment";
export type Hazard =
  | "All hazards"
  | "Space radiation"
  | "Gravity fields"
  | "Isolation & confinement"
  | "Hostile / closed environment"
  | "Distance from Earth";
export interface Baseline {
  value: number;
  count: number;
  source: "Synthetic preflight";
}
export interface Astronaut {
  id: string;
  name: string;
  role: string;
  initials: string;
  designation: string;
  history: string;
  baseline: Record<Indicator, Baseline>;
  share: boolean;
}
export interface Mission {
  id: string;
  name: string;
  day: number;
  crewIds: string[];
}
export interface Environment {
  id: string;
  name: string;
  gravity: string;
  delay: string;
  priority: string;
}
export interface Metric {
  id: Indicator;
  label: string;
  short: string;
  unit: string;
  min: number;
  max: number;
  decimals: number;
  hazards: Hazard[];
  note: string;
}
export interface Measurement {
  id: string;
  astronautId: string;
  indicator: Indicator;
  value: number;
  unit: string;
  day: number;
  timestamp: string;
  source: SourceType;
  scenario: Scenario;
  aggregation?: "one_hour_average";
  quality: "illustrative" | "user_reported" | "browser_timed";
}
export interface Evidence {
  id: string;
  agency: "NASA";
  title: string;
  url: string;
  version: string;
  section: string;
  type: "standard" | "research" | "context";
  statement: string;
  limitations: string;
  verified: boolean;
  limit?: number;
  unit?: string;
  aggregation?: string;
}
export interface AlertRule {
  id: string;
  version: string;
  origin: "NASA reference / prototype status" | "Code Blue prototype rule";
  criterion: string;
}
export interface Finding {
  id: string;
  astronautId: string;
  indicator: Indicator;
  status: Status;
  title: string;
  summary: string;
  current: Measurement | null;
  baseline: number | null;
  change: number | null;
  persistence: number;
  observations: number;
  window: string;
  rule: AlertRule;
  explanation: string;
  uncertainty: string;
  next: string;
  evidenceIds: string[];
  generatedAt: string;
  notify: boolean;
}
export interface AssessmentResult {
  id: string;
  astronautId: string;
  scenario: Scenario;
  day: number;
  timestamp: string;
  trials: number[];
  falseStarts: number;
  misses: number;
  anticipatory?: number;
  median: number;
}
export interface CrewNotification {
  id: string;
  astronautId: string;
  scenario: Scenario;
  day: number;
  findingId: string;
  title: string;
  acknowledged: boolean;
  timestamp: string;
}
export interface Activity {
  id: string;
  title: string;
  category: string;
  duration: string;
  description: string;
  steps: string[];
}
export interface Completion {
  astronautId: string;
  activityId: string;
  day: number;
  scenario: Scenario;
  timestamp: string;
}
export interface AppState {
  astronautId: string;
  scenario: Scenario;
  day: number;
  environmentId: string;
  readings: Measurement[];
  assessments: AssessmentResult[];
  completions: Completion[];
  notifications: CrewNotification[];
  checkins: Record<string, string>;
  voice: boolean;
  session: Session;
}
export interface Session {
  /** a demo profile has been chosen at least once */
  entered: boolean;
  /** profiles that have seen the mission briefing */
  briefed: string[];
}
