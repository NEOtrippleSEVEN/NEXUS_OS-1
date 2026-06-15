import { useState } from 'react'
import {
  Sprout, ArrowRight, Lock, Search, CornerDownLeft, Check, ChevronDown,
  ChevronRight, RotateCcw, Loader2, AlertCircle, Calendar, ListChecks,
} from 'lucide-react'
import { addWeeks, weeksBetween, effVelocity, reDate, horizonOf, applyDates, MS_PER_WEEK } from './engine/pacing.js'
import { sharpen, generatePath, expandMilestone, decomposeTask } from './engine/claudeClient.js'

/* ====================================================================== *
 *  NEXUS OS — Path Engine  ·  V0 monolith
 *
 *  This is the deliberately single-file prototype. Everything lives inline
 *  here on purpose; the chunk plan extracts each concern into src/engine/*
 *  one module at a time:
 *    Chunk 2 -> claudeClient.js (the LLM calls + parse/retry, in MOCK mode)
 *    Chunk 3 -> pacing.js       (the date / velocity math, with unit tests)
 *    Chunk 4 -> pathStore.js    (localStorage persistence)
 *    Chunk 5 -> prompts.js + live proxy (deferred until API credits exist)
 *
 *  Hard rule reminders (see CLAUDE.md):
 *   1. No LLM ever does date math — it emits effort-hours only; pacing dates it.
 *   4. Tasks are session-sized, with a concrete first action + verifiable done.
 * ====================================================================== */

/* ----------------------------------------------------------------------
 * LLM calls + prompts now live in src/engine/claudeClient.js (MOCK mode),
 * imported at the top. The fence-strip + one-retry parse lives there, never
 * in the UI — CLAUDE.md rule 3.
 * -------------------------------------------------------------------- */

/* ----------------------------------------------------------------------
 * Small helpers
 * -------------------------------------------------------------------- */
