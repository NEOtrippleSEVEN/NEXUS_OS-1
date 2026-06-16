// pacing.js — pure dating + velocity math (CLAUDE.md rules 1 & 2).
//
// No LLM ever does date math; all dates are computed here. This module is
// pure: no fetch, no storage, no React, and "today" is ALWAYS passed in
// (never read from new Date() inside), so the unit tests are deterministic.
//
// Tested in pacing.test.js (the five Chunk-3 spec cases).

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

// Strength of the "planned pace" prior in effVelocity(), measured in weeks of
// pseudo-observations. A higher number makes the velocity slower to react to
// any single completion.
const PRIOR_WEEKS = 2

export const addWeeks = (date, weeks) => new Date(date.getTime() + weeks * MS_PER_WEEK)
export const weeksBetween = (a, b) => (b.getTime() - a.getTime()) / MS_PER_WEEK

// Observed pace blended with the planned pace as a prior, so a single slow (or
// fast) milestone nudges the horizon instead of whipping it around. With an
// empty log this returns exactly plannedHPW.
//
//   log entries: { estHours, actualWeeks }
export function effVelocity(plannedHPW, log) {
  // Floor a 0 / NaN / negative planned pace to 1, so velocity can never be 0 or
  // NaN — otherwise reDate would divide effort by it and emit Invalid Dates.
  const planned = Number.isFinite(plannedHPW) && plannedHPW > 0 ? plannedHPW : 1
  let hours = PRIOR_WEEKS * planned // pseudo-observations from the plan
  let weeks = PRIOR_WEEKS
  for (const e of log) {
    hours += e.estHours // the work that was estimated...
    weeks += e.actualWeeks // ...over the calendar weeks it really took
  }
  return hours / weeks // effective hours delivered per week
}

// Lay non-complete milestones end-to-end from `fromDate` at `velocity` h/wk.
// Completed milestones keep their real (actual) dates and push the cursor.
export function reDate(milestones, fromDate, velocity) {
  let cursor = fromDate
  return milestones.map((m) => {
    if (m.status === 'complete' && m.actualStart && m.actualEnd) {
      if (m.actualEnd > cursor) cursor = m.actualEnd
      return m
    }
    const weeks = m.effortHours / velocity
    const plannedStart = cursor
    const plannedEnd = addWeeks(cursor, weeks)
    cursor = plannedEnd
    return { ...m, plannedStart, plannedEnd }
  })
}

// The finish-line: the latest end date across all milestones.
export function horizonOf(milestones) {
  let last = null
  for (const m of milestones) {
    const end = m.status === 'complete' && m.actualEnd ? m.actualEnd : m.plannedEnd
    if (end && (!last || end > last)) last = end
  }
  return last
}

// Convenience: compute the effective velocity from the log, then date the path.
export function applyDates(milestones, fromDate, plannedHPW, log) {
  return reDate(milestones, fromDate, effVelocity(plannedHPW, log))
}

export { MS_PER_WEEK }
