// Everything the automated demo walkthrough depends on. The shot list lives in
// .agent/DEMO_VIDEO.md; keep the captions and timings here in step with it.
import { existsSync } from 'node:fs'
import path from 'node:path'
import { MOORGATE_ID } from '../../lib/content/demo-data'

// Loads variables from .env.local without printing them (same as scripts/seed.ts).
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

/** The deployment the demo records. Defaults to production. */
export const baseUrl = (
  process.env.DEMO_BASE_URL ?? 'https://club-launch-kappa.vercel.app'
).replace(/\/$/, '')

export const url = (pathname: string) => `${baseUrl}${pathname}`

export const demoDir = '.demo'
export const authFile = path.join(demoDir, 'auth.json')
export const createdFile = path.join(demoDir, 'created.json')
export const rawDir = path.join(demoDir, 'raw')
export const outDir = path.join(demoDir, 'out')
export const rawVideo = path.join(outDir, 'club-launch-demo.webm')
export const mp4 = path.join(outDir, 'club-launch-demo.mp4')
export const scenesFile = path.join(outDir, 'scenes.json')
export const srtFile = path.join(outDir, 'captions.srt')

/** The open club the visitor journey is recorded on. */
export const openClub = { slug: 'linden-mayfair', name: 'Linden Mayfair' }

/**
 * The club with facts but no page, drafted live in scene 6. Its page (draft and
 * published) is demo content, so `demo:reset` removes it again.
 */
export const draftedClub = { id: MOORGATE_ID, slug: 'linden-moorgate', name: 'Linden Moorgate' }

export const clubPath = (slug: string) => `/uk/clubs/${slug}`

/** Fixed demo input, so every take is identical. */
export const script = {
  conciergeMessage: 'I work from home, want to train at lunch, and my back’s been stiff lately.',
  chip: 'I work from home',
  visitor: { name: 'Demo Visitor', email: 'demo@example.com', timeSlot: 'morning' as const },
  brief:
    'Moorgate conversion, opening next spring. Lead with co-working and recovery. Calm, premium tone.',
  tone: 'premium',
  faqQuestion: 'Can I bring a guest at the weekend?',
}

/** GitHub Actions page for scene 8. Empty or DEMO_SKIP_ACTIONS=1 skips the shot. */
export const actionsUrl =
  process.env.DEMO_SKIP_ACTIONS === '1'
    ? ''
    : (process.env.DEMO_ACTIONS_URL ?? 'https://github.com/huchu19/club-launch/actions')

export const admin = {
  user: process.env.ADMIN_USER ?? '',
  password: process.env.ADMIN_PASSWORD ?? '',
}

/** Human pacing. */
export const pace = {
  /** Per-key delay while typing. */
  keyDelay: 42,
  /** Mouse steps between two points, so the injected cursor glides. */
  mouseSteps: 25,
  /** How long a key result stays on screen before moving on. */
  read: 1_800,
  /** Budget for one real AI call (concierge, drafter, FAQ). */
  aiTimeout: 30_000,
  /** Budget for the Studio to load and for a publish to go through. */
  studioTimeout: 45_000,
  /** How long to keep reloading while waiting for published content to go live. */
  revalidate: 45_000,
}

export type Scene = {
  id: number
  /** Scene end in the finished cut, in milliseconds (from the shot list). */
  until: number
  caption: string
}

/** The shot list: one caption per scene, shown for the whole scene. */
export const scenes: Scene[] = [
  {
    id: 1,
    until: 8_000,
    caption:
      'Club Launch: a platform for launching social wellness club pages. Built by Huchu for the Web Engineer role.',
  },
  {
    id: 2,
    until: 22_000,
    caption: 'Explore the club: what’s on now, how busy it usually is, add a space to your day.',
  },
  {
    id: 3,
    until: 45_000,
    caption:
      'AI concierge plans a first day from real spaces, hours and timetable. Every stop is validated. Health mentions get a caveat, never advice.',
  },
  {
    id: 4,
    until: 55_000,
    caption: 'The tour lead carries the plan, so the guide knows what this visitor cares about.',
  },
  { id: 5, until: 65_000, caption: 'Premium price, reframed as cost per visit.' },
  {
    id: 6,
    until: 95_000,
    caption:
      'For editors: AI drafts a page from one line. Unknown facts become placeholders, and publishing is blocked until they’re filled. Then it’s live in seconds, no redeploy.',
  },
  {
    id: 7,
    until: 110_000,
    caption:
      'Ask anything. Answers come only from this club’s facts, and stay private until an editor approves them.',
  },
  {
    id: 8,
    until: 120_000,
    caption:
      'Every change is tested in CI before release. Next.js · TypeScript · Storybook · Sanity · Playwright',
  },
]

/** DEMO_SCENES=3,6 records a subset, for iterating on one shot. */
export function selectedScenes(): number[] {
  const only = process.env.DEMO_SCENES?.trim()
  if (!only) return scenes.map((s) => s.id)
  return only
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((id) => scenes.some((scene) => scene.id === id))
}

/**
 * The value an editor would type over a placeholder the drafter left behind.
 * `[[CHECK: 40]]` keeps the number the model wrote, which is what confirming
 * the fact looks like; everything else is a confirmed demo figure.
 */
export function placeholderValue(kind: string, label: string): string {
  const what = label.toLowerCase()
  switch (kind) {
    case 'PRICE':
      if (what.includes('joining')) return '150'
      if (what.includes('founding')) return '175'
      if (what.includes('off-peak') || what.includes('off peak')) return '165'
      return '199'
    case 'DATE':
      return 'March 2027'
    case 'TIME':
      return '07:00'
    case 'NUMBER':
      return '12'
    case 'CHECK':
      return label
    default:
      return label
  }
}

/** Used when a rate plan or founding offer has no usable joining fee. */
export const demoJoiningFee = '150'
