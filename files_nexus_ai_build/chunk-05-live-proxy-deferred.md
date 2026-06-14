# Chunk 05 — Live proxy (DEFERRED until API credits exist)

**Do not build this yet.** It costs money to run and nothing upstream depends on it. It exists as a spec so the swap is a 30-minute job the day credits arrive.

**Outcome:** `claudeClient` flips `MOCK = false` and real generation works through a local key-proxy. Nothing else in the codebase changes — that's the test of the module boundary.

**Estimated:** ~1.5h (+ prompt file extraction)

## Design
1. Vite middleware proxy at `/api/claude` (full snippet in `nexus-path-engine-guide.md` §3): holds `ANTHROPIC_API_KEY` server-side, forwards to `api.anthropic.com/v1/messages`. Key comes from env, never committed (add `.env` to `.gitignore` from chunk 01).
2. Move the three system prompts + shared TASK_RULES from the prototype into `src/engine/prompts.js`.
3. Implement the real branch of `claudeClient`: fetch `/api/claude`, `max_tokens: 2000+`, parse with the fence-stripping parser, one compact retry on truncation (`stop_reason === "max_tokens"`) or parse failure. Retry logic lives HERE, not in the component.

## Validate before accepting (when the day comes)
- [ ] `MOCK = false` + key in env → real path generates; `MOCK = true` still works (mock stays as the offline/dev mode forever — it's also your test fixture)
- [ ] Component diff is zero or near-zero — if flipping the flag required UI changes, the boundary leaked; fix the boundary, not the UI
- [ ] Generate your real mission live and judge it against the four questions (top task doable tomorrow? estimates honest? outcomes not activities? horizon believable?)

## Commit
`feat: live claude proxy behind claudeClient — mock remains default dev mode`

## Cost note
Generation is cheap per call (a few cents with Sonnet at these token counts); the budget risk is regenerate-spam, not single calls. When credits exist, set a habit: generate deliberately, not repeatedly. Until then, the chat artifact remains the free live-quality testbed.
