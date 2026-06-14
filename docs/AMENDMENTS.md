# Design amendments

Changes to the original chunk plan, agreed during the build, recorded so the
specs in `files_nexus_ai_build/` stay honest.

## 2026-06-14 — A1: No saved prototype → build from spec

The chunk plan assumes an existing, validated `NexusPathEngine.jsx` (built as a
Claude.ai artifact). It was never saved to disk and is gone. Decision: **author
the monolith from spec** (CLAUDE.md + the behavior described across the chunks)
as Chunk 1, keeping it deliberately monolithic so Chunks 2–5 can extract modules
out of it exactly as written. Net effect on the plan: only the *source* of the
prototype changed; the chunk sequence is unchanged.

## 2026-06-14 — A2: Intake is a fully-adaptive sharpening interview

The original intake is single-shot (`generatePath(mission, constraints)` →
`generated` | `needs_sharpening`). A single broad question ("what are you
building?") accepts vague input and therefore produces generic paths.

Decision: grow the `needs_sharpening` gate into a **fully-adaptive interview**.
The engine drives a short, conversational sharpening loop before any path is
generated:

```
sharpen(conversation)
  -> { status: 'question', question }   // ask the next thing; repeat
  -> { status: 'ready', brief }         // goal is concrete; generate from brief
```

The AI decides *both* what to ask and *when* the goal is precise enough — no
fixed slot list. To keep it disciplined (not scattered or unbounded), the system
prompt gives it an internal rubric to reason against — outcome + metric,
deadline, starting line, time budget, assets/constraints, first concrete win —
and a soft cap (~2–6 questions). Rubric-guided in judgment, adaptive in behavior.

Path precision then comes from (a) the specifics the interview extracts and
(b) the existing TASK_RULES (session-sized, concrete first action, verifiable
doneCriterion) — "actual things a person would do," not filler.

### Impact on the chunks
- **Chunk 1:** intake is an interview state machine (`intake → sharpening →
  path`), not a single form.
- **Chunk 2:** mock `sharpen()` plays a *scripted* adaptive sequence (canned
  questions → `ready`) so the loop is testable at €0. Real adaptivity needs the
  live LLM and arrives only when `MOCK` flips (Chunk 5).
- **Chunks 3 / 4:** unchanged. pacing.js, the no-LLM-does-dates rule, and
  pathStore are unaffected.

## 2026-06-14 — A3: Visual brand locked to real Nexus OS identity

Adopt the actual brand: warm light "paper" canvas, fine dot-grid, monochrome
ink with a black primary action, frosted-glass cards, the `Nexus OS` wordmark +
`THE FOUNDER'S OPERATING SYSTEM` tagline, middot metadata, status-dot lines.
The **bonsai canvas and The Orb remain out of scope for V0** (per CLAUDE.md). We
build the Path Engine wearing the brand, nothing more.
