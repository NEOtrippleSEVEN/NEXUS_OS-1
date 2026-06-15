// claudeClient.js — every LLM call goes through here (CLAUDE.md rule 3).
//
// Chunk 2: MOCK mode. Returns realistic fixtures behind a ~800ms fake delay, so
// the whole loop — sharpen → generate → expand → decompose → complete →
// re-date — runs locally at €0. Flip MOCK to false (Chunk 5) and the same four
// functions hit Claude through a proxy; the UI never changes — that is the test
// of this module boundary.
//
// Dates: fixtures carry effort-HOURS only. pacing.js computes every date.

import {
  SHARP_QUESTIONS, VAGUE_QUESTIONS, BRIEF, PATH, TASKS_BY_TITLE, GENERIC_TASKS, STEPS,
} from './fixtures.js'

const MOCK = true
const MOCK_DELAY = 800 // ms — long enough that the component's loading states actually render

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/* ====================================================================== *
 * Public surface — the four calls. Same signatures the live client keeps.
 * ====================================================================== */

export async function sharpen(conversation, constraints) {
  if (MOCK) {
    await delay(MOCK_DELAY)
    return mockSharpen(conversation)
  }
  return callClaude(SHARPEN_SYSTEM, [{ role: 'user', content: JSON.stringify({ constraints, conversation }) }], 1200)
}

export async function generatePath(brief, constraints) {
  if (MOCK) {
    await delay(MOCK_DELAY)
    return mockGeneratePath()
  }
  return callClaude(GENERATE_SYSTEM, [{ role: 'user', content: JSON.stringify({ brief, constraints }) }], 2500)
}

export async function expandMilestone(milestone, brief) {
  if (MOCK) {
    await delay(MOCK_DELAY)
    return mockExpand(milestone)
  }
  const slim = { title: milestone.title, summary: milestone.summary, effortHours: milestone.effortHours }
  return callClaude(EXPAND_SYSTEM, [{ role: 'user', content: JSON.stringify({ brief, milestone: slim }) }], 1800)
}

export async function decomposeTask(task, context) {
  if (MOCK) {
    await delay(MOCK_DELAY)
    return mockDecompose()
  }
  const slim = { title: task.title, firstAction: task.firstAction, doneCriterion: task.doneCriterion }
  return callClaude(DECOMPOSE_SYSTEM, [{ role: 'user', content: JSON.stringify({ context, task: slim }) }], 1200)
}

/* ====================================================================== *
 * MOCK branch — scripted but adaptive-feeling. Real adaptivity arrives when
 * MOCK flips to false (Chunk 5). See docs/AMENDMENTS.md (A2).
 * ====================================================================== */

const VAGUE = /\b(rich|fit|successful|happy|healthy|wealthy|in shape)\b/i

function mockSharpen(conversation) {
  const mission = conversation[0]?.text ?? ''
  const vague = VAGUE.test(mission) && mission.trim().split(/\s+/).length < 9
  const questions = vague ? VAGUE_QUESTIONS : SHARP_QUESTIONS
  const asked = conversation.filter((t) => t.role === 'engine').length
  if (asked < questions.length) return { status: 'question', question: questions[asked] }
  return { status: 'ready', brief: BRIEF }
}

function mockGeneratePath() {
  // effort-hours only — pacing.js dates it
  return { status: 'generated', milestones: PATH.map((m) => ({ ...m })) }
}

function mockExpand(milestone) {
  const tasks = TASKS_BY_TITLE[milestone.title] ?? GENERIC_TASKS
  return { tasks: tasks.map((t) => ({ ...t })) }
}

function mockDecompose() {
  return { steps: STEPS.map((s) => ({ ...s })) }
}

/* ====================================================================== *
 * REAL branch — used only when MOCK = false. Chunk 5 swaps the endpoint for
 * the key-holding /api/claude proxy and moves these prompts into prompts.js.
 * The fence-strip + one-retry parse lives HERE, never in the UI.
 * ====================================================================== */

const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const CLAUDE_MODEL = 'claude-sonnet-4-6'

