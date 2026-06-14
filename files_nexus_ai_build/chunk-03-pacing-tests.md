# Chunk 03 — Extract pacing.js + unit tests

**Outcome:** All date/velocity math lives in `src/engine/pacing.js` as pure functions, covered by unit tests. The component imports it; zero math inline in the UI.

**Done when:** `npm test` passes; app behaves identically to before.

**Estimated:** ~2–3h

## Design
`pacing.js` exports (no I/O, no React, no Date.now() inside — "today" is always a parameter, so tests are deterministic):
- `reDate(milestones, fromDate, velocity)` — lay non-complete milestones end-to-end; completed ones keep actual dates
- `effVelocity(plannedHPW, log)` — observed pace blended with planned as a prior
- `horizonOf(milestones)` — last end date

Tests (Vitest) — minimum set:
1. 2 milestones, 10h+20h at 10h/wk → ends exactly 3 weeks from `fromDate`
2. Empty completion log → velocity === plannedHPW
3. One slow completion (took 2× estimate) → velocity drops but NOT to the raw observed value (prior damps it)
4. After a slow completion, horizon moves later; after a fast one, earlier
5. Completed milestones keep their actual dates through a reDate

## Prompt to Claude Code
> Extract the pacing math from `NexusPathEngine.jsx` into `src/engine/pacing.js` per the design above — pure functions, `today` always passed in, never read inside. Add Vitest and write the five listed tests. Update the component to import from pacing.js. Behavior must not change.

## Validate before accepting
- [ ] All five tests pass — and read test 3: do you understand the prior math now? (This is `effVelocity`'s honesty mechanism — the thing that keeps the horizon calm.)
- [ ] No `new Date()` for "now" inside pacing.js
- [ ] App runs identically on fixtures
- [ ] Try breaking it: change a test's expected value, watch it fail, revert. (Proves the tests actually test.)

## Commit
`refactor: extract pacing.js as pure module + unit tests`
