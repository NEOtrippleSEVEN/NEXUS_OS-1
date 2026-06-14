// pathStore.js — persistence (CLAUDE.md rule 3). UI/PathEngine never touch
// localStorage directly; it all goes through here.
//
// Placeholder (Chunk 1). State is currently in-memory only (refresh loses it).
// Chunk 4 implements load() / save(eng) / clear() over localStorage under key
// `nexus.path.v1`, plus reviveEng() to turn stored date STRINGS back into Date
// objects (JSON has no Date type — the trap this module exists to handle).
export {}