function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
function fmtDate(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
// Turn raw LLM milestones (effort-hours only, no dates) into engine milestones.
function toMilestone(m, i) {
  return { id: `m${i}`, title: m.title, summary: m.summary, effortHours: Number(m.effortHours) || 0, status: 'pending', tasks: null }
}
// Map a thrown error to a calm, honest sentence for the founder.
function humanError(err) {
  // MOCK mode resolves instantly, so this is mostly dormant until the live
  // proxy is wired (Chunk 5).
  if (err?.status === 401 || err?.status === 403) {
    return 'The engine has no API key yet — that arrives with the live proxy (Chunk 5). Offline mock mode should answer instantly.'
  }
  if (err instanceof TypeError) {
    return 'Could not reach the engine. Offline mock mode needs no network — check src/engine/claudeClient.js.'
  }
  return err?.message || 'Something went wrong talking to the engine.'
}

const EXAMPLES = ['Reach $10k MRR by Q3', 'Land 10 paying customers', 'Launch an iOS app', 'Get fit']

const EMPTY_ENG = {
  phase: 'intake', // 'intake' | 'sharpening' | 'path'
  mission: '',
  constraints: { hoursPerWeek: 12, targetDate: '' },
  conversation: [], // [{ role: 'engine' | 'founder', text }]
  brief: null,
  milestones: [],
  log: [], // [{ milestoneId, estHours, actualWeeks }]
  simToday: startOfToday(),
  baselineHorizon: null,
}

/* ====================================================================== *
 *  Component
 * ====================================================================== */
export default function NexusPathEngine() {
  // Domain state lives in one object (this is what Chunk 4 will persist).
  // useState(() => ...) is a "lazy initializer": the function runs once, on
  // first render only — not on every re-render. Chunk 4 swaps it for load().
  const [eng, setEng] = useState(() => ({ ...EMPTY_ENG, simToday: startOfToday() }))

  // Transient UI-only state (not persisted).
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const patch = (fields) => setEng((e) => ({ ...e, ...fields }))

  /* ---- intake -> sharpening loop ---- */
  async function submitMission() {
    const m = eng.mission.trim()
    if (!m || busy) return
    setError(null)
    setBusy(true)
    const conversation = [{ role: 'founder', text: m }]
    try {
      const res = await sharpen(conversation, eng.constraints)
      await routeSharpen(conversation, res)
    } catch (err) {
      // Stay on the intake screen and explain — keeps the load-state clean.
      setError(humanError(err))
    } finally {
      setBusy(false)
    }
  }

  async function sendAnswer() {
    const a = answer.trim()
    if (!a || busy) return
    const conversation = [...eng.conversation, { role: 'founder', text: a }]
    patch({ conversation })
    setAnswer('')
    setError(null)
    setBusy(true)
    try {
      const res = await sharpen(conversation, eng.constraints)
      await routeSharpen(conversation, res)
    } catch (err) {
      setError(humanError(err))
    } finally {
      setBusy(false)
    }
  }

  async function routeSharpen(conversation, res) {
    if (res.status === 'question') {
      patch({ phase: 'sharpening', conversation: [...conversation, { role: 'engine', text: res.question }] })
    } else if (res.status === 'ready') {
      await runGenerate(res.brief, conversation)
    } else {
      setError('Unexpected response from the engine.')
    }
  }

  async function runGenerate(brief, conversation) {
    setBusy(true)
    setError(null)
    try {
      const res = await generatePath(brief, eng.constraints)
      if (res.status === 'needs_sharpening') {
        patch({ phase: 'sharpening', brief, conversation: [...conversation, { role: 'engine', text: res.reason }] })
        return
      }
      // Rule 1: the LLM gave effort-hours only — pacing.js assigns every date.
      const dated = applyDates(res.milestones.map(toMilestone), eng.simToday, eng.constraints.hoursPerWeek, [])
      patch({ phase: 'path', brief, milestones: dated, baselineHorizon: horizonOf(dated), log: [] })
    } catch (err) {
      setError(humanError(err))
    } finally {
      setBusy(false)
    }
  }

  /* ---- path-view interactions ---- */
  async function toggleMilestone(m) {
    const willOpen = expandedId !== m.id
    setExpandedId(willOpen ? m.id : null)
    if (willOpen && m.tasks == null) {
      setBusy(true)
      setError(null)
      try {
        const res = await expandMilestone(m, eng.brief)
        const tasks = res.tasks.map((t, i) => ({ id: `${m.id}-t${i}`, done: false, steps: null, ...t }))
        setEng((e) => ({ ...e, milestones: e.milestones.map((x) => (x.id === m.id ? { ...x, tasks } : x)) }))
      } catch (err) {
        setError(humanError(err))
      } finally {
        setBusy(false)
      }
    }
  }

  function toggleTask(mId, tId) {
    setEng((e) => ({
      ...e,
      milestones: e.milestones.map((m) =>
        m.id !== mId ? m : { ...m, tasks: m.tasks.map((t) => (t.id === tId ? { ...t, done: !t.done } : t)) },
      ),
    }))
  }

  async function breakDown(m, t) {
    setBusy(true)
    setError(null)
    try {
      const res = await decomposeTask(t, { milestone: m.title, brief: eng.brief })
      setEng((e) => ({
        ...e,
        milestones: e.milestones.map((x) =>
          x.id !== m.id ? x : { ...x, tasks: x.tasks.map((y) => (y.id === t.id ? { ...y, steps: res.steps } : y)) },
        ),
      }))
    } catch (err) {
      setError(humanError(err))
    } finally {
      setBusy(false)
    }
  }

  function completeMilestone(m, weeksTaken) {
    setEng((e) => {
      const actualStart = m.plannedStart || e.simToday
      const actualEnd = addWeeks(actualStart, weeksTaken)
      const completed = { ...m, status: 'complete', actualStart, actualEnd }
      const log = [...e.log, { milestoneId: m.id, estHours: m.effortHours, actualWeeks: weeksTaken }]
      const velocity = effVelocity(e.constraints.hoursPerWeek, log)
      const milestones = reDate(
        e.milestones.map((x) => (x.id === m.id ? completed : x)),
        e.simToday,
        velocity,
      )
      return { ...e, milestones, log }
    })
  }

  function advanceWeeks(n) {
    setEng((e) => {
      const simToday = addWeeks(e.simToday, n)
      const milestones = reDate(e.milestones, simToday, effVelocity(e.constraints.hoursPerWeek, e.log))
      return { ...e, simToday, milestones }
    })
  }

  function startOver() {
    // Chunk 4 adds a confirm() + pathStore.clear() here.
    setEng({ ...EMPTY_ENG, simToday: startOfToday() })
    setExpandedId(null)
    setError(null)
    setAnswer('')
  }

  /* ------------------------------------------------------------------ *
   *  Render
   * ------------------------------------------------------------------ */
  return (
    <div className="min-h-full w-full flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-2xl mx-auto px-5 pb-16">
        {eng.phase === 'intake' && (
          <IntakeView
            eng={eng}
            busy={busy}
            error={error}
            onMission={(v) => patch({ mission: v })}
            onHours={(v) => patch({ constraints: { ...eng.constraints, hoursPerWeek: v } })}
            onTarget={(v) => patch({ constraints: { ...eng.constraints, targetDate: v } })}
            onExample={(v) => patch({ mission: v })}
            onSubmit={submitMission}
          />
        )}

        {eng.phase === 'sharpening' && (
          <SharpeningView
            eng={eng}
            answer={answer}
            busy={busy}
            error={error}
            onAnswer={setAnswer}
            onSend={sendAnswer}
            onStartOver={startOver}
          />
        )}

        {eng.phase === 'path' && (
          <PathView
            eng={eng}
            busy={busy}
            error={error}
            expandedId={expandedId}
            onToggleMilestone={toggleMilestone}
            onToggleTask={toggleTask}
            onBreakDown={breakDown}
            onComplete={completeMilestone}
            onAdvance={advanceWeeks}
            onStartOver={startOver}
          />
        )}
      </main>
    </div>
  )
}

/* ====================================================================== *
 *  Presentational pieces (kept in-file: rule "the single UI component")
 * ====================================================================== */

function Header() {
  return (
    <header className="w-full flex items-start justify-between px-5 pt-5 pb-2">
      <div className="w-24" />
      <div className="flex-1 text-center">
        <div className="flex items-center justify-center gap-2">
          <Sprout size={17} className="text-[var(--nx-ink)]" />
          <span className="text-[15px] font-medium tracking-[0.2px] text-[var(--nx-ink)]">Nexus OS</span>
        </div>
        <div className="nx-label mt-1.5" style={{ letterSpacing: '2.4px' }}>
          The founder&apos;s operating system
        </div>
      </div>
      <div className="w-24 flex justify-end">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--nx-muted)] bg-[var(--nx-field)] border border-[var(--nx-line-strong)] rounded-md px-2 py-1">
          <Search size={12} /> Search
        </span>
      </div>
    </header>
  )
}

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="mt-4 flex items-start gap-2 text-[12px] text-[var(--nx-ink-soft)] bg-[var(--nx-field)] border border-[var(--nx-line-strong)] rounded-[var(--nx-radius-sm)] px-3 py-2.5">
      <AlertCircle size={14} className="mt-px shrink-0 text-[var(--nx-muted)]" />
      <span>{message}</span>
    </div>
  )
}

