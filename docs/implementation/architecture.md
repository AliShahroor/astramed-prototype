# Architecture

The root Vite application is a static single-page app. It has no remote database, authentication provider, live telemetry or API credentials.

- `src/types/index.ts`: typed domain records for astronauts, missions, environments, measurements, rules, findings, evidence, assessments, notifications and activities.
- `src/data/catalog.ts`: fictional crew, baselines, context options, indicator definitions, hazard mappings and illustrative activities.
- `src/data/evidence.ts`: small verified local NASA evidence summaries, versions and limitations.
- `src/engine/monitoring.ts`: pure generation, filtering, baseline math, trend persistence, reference comparisons, assessment aggregation and input validation.
- `src/app/useMission.ts`: shared persisted state and crew policy evaluation. All pages read this state; there are no separate hardcoded crew diagnoses.
- `src/app/App.tsx` and `route.ts`: entry/session coordination and hash routing for direct static-host links.
- `src/screens`: welcome, fictional profile selection and mission briefing.
- `src/workspace`: shared shell/context, separate My Health, Crew and Countermeasures workflows, and forms/evidence viewers.
- `src/workspace/crewOperations.ts`: pure derivation of shared status, counters, real check-in history and privacy-filtered saved activity.
- `src/components`: accessible native dialog wrapper, chart with accessible data table, timed assessment workflow.
- `src/styles/main.css`: shared restrained clinical design system, responsive layouts and reduced-motion rules; Tailwind is integrated through Vite.
- `tests/monitoring.test.ts`: original calculation/data-rule tests. `tests/operations.test.ts`: migration, routing and derived Crew state/privacy tests. `tests/browser/app.spec.ts`: production-browser entry, session, core flows, offline and accessibility checks.

State remains under `astramed-state-v1` in localStorage and can be reset or exported. Legacy states gain optional session preferences and coordination-request storage without losing readings, check-ins, completions, assessments or acknowledgement state. A cabin notification migrates to a habitat owner instead of a named astronaut, with a stable deduplication identity. The storage loader rejects malformed top-level state; quota/permission failures produce a visible message and leave in-memory operation available. Browser storage is not encrypted, authenticated or appropriate for real medical records. Multi-device sync and concurrent multi-tab reconciliation are outside this prototype.

The Vite build emits a versioned `sw.js` with an explicit precache list covering index, all local JS/CSS chunks, icon and manifest. The worker activates after successful precache, removes prior ASTRAMED cache versions and serves cached same-origin assets. Navigation falls back to cached index when disconnected. External NASA links are never required to interpret local evidence summaries. No offline claim is made for development mode, first visit without connectivity or browser voice engines.

Hash-based navigation (`#/health`, `#/crew`, `#/countermeasures/physical`, `/cognitive`, `/progress`) does not require server routes. Welcome is `#/`, with `#/access` and `#/briefing` for entry. Direct workspace links remain usable without completing onboarding. Signing out only ends the simulated session; there is no authenticated access or medical-data security. Root and subdirectory hosting are supported. The manifest uses relative paths, worker registration uses Vite BASE_URL, and production builds can set --base=/project/. New builds change the cache version; an already open page may need reload to use the new shell.
