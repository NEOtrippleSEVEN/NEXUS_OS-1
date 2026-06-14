// claudeClient.js — every LLM call goes through here (CLAUDE.md rule 3).
//
// Placeholder (Chunk 1). The real calls are currently INLINE in
// NexusPathEngine.jsx as a direct Anthropic fetch (which fails with no key —
// that is Chunk 1's expected state).
//
// Chunk 2 moves them here behind a `MOCK = true` flag returning fixture data.
// Chunk 5 adds the live `/api/claude` proxy branch. Planned surface:
//   sharpen(conversation)        -> { status:'question', question } | { status:'ready', brief }
//   generatePath(brief)          -> { status:'generated', milestones } | { status:'needs_sharpening' }
//   expandMilestone(m, context)  -> { tasks:[...] }
//   decomposeTask(task, context) -> { steps:[...] }
export {}
