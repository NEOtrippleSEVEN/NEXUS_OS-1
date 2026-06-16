// pathStore.js — persistence (CLAUDE.md rule 3). UI/PathEngine never touch
// localStorage directly; it all goes through here.
//
// The trap this module exists to handle: JSON has no Date type. Everything
// written with JSON.stringify comes back as a STRING, and pacing math on a
// string silently produces garbage. So load() revives every date field back
// into a real Date via reviveEng().
//
// Versioning: stored under nexus.path.v1. If the engine shape ever changes,
// bump the key (v2) rather than migrate — V0 data is disposable, founder time
// is not.

const KEY = 'nexus.path.v1'

// null/undefined pass straight through; a stored ISO string becomes a Date.
const reviveDate = (v) => (v ? new Date(v) : v)

// Turn a parsed (all-strings-for-dates) engine object back into one whose date
// fields are real Date objects again. The date fields are: simToday,
// baselineHorizon, and each milestone's plannedStart / plannedEnd /
// actualStart / actualEnd. (constraints.targetDate stays a plain string — it is
// free-text the founder typed, not a computed Date.)
function reviveEng(eng) {
  if (!eng || typeof eng !== 'object') return null
  return {
    ...eng,
    simToday: reviveDate(eng.simToday),
    baselineHorizon: reviveDate(eng.baselineHorizon),
    milestones: (eng.milestones ?? []).map((m) => ({
      ...m,
      plannedStart: reviveDate(m.plannedStart),
      plannedEnd: reviveDate(m.plannedEnd),
      actualStart: reviveDate(m.actualStart),
      actualEnd: reviveDate(m.actualEnd),
    })),
  }
}

// Returns the revived engine object, or null if there is nothing stored / the
// stored data is unreadable (in which case the caller starts fresh).
export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return reviveEng(JSON.parse(raw))
  } catch {
    return null
  }
}

export function save(eng) {
  try {
    localStorage.setItem(KEY, JSON.stringify(eng))
  } catch {
    // Quota exceeded, private mode, or no localStorage — persistence is a
    // nicety, not a requirement; losing it must never break the session.
  }
}

export function clear() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
