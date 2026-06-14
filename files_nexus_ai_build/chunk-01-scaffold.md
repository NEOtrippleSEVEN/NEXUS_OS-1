# Chunk 01 — Scaffold runs, component renders

**Outcome:** Vite + React project exists; `NexusPathEngine.jsx` renders in the browser. Nothing works yet beyond display — generation will fail, that's expected (no API). 

**Done when:** `npm run dev` → intake form visible at localhost, no console errors on load.

**Estimated:** ~1–1.5h

## Prompt to Claude Code
> Create a Vite React project (JS, not TS). Add Tailwind (the component uses utility classes). Place the existing `NexusPathEngine.jsx` in `src/`, render it from `App.jsx`, strip the default Vite boilerplate/CSS that conflicts. Do not modify the component's logic. Create the empty `src/engine/` folder structure from CLAUDE.md with placeholder files.

## Validate before accepting
- [ ] App loads, intake form + example chips visible
- [ ] No console errors on load (a failed generate click is fine — expected)
- [ ] `src/engine/` exists with the six placeholder files
- [ ] Read the diff: can you say what `App.jsx` does, line by line?

## Commit
`chore: scaffold vite + render path engine component`