function IntakeView({ eng, busy, error, onMission, onHours, onTarget, onExample, onSubmit }) {
  return (
    <div className="flex flex-col items-center pt-8">
      <div className="text-center mb-5">
        <h1 className="text-[20px] font-medium text-[var(--nx-ink)] mb-1.5">What are you building?</h1>
        <p className="text-[13px] text-[var(--nx-muted)] max-w-[400px] leading-relaxed mx-auto">
          State your mission and constraints. The engine sharpens the goal, then returns an honest,
          dated path — milestones broken into session-sized tasks.
        </p>
      </div>

      <div className="nx-glass w-full max-w-[476px] p-[18px]">
        <label className="nx-label block mb-1.5">Mission</label>
        <textarea
          className="nx-field resize-none"
          rows={2}
          value={eng.mission}
          onChange={(e) => onMission(e.target.value)}
          placeholder="e.g. Ship Nexus OS V0 — a path engine I use daily — without dropping behind at 42 school"
        />

        <div className="flex gap-2.5 mt-3">
          <div className="flex-1">
            <label className="nx-label block mb-1.5">Hours / week</label>
            <input
              className="nx-field"
              type="number"
              min={1}
              value={eng.constraints.hoursPerWeek}
              onChange={(e) => onHours(Number(e.target.value))}
            />
          </div>
          <div className="flex-1">
            <label className="nx-label block mb-1.5">Target date</label>
            <input
              className="nx-field"
              type="text"
              value={eng.constraints.targetDate}
              onChange={(e) => onTarget(e.target.value)}
              placeholder="optional"
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[11px] text-[var(--nx-faint)] mb-2">Try an example</div>
          <div className="flex flex-wrap gap-[7px]">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="nx-chip" onClick={() => onExample(ex)}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="nx-btn nx-btn-primary w-full mt-[17px]"
          onClick={onSubmit}
          disabled={busy || !eng.mission.trim()}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <>Generate path <ArrowRight size={16} /></>}
        </button>

        <ErrorBanner message={error} />
      </div>

      <div className="flex items-center gap-1.5 mt-4 text-[11px] text-[var(--nx-faint)]">
        <Lock size={13} /> Runs locally · no account · your data stays in the browser
      </div>
    </div>
  )
}

