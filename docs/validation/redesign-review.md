# Product overhaul review · 14 November 2026

## Scope and isolation

The existing ASTRAMED application was upgraded on `redesign/operations-overhaul`. The user requested an isolated checkout after concurrent edits were detected in the original folder. Worktree: `/private/tmp/astramed-operations`. The source repository, original working folder, independent `template/` and `Template2/` remain separate. No public deployment was performed for this overhaul.

`checkpoint/pre-product-overhaul-20261114` preserves the original published source (`03ac8c7`). Commit `339df18` captures the in-progress entry/workspace refactor copied into the isolated checkout before further work.

## Review findings and resulting behavior

Inspection of the original rendered application confirmed oversized crew cards, small labels, persistent simulation controls and a large amount of repeated explanatory text. The original roster displayed synthetic routine check-in timestamps, which did not establish real recorded participation.

The overhaul introduces:

- Welcome → four fictional profiles → mission briefing → workspace, with Quick Demo, direct hash links, remembered briefing preferences, profile switching and sign-out that retains records.
- A compact sidebar, clinical page headings, locally packaged Inter typography, consistent controls and secondary simulation/preferences controls.
- Crew totals derived from shared findings and saved events; a roster with shared detail dialogs; real last-recorded check-ins; explicit local follow-up/support requests; notification review, acknowledgement and dismissal; a seven-day coverage table; and saved activity history.
- Limited-sharing profiles hide personal findings, cognitive assessments and activity details in Crew. Switching fictional profiles remains a demonstration control, not authenticated authorization.
- Grouped indicator selection, hazard context/filtering, time windows, readable charts and explicit calculation formulas in health-card details.
- Activity equipment context, existing timed cognitive assessment, chronological personal history, activity-frequency visualization and mission-day streaks.
- Legacy localStorage migration. Existing v1 readings, assessment results, completions, check-ins, voice preference and acknowledgement state are retained. The storage key remains `astramed-state-v1`.
- Dialog focus restoration and keyboard-accessible controls; desktop, tablet and mobile layouts with reduced-motion support.

The monitoring engine and NASA evidence catalog are unchanged from `03ac8c7`. Reaction-time stimulus scheduling, trial exclusion, aggregation and saving retain the original implementation; only its presentation was changed. The app continues to use the original pinned scientific references and illustrative Code Blue rules.

## Verification

- TypeScript: passed through `tsc -b` and production builds.
- ESLint: passed.
- Clean dependency installation: `npm ci` passed with 0 reported vulnerabilities; the isolated checkout has its own dependencies. The resulting production asset hashes match the tested build.
- Unit tests: 25 passed (18 original monitoring tests plus 7 migration, route and Crew-state tests).
- Root-path browser suite: 12 passed after fixing control naming, dialog return focus and navigation contrast.
- Production build with `--base=/astramed-prototype/`: passed.
- Pages-subdirectory browser suite: 12 passed (40.0 seconds on the final delivery build), including direct hash navigation and offline reload at `/astramed-prototype/`.

Browser coverage includes evidence and calculated comparisons, scenario/day changes, manual validation and persistence, all four profiles, briefing/session behavior, direct links/back navigation, real practice plus five timed trials, acknowledgement/dismissal, support check-ins, activity completion and history, privacy boundaries, legacy storage migration, export, speech-synthesis API dispatch, keyboard dialogs, production offline reload and local operations while disconnected.

Axe WCAG 2 A/AA and 2.1 AA scans cover all three workspace sections, the profile menu, logging, health-card and preferences dialogs, welcome, profile selection and briefing, including mobile briefing. These automated checks supplement visual and keyboard review; they do not establish full accessibility certification.

Responsive checks and screenshots cover 1440, 1280, 768 and 390 CSS pixels. Screenshots are in this `redesign/` directory. Browser checks assert that the document does not overflow horizontally. Additional captured profile-selection, cognitive and populated progress screens cover 1280 and 390 pixels. Final visual review corrected wrapping reaction-chart axis units and the zero baseline of the activity-frequency bars. Navigation helpers wait for the new page heading before capture to avoid screenshots with a previous page’s dimensions.

## Limits and remaining work

- Integrate this branch with the other editor’s changes before replacing the original checkout or publishing. The current public URL still represents the separately deployed version.
- Public, synthetic demonstration only: no real authentication, telemetry, medical-data security, cross-device synchronization or clinical validation.
- Automated browser verification uses desktop Chrome with emulated viewport sizes. Safari, Firefox, actual mobile devices and assistive-technology user testing remain to be performed.
- Speech-synthesis API calls are verified with a browser stub. Actual audible voice output and offline voice availability depend on installed browser/platform voices and were not certified.
- Offline use requires a successful first online production load. External NASA pages still need a connection.
- Existing multiple-tab state reconciliation and malformed individual-record recovery remain outside scope; top-level storage validation and legacy migration are tested.