const TASK_RULES = `Every task MUST be:
- session-sized: roughly 2-4 hours of focused work, not a multi-day epic
- concrete: a "firstAction" the founder could literally start in the next 10 minutes
- verifiable: a "doneCriterion" that is observably true or false, never "make progress on X"
- an outcome, not an activity ("100 signups live" not "work on marketing")
Emit effort in HOURS only. Never output dates, weeks, or a schedule — the engine dates everything.`

const SHARPEN_SYSTEM = `You are the Nexus OS goal-sharpening interviewer. A founder states a mission;
your job is to interrogate it until it is precise enough to plan against, then stop.

Reason against this internal rubric (do NOT recite it as a checklist — ask naturally):
  1. Outcome + metric  — the literal, measurable success state ("$10k MRR", not "be successful")
  2. Deadline          — a real target date
  3. Starting line     — where they are now (idea / prototype / live / revenue; audience; what exists)
  4. Time budget       — honest hours/week, and what competes for them
  5. Assets & limits   — skills/tools/audience/money they already have, and hard constraints
  6. First concrete win — what "done" looks like for the very first milestone

Adapt: skip anything already answered, and DRILL vague answers ("'get fit' — fit measured how, by when?").
Ask ONE sharp question at a time. Most goals are sharp after 2-6 questions; do not over-interview.

Respond with ONLY a JSON object, no prose, no code fences:
  {"status":"question","question":"<one sharp question>"}
  — or, once the goal is precise enough —
  {"status":"ready","brief":{"outcome":"...","metric":"...","deadline":"...","startingLine":"...","hoursPerWeek":<n>,"assets":"...","constraints":"...","firstWin":"..."}}`

const GENERATE_SYSTEM = `You are the Nexus OS path planner. Given a sharpened brief, return an honest path of
about 5 milestones from the founder's real starting line to the outcome. Be specific to THIS
founder's situation — no generic filler. If the brief is still too vague to plan honestly, say so.

${TASK_RULES}

Respond with ONLY a JSON object, no prose, no code fences:
  {"status":"generated","milestones":[{"title":"...","summary":"<one line>","effortHours":<n>}]}
  — or —
  {"status":"needs_sharpening","reason":"<one specific question to sharpen the goal>"}`

const EXPAND_SYSTEM = `You expand ONE milestone into 3-4 session-sized tasks for a Nexus OS path.

${TASK_RULES}

Respond with ONLY a JSON object, no prose, no code fences:
  {"tasks":[{"title":"...","firstAction":"...","doneCriterion":"...","effortHours":<n>}]}`

const DECOMPOSE_SYSTEM = `You break ONE task into exactly 3 concrete micro-steps. Where a step needs a fact, link,
or reason the founder would otherwise have to look up, include "why" and/or "source".

Respond with ONLY a JSON object, no prose, no code fences:
  {"steps":[{"text":"...","why":"...","source":"..."}]}  (why/source optional per step)`

class ClaudeError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.name = 'ClaudeError'
    this.status = status
    this.detail = detail
  }
}

// Models sometimes wrap JSON in ```json ... ``` fences; strip them before parse.
function stripFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

async function callClaude(system, messages, maxTokens = 2000, isRetry = false) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY // only reached when MOCK = false
  const resp = await fetch(CLAUDE_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey || '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages }),
  })

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '')
    throw new ClaudeError(`Claude request failed (HTTP ${resp.status})`, resp.status, detail)
  }

  const data = await resp.json()
  const text = data?.content?.[0]?.text ?? ''
  const truncated = data?.stop_reason === 'max_tokens'

  try {
    if (truncated) throw new Error('truncated')
    return JSON.parse(stripFences(text))
  } catch {
    // One compact retry on truncation or a bad parse — ask for clean JSON with more room.
    if (!isRetry) {
      const retryMessages = [
        ...messages,
        { role: 'assistant', content: text },
        { role: 'user', content: 'That was cut off or not valid JSON. Reply again with ONLY the complete, valid JSON object — no prose, no code fences.' },
      ]
      return callClaude(system, retryMessages, maxTokens + 1000, true)
    }
    throw new ClaudeError('The model did not return valid JSON.', 200, text)
  }
}
