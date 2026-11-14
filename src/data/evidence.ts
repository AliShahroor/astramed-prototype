import type { Evidence } from "../types";
export const evidence: Evidence[] = [
  {
    id: "co2",
    agency: "NASA",
    title: "OCHMO-TB-004 · Carbon Dioxide",
    url: "https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/",
    version: "Technical brief citing NASA-STD-3001 Vol 2 Rev D (2023)",
    section: "Reference Information; V2 6004",
    type: "standard",
    statement:
      "The habitat requirement limits one-hour average CO₂ partial pressure to at most 3 mmHg. This app compares only matching averages and units.",
    limitations:
      "A habitat design reference, not a diagnosis or an instantaneous exposure limit. Rev D is the pinned demonstration reference; mission applicability needs review. The original Rev D PDF link returned 404 during verification.",
    verified: true,
    limit: 3,
    unit: "mmHg",
    aggregation: "one_hour_average",
  },
  {
    id: "radiation",
    agency: "NASA",
    title: "NASA-STD-3001 · Volume 1, Revision C",
    url: "https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf",
    version: "Revision C · November 2023",
    section: "4.8.2 · V1 4030; 4.8.1 · V1 4029",
    type: "standard",
    statement:
      "Career effective spaceflight dose must remain below 600 mSv; exposure should also be minimized under ALARA. The app calculates career-reference utilization.",
    limitations:
      "This comparison cannot assess acute events, organ doses or individual cancer risk. Synthetic effective dose assumes the standard’s dose convention; it is not dosimetry.",
    verified: true,
    limit: 600,
    unit: "mSv",
  },
  {
    id: "measures",
    agency: "NASA",
    title: "Spaceflight Standard Measures",
    url: "https://www.nasa.gov/reference/standard-measures/",
    version: "NASA web reference · verified 14 November 2026",
    section: "Data collection and Impact",
    type: "research",
    statement:
      "NASA collects sleep reports, activity, cognition and strength measures before, during and after missions. This supports longitudinal personal comparisons.",
    limitations:
      "Does not validate this app, its browser assessment or the Code Blue percentage cutoffs.",
    verified: true,
  },
  {
    id: "pvt",
    agency: "NASA",
    title: "Psychomotor Vigilance Test on ISS",
    url: "https://humanresearchroadmap.nasa.gov/Tasks/task.aspx?i=1651",
    version: "Task record · published 13 May 2025",
    section: "Reaction Self-Test on ISS-12 · task record",
    type: "research",
    statement:
      "NASA lists an ISS psychomotor vigilance research task addressing sleep and behavioral performance. It motivates measuring responses alongside sleep history.",
    limitations:
      "ASTRAMED’s five-trial task is inspired by reaction-time measurement, not an implementation or validation of the NASA PVT. Device and browser timing matter; association is not causation.",
    verified: true,
  },
  {
    id: "hazards",
    agency: "NASA",
    title: "Five Hazards of Human Spaceflight",
    url: "https://www.nasa.gov/hrp/hazards/",
    version: "NASA HRP web reference · verified 14 November 2026",
    section: "Five hazards",
    type: "context",
    statement:
      "NASA organizes hazards around radiation, isolation, distance from Earth, gravity fields and hostile or closed environments. These determine the app’s monitoring filters.",
    limitations:
      "Hazard categories do not establish individual medical thresholds.",
    verified: true,
  },
  {
    id: "exercise",
    agency: "NASA",
    title: "Astronaut Exercise",
    url: "https://www.nasa.gov/general/astronaut-exercise/",
    version: "NASA web article · verified 14 November 2026",
    section: "Exercise equipment and research",
    type: "context",
    statement:
      "NASA describes specialized resistance exercise equipment used in microgravity. Activities here emphasize approved equipment and mission-specific plans.",
    limitations:
      "Generic activity demonstrations are not astronaut-approved protocols or individualized prescriptions.",
    verified: true,
  },
];
export function evidenceFor(id: string) {
  return evidence.find((e) => e.id === id)!;
}
