// pacing.js — pure dating + velocity math (CLAUDE.md rules 1 & 2).
//
// No LLM ever does date math; all dates are computed here. This module stays
// pure: no fetch, no storage, no React, and "today" is ALWAYS passed in (never
// read from new Date() inside), so the unit tests are deterministic.
//
// Placeholder (Chunk 1). The math currently lives INLINE in NexusPathEngine.jsx
// (effVelocity / reDate / horizonOf). Chunk 3 extracts it here with Vitest tests.
export {}
