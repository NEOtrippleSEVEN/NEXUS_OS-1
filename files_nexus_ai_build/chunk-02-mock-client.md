# Chunk 02 — Mock claudeClient (the €0 unlock)

**Outcome:** All LLM calls go through `claudeClient.js`, which runs in **mock mode**: returns realistic fixture data with a fake ~1s delay. The full loop — generate, expand, decompose, complete, re-date — works locally with zero API cost.

**Done when:** Click Generate → a real-looking 5-milestone path appears. Complete it through to mission-complete using only fixtures.

**Estimated:** ~2–3h

## Design
`claudeClient.js` exposes exactly three functions (same signatures the real client will have):
- `generatePath(mission, constraints)` → `{status:'generated', milestones:[...]}` or `{status:'needs_sharpening', ...}`
- `expandMilestone(milestone, pathContext)` → `{tasks:[...]}`
- `decomposeTask(task, context)` → `{steps:[...]}`

A `MOCK = true` flag at the top switches mode. In mock mode:
- `generatePath` returns a fixture: the real "Ship Nexus V0" path (5 milestones, honest hours, M1 with 4 session-sized tasks with done-criteria). If the mission string contains "rich"/"successful"/"fit", return a `needs_sharpening` fixture instead — so the gate is testable too.
- `expandMilestone` returns 3–4 plausible fixture tasks for any milestone.
- `decomposeTask` returns 3 fixture micro-steps (one with why/source fields).
- Each call waits ~800ms (`setTimeout`) so loading states render like real life.

## Prompt to Claude Code
> Create `src/engine/claudeClient.js` per CLAUDE.md rule 3 and the design above. Move the fixture data into `src/engine/fixtures.js`. Refactor `NexusPathEngine.jsx` to call `claudeClient` functions instead of `fetch` — remove the direct Anthropic fetch and the parse/retry logic from the component (the real client will own retries later). Keep all UI behavior identical.

## Validate before accepting
- [ ] Generate → fixture path renders with dates computed (dates still come from the component's pacing code — fixtures carry NO dates, only effort-hours; if fixture data contains dates, reject the diff: rule 1)
- [ ] "Get fit" mission → sharpening gate fires
- [ ] Break it down → steps appear; complete a milestone → next expands, horizon re-dates
- [ ] No `fetch` remains in the component
- [ ] Read the diff: one comprehension question answered (e.g. why the fake delay matters)

## Commit
`feat: claudeClient with mock mode + fixtures — full loop runs offline`
