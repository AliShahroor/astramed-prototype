# Validation record · 14 November 2026

## Executed local checks

| Check | Observed result |
| --- | --- |
| Clean lockfile installation: `npm ci` | Passed; 267 packages installed; audit reported 0 vulnerabilities. A development ESLint deprecation notice remains. |
| `npm run lint` | Passed. Root application, configuration and tests checked; unrelated Template2 excluded. |
| `npm test` | 18 / 18 tests passed. |
| `npm run build` | Passed TypeScript and production build. |
| `npm run build -- --base=/astramed-prototype/` | Passed; subdirectory assets, manifest and worker registration verified. |
| Root production Playwright suite | 8 / 8 passed before publication path changes. |
| Exact subdirectory production Playwright suite | 8 / 8 passed after final changes, in 28.3 seconds. |
| Credential-pattern scan of publication files | No matching token/private-key patterns found. This is not a full security audit. |

The dependency audit’s earlier development-only minimatch advisory was removed with a targeted override under @typescript-eslint/typescript-estree. Lint and TypeScript pass with the patched dependency. Runtime and development audit reported zero known vulnerabilities at clean install; advisories may change.

## Calculation coverage

Exact percentage math; zero/missing/nonfinite baselines; finite trial aggregation and exclusion; unit/timestamp/input-quality validation; deterministic scenario generation; scenario-specific statuses; isolated versus persistent personal changes; selected-window persistence; missing days; absent/stale/wrong-unit readings; personal identity/baseline changes; assessment-to-finding recalculation; latest timestamp per day; CO₂ averaging compatibility and boundary comparison; career-dose utilization and the strict 600 mSv bound.

## Browser coverage

Production build in an isolated headless Google Chrome context, driven by Playwright:

- Dynamic Explainable Health Cards, exact calculated percentage, NASA local evidence and original-link target.
- All scenario states and the 1.1 mmHg cabin-reference exceedance.
- Manual reading save, reload persistence, astronaut selection, mission day, environment context and hazard filtering.
- Crew policy notification, acknowledgement, personal check-in, activity completion and progress streak.
- A real timed practice interaction and five recorded keyboard-response trials. One early response was excluded. The saved median was compared with the calculated card; the test does not assume automation produces a healthy/nominal result. Notification history remains coherent after save.
- Data-quality form validation, Escape dismissal and demo reset.
- All three pages at 1440, 1280 and 390 pixels; no document-level horizontal overflow after chart reflow. Tables scroll inside their own containers. Screenshots saved alongside this record.
- Successful cache installation, network disabled, full page reload, scenario switching, local NASA summary, navigation, an actual offline timed practice response, offline manual reading and a second offline reload preserving it.
- Axe WCAG 2 A/AA and 2.1 AA checks on all three pages and logging dialog: no reported violations. Scans use reduced-motion mode for deterministic resting-state contrast; this is a basic automated check, not full conformance certification.

The browser console capture in the primary scenario/evidence flow reported no uncaught JavaScript errors. Invalid input shows a visible error instead of changing state. Native dialog supplies keyboard focus containment and Escape dismissal. Original external NASA URLs were independently inspected during source research; NASA link opening is not an offline feature.

## Issues corrected during verification

1. Navigation accessible names initially included the pending count; stable labels were added.
2. A form select’s implicit accessible name included its options; an explicit name was added.
3. Offline asset cache matches initially missed the preview server’s Vary header; same-origin public static-cache lookup now ignores Vary.
4. Scroll-container positioning and chart/table containment were corrected; responsive assertions wait for resize observer reflow.
5. Primary/secondary page-action reuse briefly interpolated colors; distinct keys prevent that transition across workflows.
6. Pending stimulus animation frames are canceled on restart/unmount/invalid trials.
7. Shared cabin notifications are deduplicated at habitat level.

## Publication status

The independent target repository [AliShahroor/astramed-prototype](https://github.com/AliShahroor/astramed-prototype) was created and remains empty. Automatic approval review rejected the commit-and-public-push operation because it requires explicit authorization for the exact public destination and payload. No application source was pushed and no new Pages deployment was performed. The existing astramed repository and Pages site are preserved. The proposed payload is 42 prepared source, configuration, test, documentation and screenshot files; user reference PDFs/DOCX, Template2, node_modules and local exports are excluded. Public publication and live-site verification remain pending approval.

## Explicitly unverified

Flight/clinical validity, medical safety, calibrated hardware latency, actual sensor integration, cross-device sync, real authorization/privacy protection, emergency messaging, offline browser voices, multiple browser engines, installed-PWA/eviction behavior and real spacecraft hardware. There is no official demo video or final presentation artifact; submission planning is provided. No claim of competition certification or deadline verification is made.