function SharpeningView({ eng, answer, busy, error, onAnswer, onSend, onStartOver }) {
  return (
    <div className="pt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="nx-label">Sharpening the goal</div>
        <button type="button" className="nx-btn nx-btn-ghost !py-1.5 !px-2.5 text-[12px]" onClick={onStartOver}>
          <RotateCcw size={13} /> Start over
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {eng.conversation.map((turn, i) =>
          turn.role === 'engine' ? (
            <div key={i} className="nx-glass px-3.5 py-3 flex items-start gap-2.5">
              <Sprout size={15} className="mt-0.5 shrink-0 text-[var(--nx-ink)]" />
              <p className="text-[13px] leading-relaxed text-[var(--nx-ink)]">{turn.text}</p>
            </div>
          ) : (
            <div key={i} className="self-end max-w-[85%] bg-[var(--nx-field)] border border-[var(--nx-line)] rounded-[var(--nx-radius-sm)] px-3.5 py-2.5">
              <div className="nx-label mb-1" style={{ fontSize: '10px' }}>You</div>
              <p className="text-[13px] leading-relaxed text-[var(--nx-ink-soft)]">{turn.text}</p>
            </div>
          ),
        )}

        {busy && (
          <div className="flex items-center gap-2 text-[12px] text-[var(--nx-muted)] px-1">
            <Loader2 size={13} className="animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="nx-glass mt-3 p-2 flex items-end gap-2">
        <textarea
          className="nx-field resize-none !border-transparent !bg-transparent flex-1"
          rows={2}
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSend()
          }}
          placeholder="Answer the question…  (⌘↵ to send)"
        />
        <button type="button" className="nx-btn nx-btn-primary !py-2.5 !px-3" onClick={onSend} disabled={busy || !answer.trim()}>
          <CornerDownLeft size={15} />
        </button>
      </div>

      <ErrorBanner message={error} />
    </div>
  )
}

function PathView({ eng, busy, error, expandedId, onToggleMilestone, onToggleTask, onBreakDown, onComplete, onAdvance, onStartOver }) {
  const horizon = horizonOf(eng.milestones)
  const moved = eng.baselineHorizon && horizon && Math.abs(horizon.getTime() - eng.baselineHorizon.getTime()) > MS_PER_WEEK / 7

  return (
    <div className="pt-6">
      {/* Horizon header */}
      <div className="nx-glass p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="nx-label mb-1">Finish-line horizon</div>
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-medium text-[var(--nx-ink)]">{fmtDate(horizon)}</span>
              {moved && (
                <span className="text-[12px] text-[var(--nx-muted)]">was {fmtDate(eng.baselineHorizon)}</span>
              )}
            </div>
          </div>
          <button type="button" className="nx-btn nx-btn-ghost !py-1.5 !px-2.5 text-[12px]" onClick={onStartOver}>
            <RotateCcw size={13} /> Start over
          </button>
        </div>
        {eng.brief?.outcome && (
          <p className="text-[12px] text-[var(--nx-muted)] mt-2.5 leading-relaxed">
            {eng.brief.outcome}
            {eng.brief.metric ? ` · ${eng.brief.metric}` : ''}
          </p>
        )}
        {/* simToday controls — advance time to watch the horizon move (no real waiting). */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--nx-line)]">
          <span className="text-[11px] text-[var(--nx-faint)] flex items-center gap-1">
            <Calendar size={12} /> Today: {fmtDate(eng.simToday)}
          </span>
          <button type="button" className="nx-btn nx-btn-ghost !py-1 !px-2 text-[11px]" onClick={() => onAdvance(1)}>
            +1 week
          </button>
          <button type="button" className="nx-btn nx-btn-ghost !py-1 !px-2 text-[11px]" onClick={() => onAdvance(4)}>
            +4 weeks
          </button>
        </div>
      </div>

      {/* Milestones */}
      <div className="flex flex-col gap-2.5">
        {eng.milestones.map((m, i) => (
          <MilestoneCard
            key={m.id}
            m={m}
            index={i}
            open={expandedId === m.id}
            busy={busy}
            onToggle={() => onToggleMilestone(m)}
            onToggleTask={onToggleTask}
            onBreakDown={onBreakDown}
            onComplete={onComplete}
          />
        ))}
      </div>

      <ErrorBanner message={error} />
    </div>
  )
}

