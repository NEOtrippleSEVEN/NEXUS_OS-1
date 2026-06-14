# CLAUDE.md — Nexus OS Path Engine

## What this is
Nexus OS V0 core: a founder states a mission + constraints, the engine returns an honest dated path (milestones → session-sized tasks), and re-dates the finish-line **horizon** from the founder's real velocity as they complete work. Solo build (Kareem), React frontend only for now; a Django backend (Alex) comes later.

## Architecture (do not violate)
```
src/engine/
  PathEngine.js    orchestrator: generate · expandMilestone · completeMilestone
  claudeClient.js  LLM calls — currently MOCK fixture; later proxy; later Django
  pathStore.js     persistence — localStorage now, API later
  pacing.js        pure dating + velocity math (no I/O, unit-tested)
  prompts.js       system prompts + task rules
  schema.js        shapes + runtime validation
src/NexusPathEngine.jsx   the single UI component
```

## Hard rules
1. **No LLM ever does date math.** Claude outputs effort-hours and structure only; all dates come from `pacing.js`. Never move date logic into a prompt.
2. **`pacing.js` stays pure** — no fetch, no storage, no React. Must be testable with plain function calls.
3. **All persistence goes through `pathStore`**, all LLM calls through `claudeClient`. UI and PathEngine never touch localStorage or fetch directly.
4. **Tasks are session-sized** (~2–4h), concrete first action, verifiable doneCriterion. This rule lives in `prompts.js` and applies to every prompt that emits tasks.
5. **No API budget right now.** `claudeClient` runs in mock mode (fixture data). Do not add live API calls unless explicitly asked.
6. **One change per session.** Do not refactor neighboring code unasked. Small diffs — they get read before acceptance.

## Founder skill level (calibrate explanations to this)
Strong C and Python (42 school). Learning React/frontend on this project. Some Claude API experience. Explain React idioms when introducing them (one line, why this pattern), don't assume them.

## Out of scope for V0 — do not build, even if it seems helpful
XP/levels/streaks · multiple concurrent paths · accounts/server persistence · two-way calendar integration · the bonsai/Orb visual shell · "track everything" features.

## Current status
Working single-file prototype validated in Claude.ai (NexusPathEngine.jsx). Now being split into the module structure above, chunk by chunk: scaffold → mock client → pacing extraction + tests → pathStore persistence → live proxy (deferred until API credits exist).
