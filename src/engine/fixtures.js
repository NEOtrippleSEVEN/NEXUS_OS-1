// fixtures.js — mock data for claudeClient's MOCK mode (Chunk 2).
//
// Nothing here carries a DATE. Milestones and tasks emit effort-HOURS only;
// pacing.js computes every date (CLAUDE.md rule 1). If you ever find a date
// field in this file, that is the bug.

// The sharpening interview script. A sharp mission gets a couple of questions;
// a vague one ("get fit") gets drilled harder before the engine is satisfied.
export const SHARP_QUESTIONS = [
  "What's the single number that means you've won — and the date you'd hold yourself to?",
  'Where are you starting from today, and what do you already have that helps (skills, audience, money, code)?',
]

export const VAGUE_QUESTIONS = [
  '“Get fit” is a wish, not a goal yet — what does fit look like as a number you’d be proud of (a weight, a race time, a lift, a body-fat %)?',
  'By when, exactly? Give me a date you would actually train toward.',
  'Where are you starting from today — current weight, how many days a week you train now, any injuries?',
  'How many hours a week can you really give this, around everything else?',
]

// The brief the engine hands to generatePath once the goal is sharp enough.
export const BRIEF = {
  outcome: 'Nexus OS V0 is the tool I open every morning to run my week',
  metric: '5 straight days planned and re-dated in Nexus instead of a notes app',
  deadline: '6 weeks out',
  startingLine: 'Offline prototype builds; full loop not yet wired end-to-end',
  hoursPerWeek: 12,
  assets: 'Strong C/Python (42), this codebase, some Claude API experience',
  constraints: '42 school workload; no API budget yet',
  firstWin: 'The whole loop runs on fixtures with zero API',
}

// The "Ship Nexus OS V0" path. Five milestones, honest effort-hours, no dates.
export const PATH = [
  { title: 'Offline core runs', summary: 'Full loop on fixtures: intake → path → tasks → re-date, zero API.', effortHours: 14 },
  { title: 'Your real week loaded', summary: 'Hand-edit fixtures to your actual 42 + Nexus week and live it for five days.', effortHours: 10 },
  { title: 'It remembers', summary: 'pathStore persists; refresh resumes mid-path with the horizon intact.', effortHours: 12 },
  { title: 'Live generation', summary: 'Flip MOCK off behind the proxy and generate your real mission for real.', effortHours: 8 },
  { title: 'Daily-usable V0', summary: 'Rough edges sanded; you reach for Nexus before anything else.', effortHours: 16 },
]

// Tasks for a milestone. The first milestone has the real four; any other
// milestone gets a plausible generic set. All session-sized, with a concrete
// first action and a verifiable doneCriterion (CLAUDE.md rule 4).
export const TASKS_BY_TITLE = {
  'Offline core runs': [
    { title: 'Mock the sharpening interview', firstAction: 'In claudeClient MOCK mode, script 2–3 canned questions then a ready brief', doneCriterion: 'Typing a mission and answering shows the questions, then a path renders', effortHours: 3 },
    { title: 'Fixture the five-milestone path', firstAction: 'Write PATH with effort-hours only — no dates', doneCriterion: 'Generate renders 5 milestones with engine-computed dates', effortHours: 2 },
    { title: 'Wire expand + break-down', firstAction: 'Return fixture tasks on expand and 3 micro-steps on break-down', doneCriterion: 'A milestone opens to tasks; a task breaks into steps', effortHours: 3 },
    { title: 'Walk it to mission-complete', firstAction: "Complete each milestone with a 'took N weeks' value and watch the horizon move", doneCriterion: "You reach the last milestone and the horizon shows a 'was' date", effortHours: 2 },
  ],
}

export const GENERIC_TASKS = [
  { title: 'Define what done looks like', firstAction: 'Write the one observable check that proves this milestone is finished', doneCriterion: 'A single pass/fail sentence exists for the milestone', effortHours: 2 },
  { title: 'Do the hardest block first', firstAction: 'Spend one focused session on the biggest unknown in this milestone', doneCriterion: 'The unknown is resolved, or clearly scoped into next steps', effortHours: 3 },
  { title: 'Close the loop', firstAction: 'Wire the piece into the rest of the app and use it once for real', doneCriterion: 'You used the new behavior end-to-end without editing code mid-way', effortHours: 3 },
]

// Three micro-steps for a break-down. One carries a why + source.
export const STEPS = [
  { text: 'Open the file and find the spot the task names as its first action' },
  { text: 'Make the smallest change that could possibly work, then run it once', why: 'Small steps keep the feedback loop tight and the diff readable', source: 'CLAUDE.md rule 6' },
  { text: 'Check the doneCriterion is now observably true before moving on' },
]
