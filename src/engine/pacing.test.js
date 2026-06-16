import { describe, it, expect } from 'vitest'
import { effVelocity, reDate, horizonOf, addWeeks, weeksBetween } from './pacing.js'

// A fixed "today" — pacing.js must never read the clock itself, so passing a
// frozen date in keeps every test deterministic. Differences use pure
// millisecond math, so there are no timezone/DST surprises.
const FROM = new Date('2026-01-05T00:00:00')
const pending = (m) => ({ status: 'pending', ...m })

describe('effVelocity', () => {
  // Spec test 2
  it('returns the planned pace exactly when the completion log is empty', () => {
    expect(effVelocity(10, [])).toBe(10)
    expect(effVelocity(12, [])).toBe(12)
  })

  // Spec test 3 — the honesty mechanism: one slow result nudges, it doesn't whip.
  it('damps a slow completion toward the planned prior, not down to raw observed', () => {
    // est 20h at 10h/wk = 2 planned weeks; took 2x = 4 actual weeks
    const v = effVelocity(10, [{ estHours: 20, actualWeeks: 4 }])
    const rawObserved = 20 / 4 // 5 h/wk
    expect(v).toBeLessThan(10) // velocity dropped...
    expect(v).toBeGreaterThan(rawObserved) // ...but the prior held it above raw observed
    expect(v).toBeCloseTo(6.667, 2) // (2*10 + 20) / (2 + 4)
  })

  // Finding #1 — a 0 / blank / non-numeric hours-per-week must not poison the
  // path. Without a floor, velocity 0 → reDate divides by zero → Invalid Dates.
  it('floors a non-positive or non-finite planned pace to 1', () => {
    expect(effVelocity(0, [])).toBe(1)
    expect(effVelocity(NaN, [])).toBe(1)
    expect(effVelocity(-5, [])).toBe(1)
  })
})

describe('reDate', () => {
  // Spec test 1
  it('lays milestones end-to-end: 10h + 20h at 10h/wk ends exactly 3 weeks out', () => {
    const dated = reDate([pending({ effortHours: 10 }), pending({ effortHours: 20 })], FROM, effVelocity(10, []))
    expect(weeksBetween(FROM, dated[0].plannedEnd)).toBe(1)
    expect(weeksBetween(dated[0].plannedEnd, dated[1].plannedEnd)).toBe(2)
    expect(weeksBetween(FROM, horizonOf(dated))).toBe(3)
  })

  // Spec test 5
  it('keeps completed milestones on their actual dates through a reDate', () => {
    const aStart = new Date('2026-02-01T00:00:00')
    const aEnd = new Date('2026-02-15T00:00:00')
    const done = { status: 'complete', effortHours: 10, actualStart: aStart, actualEnd: aEnd }
    const dated = reDate([done, pending({ effortHours: 20 })], FROM, 10)
    expect(dated[0].actualStart).toBe(aStart) // untouched
    expect(dated[0].actualEnd).toBe(aEnd)
    expect(dated[0].plannedEnd).toBeUndefined()
    // the next pending milestone picks up from the completed one's real end date
    expect(dated[1].plannedStart.getTime()).toBe(aEnd.getTime())
  })
})

describe('horizon movement', () => {
  // Spec test 4
  it('moves the horizon later after a slow milestone and earlier after a fast one', () => {
    const baseline = horizonOf(
      reDate([pending({ effortHours: 10 }), pending({ effortHours: 20 })], FROM, effVelocity(10, [])),
    )

    // slow: milestone 1 took 3 weeks (planned 1) → velocity drops → horizon slides out
    const slowDone = { status: 'complete', effortHours: 10, actualStart: FROM, actualEnd: addWeeks(FROM, 3) }
    const slow = horizonOf(
      reDate([slowDone, pending({ effortHours: 20 })], FROM, effVelocity(10, [{ estHours: 10, actualWeeks: 3 }])),
    )
    expect(slow.getTime()).toBeGreaterThan(baseline.getTime())

    // fast: milestone 1 took half a week → velocity rises → horizon pulls in
    const fastDone = { status: 'complete', effortHours: 10, actualStart: FROM, actualEnd: addWeeks(FROM, 0.5) }
    const fast = horizonOf(
      reDate([fastDone, pending({ effortHours: 20 })], FROM, effVelocity(10, [{ estHours: 10, actualWeeks: 0.5 }])),
    )
    expect(fast.getTime()).toBeLessThan(baseline.getTime())
  })
})
