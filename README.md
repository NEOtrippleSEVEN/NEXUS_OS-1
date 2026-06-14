# Nexus OS — Path Engine (V0)

The founder's operating system, core engine. State a mission + constraints; the
engine sharpens the goal through an adaptive interview, then returns an **honest,
dated path** — milestones broken into session-sized tasks — and re-dates the
finish-line **horizon** from your real velocity as you complete work.

Solo build (Kareem). React frontend only for now; a Django backend comes later.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

## Architecture

See [CLAUDE.md](CLAUDE.md) for the hard rules. The build proceeds chunk by chunk;
specs live in [`files_nexus_ai_build/`](files_nexus_ai_build/), design changes in
[`docs/AMENDMENTS.md`](docs/AMENDMENTS.md).

```
src/engine/
  PathEngine.js    orchestrator
  claudeClient.js  LLM calls — MOCK now, proxy later
  pathStore.js     persistence — localStorage
  pacing.js        pure dating + velocity math (unit-tested)
  prompts.js       system prompts + task rules
  schema.js        shapes + runtime validation
src/NexusPathEngine.jsx   the single UI component
```

## Status

- **Chunk 1 (done):** Vite + React + Tailwind scaffold; monolith component
  authored from spec; intake renders. Generation fails by design (no API yet).
- Chunk 2: mock `claudeClient` — full loop runs offline at €0.
- Chunk 3: extract `pacing.js` + Vitest tests.
- Chunk 4: `pathStore` persistence.
- Chunk 5 (deferred): live Claude proxy.
