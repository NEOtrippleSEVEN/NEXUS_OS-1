# Chunk 04 — pathStore: it remembers

**Outcome:** Engine state persists through `src/engine/pathStore.js` (localStorage). Close the tab, reopen → resume exactly where you left off: checked tasks, active milestone, horizon wherever your pace moved it.

**Done when:** Refresh mid-path → everything restored, horizon math still correct.

**Estimated:** ~2h

## Design
`pathStore.js` exports `load()`, `save(eng)`, `clear()`. The component never touches localStorage directly (CLAUDE.md rule 3).

**The trap this chunk exists to handle:** JSON has no Date type. On `load()`, every stored date is a string, and pacing math on strings silently produces garbage. `load()` must revive all date fields (`simToday`, `baselineHorizon`, each milestone's `plannedStart/End`, `actualStart/End`) back into Date objects. A `reviveEng` helper does this.

Wire-up: component initializes state from `load()` (lazy `useState` initializer); a `useEffect` on `eng` saves every change. "Generate" on an existing path asks for confirmation ("This replaces your current path") before clearing — accidental loss of a week's progress is the worst bug this feature can have.

Versioning: store under key `nexus.path.v1`. If the shape ever changes, bump the key rather than migrating — V0 data is disposable, founder time isn't.

## Prompt to Claude Code
> Create `src/engine/pathStore.js` per the design above, including reviveEng. Wire the component: lazy-init from load(), persist on every eng change, confirm before a generate that would overwrite an existing path. Add a small "Start over" action that calls clear() with the same confirmation.

## Validate before accepting
- [ ] Generate (fixture), check 2 tasks, refresh → both still checked
- [ ] Complete a milestone slow (e.g. 3 weeks), refresh → horizon still shows the moved date, "was" label intact
- [ ] In DevTools: `JSON.parse(localStorage.getItem('nexus.path.v1'))` — look at what a stored date is (a string!), then confirm the app still computes correctly after reload. That's reviveEng working.
- [ ] Generate-over-existing asks first

## Commit
`feat: pathStore persistence — resume where you left off`

---
**After this chunk:** the loop is complete and daily-usable, entirely offline. This is the point to start the M2 validation week — run your real 42+Nexus week through it on fixture-generated structure, or hand-edit the fixture to your real plan.
