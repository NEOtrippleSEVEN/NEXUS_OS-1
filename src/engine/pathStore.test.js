import { describe, it, expect, beforeEach } from 'vitest'
import { load, save, clear } from './pathStore.js'

const KEY = 'nexus.path.v1'

// Minimal in-memory localStorage so these run in the plain Node test env.
beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  }
})

describe('pathStore', () => {
  it('returns null when nothing is stored', () => {
    expect(load()).toBe(null)
  })

  it('round-trips an engine and revives every date field back into real Dates', () => {
    const eng = {
      phase: 'path',
      constraints: { hoursPerWeek: 12, targetDate: 'September' },
      simToday: new Date('2026-06-16T00:00:00'),
      baselineHorizon: new Date('2026-08-01T00:00:00'),
      milestones: [
        { id: 'm0', status: 'complete', actualStart: new Date('2026-06-16T00:00:00'), actualEnd: new Date('2026-06-30T00:00:00') },
        { id: 'm1', status: 'pending', plannedStart: new Date('2026-06-30T00:00:00'), plannedEnd: new Date('2026-07-14T00:00:00') },
      ],
    }
    save(eng)

    // The trap: what is physically stored is a STRING, not a Date.
    const rawSimToday = JSON.parse(localStorage.getItem(KEY)).simToday
    expect(typeof rawSimToday).toBe('string')

    // ...but load() hands back real Date objects, at the same instants.
    const back = load()
    expect(back.simToday).toBeInstanceOf(Date)
    expect(back.baselineHorizon).toBeInstanceOf(Date)
    expect(back.simToday.getTime()).toBe(eng.simToday.getTime())
    expect(back.milestones[0].actualEnd).toBeInstanceOf(Date)
    expect(back.milestones[0].actualEnd.getTime()).toBe(eng.milestones[0].actualEnd.getTime())
    expect(back.milestones[1].plannedStart).toBeInstanceOf(Date)

    // constraints.targetDate is free text the founder typed — left a plain string.
    expect(back.constraints.targetDate).toBe('September')
    // a milestone with no actual dates yet keeps them absent, not Invalid Date.
    expect(back.milestones[1].actualEnd).toBeUndefined()
  })

  it('clear() removes the stored path', () => {
    save({ milestones: [] })
    expect(load()).not.toBe(null)
    clear()
    expect(load()).toBe(null)
  })

  it('returns null (starts fresh) when stored data is corrupt', () => {
    localStorage.setItem(KEY, '{ not valid json')
    expect(load()).toBe(null)
  })
})