function MilestoneCard({ m, index, open, busy, onToggle, onToggleTask, onBreakDown, onComplete }) {
  const done = m.status === 'complete'
  const start = done ? m.actualStart : m.plannedStart
  const end = done ? m.actualEnd : m.plannedEnd
  const plannedWeeks = m.plannedStart && m.plannedEnd ? Math.max(1, Math.round(weeksBetween(m.plannedStart, m.plannedEnd))) : 1
  const [weeks, setWeeks] = useState(plannedWeeks)

  return (
    <div className="nx-glass overflow-hidden">
      {/* header row */}
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <span
          className={`shrink-0 w-2 h-2 rounded-full ${done ? 'bg-[var(--nx-ink)]' : 'bg-[var(--nx-line-strong)]'}`}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--nx-faint)] font-mono">M{index + 1}</span>
            <span className={`text-[14px] font-medium truncate ${done ? 'text-[var(--nx-muted)] line-through' : 'text-[var(--nx-ink)]'}`}>
              {m.title}
            </span>
          </div>
          <div className="text-[11px] text-[var(--nx-muted)] mt-0.5">
            {m.effortHours}h · {fmtDate(start)} → {fmtDate(end)}
          </div>
        </div>
        {open ? <ChevronDown size={16} className="text-[var(--nx-muted)]" /> : <ChevronRight size={16} className="text-[var(--nx-muted)]" />}
      </button>

      {/* body */}
      {open && (
        <div className="px-4 pb-4 border-t border-[var(--nx-line)]">
          {m.summary && <p className="text-[12px] text-[var(--nx-muted)] py-3 leading-relaxed">{m.summary}</p>}

          {m.tasks == null ? (
            <div className="flex items-center gap-2 text-[12px] text-[var(--nx-muted)] py-3">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <ListChecks size={13} />}
              {busy ? 'Breaking it into tasks…' : 'Open to load tasks.'}
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              {m.tasks.map((t) => (
                <TaskRow key={t.id} t={t} busy={busy} onToggle={() => onToggleTask(m.id, t.id)} onBreakDown={() => onBreakDown(m, t)} />
              ))}
            </div>
          )}

          {!done && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--nx-line)]">
              <span className="text-[11px] text-[var(--nx-faint)]">Took</span>
              <input
                className="nx-field !w-14 !py-1 text-center"
                type="number"
                min={1}
                value={weeks}
                onChange={(e) => setWeeks(Math.max(1, Number(e.target.value)))}
              />
              <span className="text-[11px] text-[var(--nx-faint)]">weeks</span>
              <button type="button" className="nx-btn nx-btn-primary !py-1.5 !px-3 text-[12px] ml-auto" onClick={() => onComplete(m, weeks)}>
                <Check size={14} /> Mark complete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskRow({ t, busy, onToggle, onBreakDown }) {
  return (
    <div className="rounded-[var(--nx-radius-sm)] border border-[var(--nx-line)] bg-[var(--nx-field)] px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={onToggle}
          className={`shrink-0 mt-0.5 w-4 h-4 rounded-[5px] border flex items-center justify-center ${
            t.done ? 'bg-[var(--nx-ink)] border-[var(--nx-ink)]' : 'border-[var(--nx-line-strong)]'
          }`}
          aria-label={t.done ? 'Mark task not done' : 'Mark task done'}
        >
          {t.done && <Check size={11} className="text-[#f4f3ef]" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-medium ${t.done ? 'text-[var(--nx-muted)] line-through' : 'text-[var(--nx-ink)]'}`}>
            {t.title} <span className="text-[11px] text-[var(--nx-faint)] font-normal">· {t.effortHours}h</span>
          </div>
          <div className="text-[11px] text-[var(--nx-muted)] mt-1 leading-relaxed">
            <span className="text-[var(--nx-faint)]">First action:</span> {t.firstAction}
          </div>
          <div className="text-[11px] text-[var(--nx-muted)] mt-0.5 leading-relaxed">
            <span className="text-[var(--nx-faint)]">Done when:</span> {t.doneCriterion}
          </div>

          {t.steps && (
            <ol className="mt-2 flex flex-col gap-1.5">
              {t.steps.map((s, i) => (
                <li key={i} className="text-[11px] text-[var(--nx-ink-soft)] flex gap-2">
                  <span className="text-[var(--nx-faint)] font-mono">{i + 1}</span>
                  <span>
                    {s.text}
                    {s.why && <span className="text-[var(--nx-muted)]"> — {s.why}</span>}
                    {s.source && <span className="text-[var(--nx-faint)]"> ({s.source})</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {t.steps == null && (
            <button
              type="button"
              className="mt-2 text-[11px] text-[var(--nx-ink-soft)] underline underline-offset-2 disabled:opacity-40"
              onClick={onBreakDown}
              disabled={busy}
            >
              Break it down
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
